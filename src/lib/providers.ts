/**
 * AI Provider Abstraction Layer
 *
 * Supports multiple AI CLI tools for task execution:
 * - Claude Code (claude CLI)
 * - Gemini CLI (gemini CLI)
 * - Cursor Agent (agent CLI)
 */

import { execa, ExecaError } from 'execa';
import { logger } from './logger.js';

// ============================================================================
// Types
// ============================================================================

export type AIProvider = 'claude' | 'gemini' | 'cursor' | 'codex';

export interface ProviderResult {
  success: boolean;
  output: string;
  error?: string;
  tokensUsed?: number;
  duration: number;
  summary?: string;
  toolsUsed?: Record<string, number>;
}

export interface ProviderOptions {
  projectRoot: string;
  dryRun?: boolean;
  timeout?: number;  // ms, default 30 minutes
  tokenLimit?: number;
}

export interface ClaudeOptions extends ProviderOptions {
  model?: 'opus' | 'sonnet' | 'haiku';
}

export interface CodexOptions extends ProviderOptions {
  model?: string;
}

export interface GeminiOptions extends ProviderOptions {
  model?: 'pro' | 'flash';
}

export interface CursorOptions extends ProviderOptions {
  model?: string;
  mode?: 'plan' | 'ask';
}

// ============================================================================
// Provider Configuration
// ============================================================================

interface ProviderConfig {
  command: string;
  buildArgs: (prompt: string, options: ProviderOptions & Record<string, unknown>) => string[];
  parseEvent: (line: string, state: StreamState) => void;
  displayName: string;
  getModelDisplay: (options: Record<string, unknown>) => string;
}

interface StreamState {
  toolCounts: Record<string, number>;
  lastTextResponse: string;
  lineCount: number;
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  claude: {
    command: 'claude',
    displayName: 'Claude Code',
    getModelDisplay: (opts) => (opts.model as string) || 'sonnet',
    buildArgs: (prompt, options) => [
      '--print',
      '--verbose',
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions',
      '--model', (options.model as string) || 'sonnet',
      '--max-turns', '50',
      prompt,
    ],
    parseEvent: (line, state) => {
      try {
        const event = JSON.parse(line);
        if (event.type === 'assistant' && event.message?.content) {
          for (const block of event.message.content) {
            if (block.type === 'tool_use') {
              state.toolCounts[block.name] = (state.toolCounts[block.name] || 0) + 1;
            } else if (block.type === 'text' && block.text) {
              state.lastTextResponse = block.text;
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    },
  },

  gemini: {
    command: 'gemini',
    displayName: 'Gemini CLI',
    getModelDisplay: (opts) => opts.model === 'flash' ? 'gemini-2.5-flash' : 'gemini-2.5-pro',
    buildArgs: (prompt, options) => [
      '-p', prompt,
      '-m', options.model === 'flash' ? 'gemini-2.5-flash' : 'gemini-2.5-pro',
      '--output-format', 'stream-json',
      '-y',  // YOLO mode - auto-accept actions
    ],
    parseEvent: (line, state) => {
      try {
        const event = JSON.parse(line);
        if (event.type === 'tool_call' || event.tool_name) {
          const toolName = event.tool_name || event.name || 'unknown';
          state.toolCounts[toolName] = (state.toolCounts[toolName] || 0) + 1;
        } else if (event.type === 'text' || event.text) {
          state.lastTextResponse = event.text || event.content || '';
        }
      } catch {
        if (line.trim()) {
          state.lastTextResponse = line;
        }
      }
    },
  },

  cursor: {
    command: 'agent',
    displayName: 'Cursor Agent',
    getModelDisplay: (opts) => (opts.model as string) || 'claude-3-5-sonnet',
    buildArgs: (prompt, options) => {
      const args = [
        '--print',
        '--output-format', 'stream-json',
        '-p', prompt,
      ];
      // Only add --mode if it's a valid cursor mode (plan or ask)
      const mode = options.mode as string | undefined;
      if (mode && (mode === 'plan' || mode === 'ask')) {
        args.push('--mode', mode);
      }
      return args;
    },
    parseEvent: (line, state) => {
      try {
        const event = JSON.parse(line);
        if (event.type === 'tool_use' || event.tool) {
          const toolName = event.tool || event.name || 'unknown';
          state.toolCounts[toolName] = (state.toolCounts[toolName] || 0) + 1;
        } else if (event.type === 'text' || event.content) {
          state.lastTextResponse = event.content || event.text || '';
        }
      } catch {
        if (line.trim()) {
          state.lastTextResponse = line;
        }
      }
    },
  },

  codex: {
    command: 'codex',
    displayName: 'OpenAI Codex',
    getModelDisplay: () => 'codex',
    buildArgs: (prompt) => [
      'exec',
      '--full-auto',
      prompt,
    ],
    parseEvent: (line, state) => {
      try {
        const event = JSON.parse(line);
        if (event.type === 'tool_use' || event.tool) {
          const toolName = event.tool || event.name || 'unknown';
          state.toolCounts[toolName] = (state.toolCounts[toolName] || 0) + 1;
        } else if (event.type === 'text' || event.content || event.message) {
          state.lastTextResponse = event.content || event.message || event.text || '';
        }
      } catch {
        if (line.trim()) {
          state.lastTextResponse = line;
        }
      }
    },
  },
};

// ============================================================================
// Shared Streaming Runner
// ============================================================================

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

interface RunnerContext {
  startTime: number;
  stdout: string;
  stderr: string;
  lastActivity: number;
  lastStatusLine: string;
  jsonBuffer: string;
  state: StreamState;
}

function createContext(): RunnerContext {
  return {
    startTime: Date.now(),
    stdout: '',
    stderr: '',
    lastActivity: Date.now(),
    lastStatusLine: '',
    jsonBuffer: '',
    state: {
      toolCounts: {},
      lastTextResponse: '',
      lineCount: 0,
    },
  };
}

function updateStatusLine(ctx: RunnerContext): void {
  const elapsed = formatElapsed(Date.now() - ctx.startTime);
  const tools = Object.entries(ctx.state.toolCounts)
    .map(([name, count]) => `${name}:${count}`)
    .join(' ');
  const status = `  [${elapsed}] ${ctx.state.lineCount} events | ${tools || 'starting...'}`;
  process.stdout.write('\r' + ' '.repeat(ctx.lastStatusLine.length) + '\r');
  process.stdout.write(status);
  ctx.lastStatusLine = status;
}

function clearStatusLine(ctx: RunnerContext): void {
  if (ctx.lastStatusLine) {
    process.stdout.write('\r' + ' '.repeat(ctx.lastStatusLine.length) + '\r');
  }
}

async function runStreamingCLI(
  provider: AIProvider,
  prompt: string,
  options: ProviderOptions & Record<string, unknown>
): Promise<ProviderResult> {
  const config = PROVIDER_CONFIGS[provider];
  const ctx = createContext();

  if (options.dryRun) {
    logger.info(`[DRY RUN] Would execute ${config.displayName}`);
    return { success: true, output: '[DRY RUN]', duration: 0 };
  }

  const args = config.buildArgs(prompt, options);
  const modelDisplay = config.getModelDisplay(options);

  logger.info(`Starting ${config.displayName} (${modelDisplay})...`);

  try {
    const subprocess = execa(config.command, args, {
      cwd: options.projectRoot,
      timeout: options.timeout || 30 * 60 * 1000,
      reject: false,
      stdin: 'ignore',
      buffer: false,
      env: { ...process.env, FORCE_COLOR: '0', ANTHROPIC_API_KEY: '' },
    });

    // Progress warning for inactivity
    const progressInterval = setInterval(() => {
      const sinceActivity = Date.now() - ctx.lastActivity;
      if (sinceActivity > 60000) {
        process.stdout.write(` ⚠️ No output for ${formatElapsed(sinceActivity)}`);
      }
    }, 30000);

    // Stream stdout
    if (subprocess.stdout) {
      subprocess.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        ctx.stdout += text;
        ctx.jsonBuffer += text;
        ctx.lastActivity = Date.now();

        const lines = ctx.jsonBuffer.split('\n');
        ctx.jsonBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          ctx.state.lineCount++;
          config.parseEvent(line, ctx.state);
        }

        updateStatusLine(ctx);
      });
    }

    // Stream stderr
    if (subprocess.stderr) {
      subprocess.stderr.on('data', (chunk: Buffer) => {
        ctx.stderr += chunk.toString();
        ctx.lastActivity = Date.now();
      });
    }

    const result = await subprocess;
    clearInterval(progressInterval);
    clearStatusLine(ctx);

    const duration = Math.round((Date.now() - ctx.startTime) / 1000);
    const toolSummary = Object.entries(ctx.state.toolCounts)
      .map(([name, count]) => `${name}:${count}`)
      .join(' ');

    logger.info(`${config.displayName} finished in ${formatElapsed(duration * 1000)} | ${toolSummary || 'no tools used'}`);

    if (result.exitCode !== 0) {
      return {
        success: false,
        output: ctx.stdout,
        error: ctx.stderr || `Exit code: ${result.exitCode}`,
        duration,
        summary: ctx.state.lastTextResponse,
        toolsUsed: ctx.state.toolCounts,
      };
    }

    return {
      success: true,
      output: ctx.stdout,
      duration,
      summary: ctx.state.lastTextResponse,
      toolsUsed: ctx.state.toolCounts,
    };
  } catch (error) {
    const duration = Math.round((Date.now() - ctx.startTime) / 1000);
    const execaError = error as ExecaError;
    logger.error(`${config.displayName} execution failed: ${execaError.message}`);
    return {
      success: false,
      output: execaError.stdout || '',
      error: execaError.message,
      duration,
    };
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Run Claude Code CLI
 */
export function runClaude(prompt: string, options: ClaudeOptions): Promise<ProviderResult> {
  return runStreamingCLI('claude', prompt, options as ProviderOptions & Record<string, unknown>);
}

/**
 * Run Gemini CLI
 */
export function runGemini(prompt: string, options: GeminiOptions): Promise<ProviderResult> {
  return runStreamingCLI('gemini', prompt, options as ProviderOptions & Record<string, unknown>);
}

/**
 * Run Cursor Agent CLI
 */
export function runCursor(prompt: string, options: CursorOptions): Promise<ProviderResult> {
  return runStreamingCLI('cursor', prompt, options as ProviderOptions & Record<string, unknown>);
}

/**
 * Run OpenAI Codex CLI
 */
export function runCodex(prompt: string, options: CodexOptions): Promise<ProviderResult> {
  return runStreamingCLI('codex', prompt, options as ProviderOptions & Record<string, unknown>);
}

/**
 * Unified provider runner - routes to the appropriate provider
 */
export async function runProvider(
  provider: AIProvider,
  prompt: string,
  options: ProviderOptions & {
    claudeModel?: 'opus' | 'sonnet' | 'haiku';
    geminiModel?: 'pro' | 'flash';
    cursorModel?: string;
    cursorMode?: 'plan' | 'ask';
    codexModel?: string;
  }
): Promise<ProviderResult> {
  switch (provider) {
    case 'claude':
      return runClaude(prompt, { ...options, model: options.claudeModel });
    case 'gemini':
      return runGemini(prompt, { ...options, model: options.geminiModel });
    case 'cursor':
      return runCursor(prompt, { ...options, model: options.cursorModel, mode: options.cursorMode });
    case 'codex':
      return runCodex(prompt, { ...options, model: options.codexModel });
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Check if a provider CLI is available
 */
export async function isProviderAvailable(provider: AIProvider): Promise<boolean> {
  const config = PROVIDER_CONFIGS[provider];
  try {
    await execa(config.command, ['--version'], {
      timeout: 5000,
      reject: true,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get display name for a provider
 */
export function getProviderDisplayName(provider: AIProvider): string {
  return PROVIDER_CONFIGS[provider].displayName;
}

// ============================================================================
// Provider Config Resolution (for PRD overrides)
// ============================================================================

import type { ProviderConfig as RalphProviderConfig } from './config.js';
import type { PrdFile, PrdItem, PrdProviderConfig } from './prd.js';

export interface ResolvedProviderConfig {
  provider: AIProvider;
  claudeModel: 'opus' | 'sonnet' | 'haiku';
  geminiModel: 'pro' | 'flash';
  cursorModel: string;
  cursorMode?: 'plan' | 'ask';
  codexModel: string;
}

/**
 * Resolve effective provider config from PRD and CLI settings
 * Priority: task-level > file-level > CLI-level
 */
export function resolveProviderConfig(
  cliConfig: RalphProviderConfig,
  prdFile: PrdFile,
  item: PrdItem
): ResolvedProviderConfig {
  let provider = cliConfig.taskProvider;
  let claudeModel = cliConfig.claudeModel;
  let geminiModel = cliConfig.geminiModel;
  let cursorModel = cliConfig.cursorModel;
  let cursorMode = cliConfig.cursorMode;
  let codexModel = cliConfig.codexModel;

  // File-level override
  const fileProvider = prdFile.metadata?.provider;
  if (fileProvider) {
    applyProviderOverride(fileProvider, {
      getProvider: () => provider,
      setProvider: (p) => { provider = p; },
      setClaudeModel: (m) => { claudeModel = m; },
      setGeminiModel: (m) => { geminiModel = m; },
      setCursorModel: (m) => { cursorModel = m; },
      setCursorMode: (m) => { cursorMode = m; },
    });
  }

  // Task-level override (highest priority)
  const taskProvider = item.provider;
  if (taskProvider) {
    applyProviderOverride(taskProvider, {
      getProvider: () => provider,
      setProvider: (p) => { provider = p; },
      setClaudeModel: (m) => { claudeModel = m; },
      setGeminiModel: (m) => { geminiModel = m; },
      setCursorModel: (m) => { cursorModel = m; },
      setCursorMode: (m) => { cursorMode = m; },
    });
  }

  return { provider, claudeModel, geminiModel, cursorModel, cursorMode, codexModel };
}

interface ProviderSetters {
  getProvider: () => AIProvider;
  setProvider: (p: AIProvider) => void;
  setClaudeModel: (m: 'opus' | 'sonnet' | 'haiku') => void;
  setGeminiModel: (m: 'pro' | 'flash') => void;
  setCursorModel: (m: string) => void;
  setCursorMode: (m: 'plan' | 'ask') => void;
}

function applyProviderOverride(override: PrdProviderConfig, setters: ProviderSetters): void {
  if (override.provider && isValidProvider(override.provider)) {
    setters.setProvider(override.provider);
  }

  const provider = setters.getProvider();

  if (override.model) {
    if (provider === 'claude' && isValidClaudeModel(override.model)) {
      setters.setClaudeModel(override.model);
    } else if (provider === 'gemini' && isValidGeminiModel(override.model)) {
      setters.setGeminiModel(override.model);
    } else if (provider === 'cursor') {
      setters.setCursorModel(override.model);
    }
  }

  if (override.mode && provider === 'cursor' && isValidCursorMode(override.mode)) {
    setters.setCursorMode(override.mode);
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

const VALID_PROVIDERS: AIProvider[] = ['claude', 'gemini', 'cursor', 'codex'];
const VALID_CLAUDE_MODELS = ['opus', 'sonnet', 'haiku'] as const;
const VALID_GEMINI_MODELS = ['pro', 'flash'] as const;
const VALID_CURSOR_MODES = ['plan', 'ask'] as const;

export function isValidProvider(value: string): value is AIProvider {
  return VALID_PROVIDERS.includes(value as AIProvider);
}

export function isValidClaudeModel(value: string): value is 'opus' | 'sonnet' | 'haiku' {
  return (VALID_CLAUDE_MODELS as readonly string[]).includes(value);
}

export function isValidGeminiModel(value: string): value is 'pro' | 'flash' {
  return (VALID_GEMINI_MODELS as readonly string[]).includes(value);
}

export function isValidCursorMode(value: string): value is 'plan' | 'ask' {
  return (VALID_CURSOR_MODES as readonly string[]).includes(value);
}
