# Configuration Reference

This document describes all configuration options for Ralph.

## Configuration Sources

Ralph reads configuration from multiple sources (highest to lowest priority):

1. **CLI arguments** - Command-line flags
2. **Environment variables** - `RALPH_*` prefixed variables
3. **PRD file metadata** - `metadata` section in PRD JSON
4. **PRD task config** - Per-task `provider` field
5. **Default config** - Built-in defaults

## CLI Arguments

### Basic Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-n, --iterations <count>` | number | 30 | Number of iterations to run |
| `--prd <path>` | string | - | Path to specific PRD file |
| `-v, --verbose` | boolean | false | Enable verbose output |
| `-q, --quiet` | boolean | false | Minimal output |
| `--dry-run` | boolean | false | Show what would run without executing |

### AI Provider Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--provider <name>` | string | claude | AI provider (claude, gemini, cursor) |
| `--model <model>` | string | opus | Claude model (opus, sonnet) |
| `--gemini-model <model>` | string | pro | Gemini model (pro, flash) |
| `--cursor-model <model>` | string | claude-3-5-sonnet | Cursor model name |
| `--cursor-mode <mode>` | string | agent | Cursor mode (agent, plan, ask) |
| `--validation-provider <name>` | string | - | Separate provider for validation |

### Validation Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--skip-validation` | boolean | false | Skip all validation gates |
| `--no-build-check` | boolean | false | Skip build validation |
| `--no-test-check` | boolean | false | Skip test validation |
| `--no-lint-check` | boolean | false | Skip lint validation |
| `--validation-timeout <ms>` | number | 120000 | Timeout per validation command |
| `--fail-fast` | boolean | false | Stop validation on first failure |

### Task Management Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--category <name>` | string | - | Filter tasks by category |
| `--priority <level>` | string | - | Filter tasks by priority |
| `--pop-tasks` | boolean | false | Remove tasks from PRD after completion |
| `--no-archive` | boolean | false | Don't archive popped tasks |
| `--no-commit` | boolean | false | Skip git commits |
| `--no-notify` | boolean | false | Disable Discord notifications |

### Hook Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--hooks` | boolean | false | Enable Claude Code hooks |
| `--no-hooks` | boolean | true | Disable all hooks (default) |
| `--hook-stop` | boolean | true* | Enable stop validation hook |
| `--hook-lint` | boolean | true* | Enable post-edit lint hook |
| `--hook-auto-approve` | boolean | true* | Enable auto-approve hook |
| `--max-continuations <n>` | number | 5 | Max forced continuations |

*Enabled by default when `--hooks` is set

## Environment Variables

```bash
# AI Provider
RALPH_PROVIDER=claude          # Default provider
RALPH_MODEL=opus               # Default model

# Paths
RALPH_PROJECT_ROOT=/path/to/project
RALPH_PRD_DIR=/path/to/prd
RALPH_SESSION_DIR=/path/to/sessions

# Notifications
RALPH_DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
RALPH_NOTIFY_ENABLED=true

# Hooks
RALPH_HOOKS_ENABLED=false
RALPH_MAX_CONTINUATIONS=5
RALPH_FORCE_STOP=false         # Emergency escape hatch
```

## RalphConfig Interface

The complete configuration interface:

```typescript
interface RalphConfig {
  // Paths
  projectRoot: string;
  scriptsDir: string;
  prdDir: string;
  prdFile: string;
  notifyScript: string;
  captureScript: string;
  uploadScript: string;
  sessionDir: string;
  learningsFile: string;

  // Limits
  maxIterations: number;
  opusTokenLimit: number;      // 150000
  sonnetTokenLimit: number;    // 50000

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
  consumeMode: boolean;
  archiveCompleted: boolean;

  // Filters
  filterCategory: string;
  filterPriority: string;

  // Model (legacy)
  model: 'opus' | 'sonnet';

  // Provider Configuration
  providerConfig: ProviderConfig;

  // Validation Gates
  validationGates: ValidationGatesConfig;
  validationTimeout: number;
  validationFailFast: boolean;

  // Hooks
  hooks: HooksConfig;
}
```

### ProviderConfig

```typescript
interface ProviderConfig {
  taskProvider: 'claude' | 'gemini' | 'cursor';
  validationProvider?: 'claude' | 'gemini' | 'cursor';
  claudeModel: 'opus' | 'sonnet';
  geminiModel: 'pro' | 'flash';
  cursorModel: string;
  cursorMode: 'agent' | 'plan' | 'ask';
}
```

### ValidationGatesConfig

```typescript
interface ValidationGatesConfig {
  oxlint: boolean;   // Fast Rust linter
  build: boolean;    // TypeScript compilation
  test: boolean;     // Unit tests
  lint: boolean;     // ESLint
  custom: boolean;   // Project-specific
}
```

### HooksConfig

```typescript
interface HooksConfig {
  enabled: boolean;
  stopValidation: boolean;
  postEditLint: boolean;
  autoApprove: boolean;
  maxContinuations: number;
}
```

## Default Configuration

```typescript
const defaultConfig: RalphConfig = {
  // Paths (relative to script location)
  projectRoot: resolve(__dirname, '../../../../'),
  scriptsDir: resolve(__dirname, '../../../'),
  prdDir: '',        // Set from projectRoot
  prdFile: '',
  sessionDir: '',    // Set from projectRoot
  learningsFile: '', // Set from projectRoot

  // Limits
  maxIterations: 100,
  opusTokenLimit: 150000,
  sonnetTokenLimit: 50000,

  // Flags
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
  archiveCompleted: true,

  // Filters
  filterCategory: '',
  filterPriority: '',

  // Model
  model: 'opus',

  // Provider
  providerConfig: {
    taskProvider: 'claude',
    validationProvider: undefined,
    claudeModel: 'opus',
    geminiModel: 'pro',
    cursorModel: 'claude-3-5-sonnet',
    cursorMode: 'agent',
  },

  // Validation
  validationGates: {
    oxlint: true,
    build: true,
    test: true,
    lint: true,
    custom: true,
  },
  validationTimeout: 120000,
  validationFailFast: false,

  // Hooks
  hooks: {
    enabled: false,
    stopValidation: true,
    postEditLint: true,
    autoApprove: true,
    maxContinuations: 5,
  },
};
```

## Validation Commands by Package

Each package has predefined validation commands:

### frontend
```bash
# oxlint
npx oxlint --config .oxlintrc.json src/

# build
npm run build

# test
npm test -- --run

# lint
npm run lint
```

### backend
```bash
# oxlint
npx oxlint --config .oxlintrc.json src/

# build
npm run build

# test
npm test -- --run

# lint
npm run lint
```

### electron
```bash
# oxlint
npx oxlint --config .oxlintrc.json src/

# build
npm run build:main

# test
npm test -- --run

# lint
npm run lint
```

### mobile
```bash
# build
npx tsc --noEmit

# test
npm test -- --run

# lint
npm run lint
```

### chrome-extension
```bash
# build
npm run build
```

## Path Resolution

Default paths are resolved relative to the project root:

```
{projectRoot}/
├── docs/
│   └── prd/              # PRD directory
├── .ralph/
│   ├── sessions/         # Session storage
│   └── LEARNINGS.md      # Accumulated knowledge
└── scripts/
    └── ralph/            # Ralph installation
        ├── hooks/        # Hook scripts
        └── ...
```

## Custom Configuration

### Via PRD Metadata

```json
{
  "metadata": {
    "version": "1.0",
    "provider": {
      "provider": "gemini",
      "model": "flash"
    }
  },
  "items": [...]
}
```

### Via Task Config

```json
{
  "items": [
    {
      "id": "complex-task",
      "description": "...",
      "provider": {
        "provider": "claude",
        "model": "opus"
      }
    }
  ]
}
```

### Configuration Priority

For provider selection:

1. Task-level `provider` field (highest)
2. File-level `metadata.provider`
3. CLI `--provider` flag
4. Default (claude)

## Examples

### High-Performance Configuration

```bash
ralph run 50 \
  --provider claude \
  --model opus \
  --hooks \
  --fail-fast \
  --validation-timeout 60000
```

### Cost-Optimized Configuration

```bash
ralph run 100 \
  --provider gemini \
  --gemini-model flash \
  --no-lint-check \
  --quiet
```

### Development Configuration

```bash
ralph once \
  --verbose \
  --dry-run \
  --skip-validation
```

### CI/CD Configuration

```bash
ralph run 10 \
  --prd docs/prd/release.json \
  --provider claude \
  --model sonnet \
  --no-notify \
  --pop-tasks
```
