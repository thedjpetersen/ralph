/**
 * Hook Manager - Generates and manages Claude Code hooks for RALPH
 *
 * Creates .claude/settings.local.json with hook configurations
 * that tie into the RALPH validation loop.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import type { HooksConfig } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to hooks scripts (relative to this file's compiled location)
const HOOKS_DIR = join(__dirname, '../../hooks');

export interface HookSetupOptions {
  projectRoot: string;
  hooksConfig: HooksConfig;
  targetPackage?: string;  // Package being validated (frontend, backend, etc.)
}

export interface ClaudeHooksSettings {
  hooks: {
    Stop?: Array<{ hooks: Array<{ type: string; command: string; timeout?: number }> }>;
    PostToolUse?: Array<{ matcher: string; hooks: Array<{ type: string; command: string; timeout?: number }> }>;
    PreToolUse?: Array<{ matcher: string; hooks: Array<{ type: string; command: string; timeout?: number }> }>;
  };
}

/**
 * Generate the hooks settings object based on config
 */
export function generateHooksSettings(options: HookSetupOptions): ClaudeHooksSettings {
  const { hooksConfig, targetPackage = 'frontend' } = options;
  const settings: ClaudeHooksSettings = { hooks: {} };

  if (!hooksConfig.enabled) {
    return settings;
  }

  // Stop hook - validation gate
  if (hooksConfig.stopValidation) {
    settings.hooks.Stop = [
      {
        hooks: [
          {
            type: 'command',
            command: `python3 "${join(HOOKS_DIR, 'validate-stop.py')}"`,
            timeout: 30,
          },
        ],
      },
    ];
  }

  // PostToolUse hook - instant lint after edits
  if (hooksConfig.postEditLint) {
    settings.hooks.PostToolUse = [
      {
        matcher: 'Edit|Write',
        hooks: [
          {
            type: 'command',
            command: `python3 "${join(HOOKS_DIR, 'post-edit-lint.py')}"`,
            timeout: 15,
          },
        ],
      },
    ];
  }

  // PreToolUse hook - auto-approve safe commands
  if (hooksConfig.autoApprove) {
    settings.hooks.PreToolUse = [
      {
        matcher: 'Bash',
        hooks: [
          {
            type: 'command',
            command: `python3 "${join(HOOKS_DIR, 'auto-approve.py')}"`,
            timeout: 5,
          },
        ],
      },
    ];
  }

  return settings;
}

/**
 * Setup hooks by creating .claude/settings.local.json
 * Returns path to the created settings file (for cleanup)
 */
export function setupHooks(options: HookSetupOptions): string | null {
  const { projectRoot, hooksConfig, targetPackage = 'frontend' } = options;

  if (!hooksConfig.enabled) {
    logger.debug('Hooks disabled, skipping setup');
    return null;
  }

  const claudeDir = join(projectRoot, '.claude');
  const settingsPath = join(claudeDir, 'settings.local.json');

  // Create .claude directory if it doesn't exist
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  // Read existing settings if any
  let existingSettings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try {
      existingSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    } catch {
      // Ignore parse errors, we'll overwrite
    }
  }

  // Generate hook settings
  const hookSettings = generateHooksSettings(options);

  // Merge with existing settings (hooks take precedence)
  const mergedSettings = {
    ...existingSettings,
    hooks: hookSettings.hooks,
    // Add RALPH marker so we know we created this
    _ralph_hooks: true,
  };

  // Write settings file
  writeFileSync(settingsPath, JSON.stringify(mergedSettings, null, 2));

  logger.info('Hooks enabled:');
  if (hooksConfig.stopValidation) {
    logger.info(`  • Stop validation (max ${hooksConfig.maxContinuations} continuations)`);
  }
  if (hooksConfig.postEditLint) {
    logger.info('  • Post-edit lint feedback');
  }
  if (hooksConfig.autoApprove) {
    logger.info('  • Auto-approve validation commands');
  }

  return settingsPath;
}

/**
 * Cleanup hooks by removing or restoring settings.local.json
 */
export function cleanupHooks(projectRoot: string): void {
  const settingsPath = join(projectRoot, '.claude', 'settings.local.json');

  if (!existsSync(settingsPath)) {
    return;
  }

  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    // Only remove if we created it
    if (settings._ralph_hooks) {
      // Remove our hooks but keep other settings
      delete settings.hooks;
      delete settings._ralph_hooks;

      if (Object.keys(settings).length === 0) {
        // File is empty, delete it
        unlinkSync(settingsPath);
        logger.debug('Removed .claude/settings.local.json');
      } else {
        // Keep other settings
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        logger.debug('Removed RALPH hooks from .claude/settings.local.json');
      }
    }
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Get environment variables for hook scripts
 */
export function getHookEnvironment(options: {
  targetPackage: string;
  maxContinuations: number;
  hooksConfig: HooksConfig;
}): Record<string, string> {
  return {
    RALPH_TARGET_PACKAGE: options.targetPackage,
    RALPH_MAX_CONTINUATIONS: String(options.maxContinuations),
    RALPH_HOOK_LINT: String(options.hooksConfig.postEditLint),
    RALPH_HOOK_AUTO_APPROVE: String(options.hooksConfig.autoApprove),
  };
}

/**
 * Check if hooks are properly installed
 */
export function verifyHooksInstallation(): { valid: boolean; missing: string[] } {
  const requiredFiles = [
    'validate-stop.py',
    'post-edit-lint.py',
    'auto-approve.py',
  ];

  const missing: string[] = [];

  for (const file of requiredFiles) {
    const filePath = join(HOOKS_DIR, file);
    if (!existsSync(filePath)) {
      missing.push(file);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
