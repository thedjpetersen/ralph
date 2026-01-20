import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Supported AI providers
export type AIProvider = 'claude' | 'gemini' | 'cursor';

export interface ProviderConfig {
  taskProvider: AIProvider;           // Provider for main task execution
  validationProvider?: AIProvider;    // Provider for validation (defaults to taskProvider)
  claudeModel: 'opus' | 'sonnet';     // Claude-specific model
  geminiModel: 'pro' | 'flash';       // Gemini-specific model
  cursorModel: string;                // Cursor model name
  cursorMode: 'agent' | 'plan' | 'ask';  // Cursor mode
}

export interface ValidationGatesConfig {
  oxlint: boolean;  // Fast Rust linter - runs first
  build: boolean;
  test: boolean;
  lint: boolean;    // ESLint - runs after oxlint
  custom: boolean;
}

export interface HooksConfig {
  enabled: boolean;           // Master toggle for all hooks
  stopValidation: boolean;    // Stop hook - prevents completion until validation passes
  postEditLint: boolean;      // PostToolUse hook - instant lint feedback after edits
  autoApprove: boolean;       // PreToolUse hook - auto-approve safe validation commands
  maxContinuations: number;   // Max times Stop hook can force continuation (prevents infinite loops)
}

export interface RalphConfig {
  // Paths
  projectRoot: string;
  scriptsDir: string;
  prdDir: string;
  prdFile: string; // Specific PRD file (overrides prdDir scanning)
  notifyScript: string;
  captureScript: string;
  uploadScript: string;
  sessionDir: string;    // .ralph/sessions
  learningsFile: string; // .ralph/LEARNINGS.md

  // Limits
  maxIterations: number;
  opusTokenLimit: number;
  sonnetTokenLimit: number;

  // Flags
  notifyEnabled: boolean;
  captureEnabled: boolean;
  captureVideo: boolean;
  captureTerminal: boolean;
  dryRun: boolean;
  verbose: boolean;
  quiet: boolean;
  noCommit: boolean;
  skipValidation: boolean;
  consumeMode: boolean;       // Remove tasks from PRD after completion (pop mode)
  archiveCompleted: boolean;  // Archive popped tasks to separate file

  // Filter
  filterCategory: string;
  filterPriority: string;

  // Model (legacy - use providerConfig instead)
  model: 'opus' | 'sonnet';

  // Provider configuration
  providerConfig: ProviderConfig;

  // Validation
  validationGates: ValidationGatesConfig;
  validationTimeout: number;  // ms per validation command
  validationFailFast: boolean;

  // Hooks
  hooks: HooksConfig;
}

export const defaultConfig: RalphConfig = {
  projectRoot: resolve(__dirname, '../../../../'),
  scriptsDir: resolve(__dirname, '../../../'),
  prdDir: '',
  prdFile: '',
  notifyScript: '',
  captureScript: '',
  uploadScript: '',
  sessionDir: '',
  learningsFile: '',

  maxIterations: 100,
  opusTokenLimit: 150000,
  sonnetTokenLimit: 50000,

  notifyEnabled: true,
  captureEnabled: false,
  captureVideo: false,
  captureTerminal: false,
  dryRun: false,
  verbose: false,
  quiet: false,
  noCommit: false,
  skipValidation: false,
  consumeMode: false,
  archiveCompleted: true,  // Archive by default when consuming

  filterCategory: '',
  filterPriority: '',

  model: 'opus',

  providerConfig: {
    taskProvider: 'claude',
    validationProvider: undefined,  // Defaults to taskProvider
    claudeModel: 'opus',
    geminiModel: 'pro',
    cursorModel: 'claude-3-5-sonnet',
    cursorMode: 'agent',
  },

  validationGates: {
    oxlint: true,   // Fast Rust linter - runs first
    build: true,
    test: true,
    lint: true,     // ESLint - runs after oxlint
    custom: true,
  },
  validationTimeout: 120000,  // 2 minutes
  validationFailFast: false,

  hooks: {
    enabled: false,           // Disabled by default, enable with --hooks
    stopValidation: true,     // Stop hook enabled when hooks are enabled
    postEditLint: true,       // Post-edit lint enabled when hooks are enabled
    autoApprove: true,        // Auto-approve enabled when hooks are enabled
    maxContinuations: 5,      // Max 5 forced continuations before allowing stop
  },
};

export function initConfig(overrides: Partial<RalphConfig> = {}): RalphConfig {
  const config = { ...defaultConfig, ...overrides };

  // Merge validation gates if provided
  if (overrides.validationGates) {
    config.validationGates = {
      ...defaultConfig.validationGates,
      ...overrides.validationGates,
    };
  }

  // Merge hooks config if provided
  if (overrides.hooks) {
    config.hooks = {
      ...defaultConfig.hooks,
      ...overrides.hooks,
    };
  }

  // Merge provider config if provided
  if (overrides.providerConfig) {
    config.providerConfig = {
      ...defaultConfig.providerConfig,
      ...overrides.providerConfig,
    };
  }

  // Sync legacy model field with providerConfig
  if (overrides.model && !overrides.providerConfig?.claudeModel) {
    config.providerConfig.claudeModel = overrides.model;
  }

  // Resolve paths
  config.prdDir = join(config.projectRoot, 'docs/prd');
  config.notifyScript = join(config.scriptsDir, 'notify.sh');
  config.captureScript = join(config.scriptsDir, 'capture.sh');
  config.uploadScript = join(config.scriptsDir, 'upload.sh');
  config.sessionDir = join(config.projectRoot, '.ralph/sessions');
  config.learningsFile = join(config.projectRoot, '.ralph/LEARNINGS.md');

  // Resolve prdFile path if provided
  if (config.prdFile && !config.prdFile.startsWith('/')) {
    config.prdFile = resolve(config.projectRoot, config.prdFile);
  }

  return config;
}

export function validateConfig(config: RalphConfig): string[] {
  const errors: string[] = [];

  if (!existsSync(config.projectRoot)) {
    errors.push(`Project root not found: ${config.projectRoot}`);
  }

  // If a specific PRD file is provided, check that instead of the directory
  if (config.prdFile) {
    if (!existsSync(config.prdFile)) {
      errors.push(`PRD file not found: ${config.prdFile}`);
    }
  } else if (!existsSync(config.prdDir)) {
    errors.push(`PRD directory not found: ${config.prdDir}`);
  }

  return errors;
}
