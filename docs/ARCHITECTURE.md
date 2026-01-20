# Ralph Architecture

This document describes the internal architecture of Ralph, the autonomous AI coding loop.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLI Layer                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │   run   │ │ status  │ │ resume  │ │  abort  │ │sessions │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
└───────┼──────────┼──────────┼──────────┼──────────┼─────────────┘
        │          │          │          │          │
┌───────▼──────────▼──────────▼──────────▼──────────▼─────────────┐
│                        Core Libraries                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │  providers  │ │  validation │ │   session   │                │
│  │  (AI CLIs)  │ │   (gates)   │ │ (persist)   │                │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘                │
│         │               │               │                        │
│  ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐                │
│  │    prd      │ │    judge    │ │  learnings  │                │
│  │  (tasks)    │ │  (review)   │ │ (knowledge) │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
└─────────────────────────────────────────────────────────────────┘
        │                   │                   │
┌───────▼───────────────────▼───────────────────▼─────────────────┐
│                      External Systems                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ Claude/     │ │    Git      │ │  Discord    │                │
│  │ Gemini/     │ │  Repository │ │  Webhooks   │                │
│  │ Cursor CLI  │ │             │ │             │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## Execution Flow

### Main Loop (`run.ts`)

```
┌──────────────────┐
│   Initialize     │
│   - Load config  │
│   - Create/resume│
│     session      │
│   - Setup hooks  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Get Next Task   │────►│  No more tasks?  │───► End
│  from PRD        │     │  Exit loop       │
└────────┬─────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐
│ Mark In Progress │
│ - Update PRD     │
│ - Track session  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Build Prompt    │
│  - Task desc     │
│  - Validation    │
│  - Prev errors   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Run Provider    │
│  - Claude/Gemini │
│  - Stream output │
│  - Track tools   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Check Complete  │────►│  Not complete?   │───► Continue
│  marker          │     │  Next iteration  │     (loop)
└────────┬─────────┘     └──────────────────┘
         │ Complete
         ▼
┌──────────────────┐
│  Run Validation  │
│  - oxlint        │
│  - build         │
│  - test          │
│  - lint          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ Validation Pass? │────►│  Failed?         │───► Store errors
│                  │     │  Retry next iter │     (loop)
└────────┬─────────┘     └──────────────────┘
         │ Pass
         ▼
┌──────────────────┐
│   Run Judges     │
│   (if configured)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Mark Complete   │
│  - Update PRD    │
│  - Git commit    │
│  - Pop task      │
│  - Notify        │
└────────┬─────────┘
         │
         ▼
      (loop)
```

## Core Components

### 1. Providers (`providers.ts`)

The provider system abstracts different AI CLI tools behind a common interface.

```typescript
// Provider configuration (data-driven)
const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  claude: {
    command: 'claude',
    buildArgs: (prompt, options) => [...],
    parseEvent: (line, state) => {...},
  },
  gemini: {...},
  cursor: {...},
};

// Shared streaming runner
async function runStreamingCLI(
  provider: AIProvider,
  prompt: string,
  options: ProviderOptions
): Promise<ProviderResult>
```

**Key features:**
- Data-driven configuration for each provider
- Single shared streaming implementation
- Type-safe validation helpers
- PRD-level provider resolution

### 2. Validation System (`validation/`)

```
validation/
├── validator.ts        # Orchestrator
├── gate-runner.ts      # Command execution
├── package-detector.ts # Git diff analysis
├── result-formatter.ts # Output formatting
└── validation.types.ts # Type definitions
```

**Flow:**
1. `package-detector` analyzes git diff to find affected packages
2. `validator` orchestrates gate execution per package
3. `gate-runner` executes individual commands with timeouts
4. `result-formatter` creates console/Discord output

**Gate order:**
1. `oxlint` - Fast Rust linter (catches obvious issues quickly)
2. `build` - TypeScript compilation
3. `test` - Unit tests
4. `lint` - Full ESLint

### 3. Session Management (`session.ts`)

```typescript
interface SessionState {
  sessionId: string;
  status: 'running' | 'completed' | 'crashed' | 'aborted';
  config: SessionConfig;
  currentTask?: TaskInfo;
  completedTasks: CompletedTask[];
  gitState: GitState;
  lastError?: ErrorInfo;
}
```

**Storage:**
```
.ralph/sessions/
├── index.json          # Session index
├── abc12345.json       # Session state
├── def67890.json
└── ...
```

**Lifecycle:**
```
running ──► completed
    │
    ├──► crashed (with error info)
    │
    └──► aborted (manual intervention)
```

### 4. PRD Management (`prd.ts`)

```typescript
interface PrdFile {
  filename: string;
  filepath: string;
  category: string;
  items: PrdItem[];
  metadata?: PrdMetadata;
}

interface PrdItem {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status?: 'pending' | 'in_progress' | 'completed';
  acceptance_criteria?: string[];
  judges?: JudgeConfig[];
  provider?: PrdProviderConfig;
  validation_results?: ValidationResult;
}
```

**Operations:**
- `loadPrdFile()` / `loadAllPrdFiles()` - Parse JSON
- `getNextTask()` - Find next pending item (respects filters)
- `markTaskInProgress()` / `markTaskComplete()` - Status updates
- `popTask()` - Remove from array (consume mode)
- `updateTaskValidation()` - Store validation results

### 5. Judge System (`judge.ts`)

```typescript
interface JudgeConfig {
  persona: string;        // QA Engineer, Security Auditor, etc.
  criteria?: string[];    // Custom evaluation criteria
  model?: 'opus' | 'sonnet';
  requireEvidence?: boolean;
  required?: boolean;     // Must pass for task to complete
  weight?: number;        // Scoring weight
}

interface JudgeContext {
  taskDescription: string;
  acceptanceCriteria: string[];
  codeChanges: string;    // Git diff
  validationResults?: ValidationResult;
  evidencePath?: string;
  claudeSummary?: string;
}
```

**Execution:**
1. Build judge prompt with context and persona
2. Run Claude to evaluate (parallel or sequential)
3. Parse JSON response for verdict
4. Aggregate results across judges

### 6. Hooks System (`hooks.ts`)

```typescript
interface ClaudeHooksSettings {
  hooks: {
    Stop?: StopHookConfig[];
    PostToolUse?: PostToolUseConfig[];
    PreToolUse?: PreToolUseConfig[];
  };
}
```

**Hook scripts (Python):**
- `validate-stop.py` - Stop hook with exit conditions
- `post-edit-lint.py` - Lint after edits
- `auto-approve.py` - Auto-approve safe commands

**Setup flow:**
1. `setupHooks()` creates `.claude/settings.local.json`
2. Environment variables configure hook behavior
3. `cleanupHooks()` removes settings on exit

### 7. Learnings System (`learnings.ts`)

```markdown
# LEARNINGS.md

## Patterns Discovered

### Pattern: React Hook Dependencies
- **Context**: Component re-renders
- **Insight**: Always include all dependencies in useEffect
- **Timestamp**: 2024-01-15T10:30:00Z

## Validation Failures

### Task: feature-001
- **Gate**: frontend:test
- **Error**: Snapshot mismatch
- **Timestamp**: 2024-01-15T11:00:00Z
```

**Features:**
- Parse `<learning>` blocks from Claude output
- Log validation failures with context
- Provide accumulated knowledge to future tasks

## Data Flow

### Task Execution

```
PRD File ──► getNextTask() ──► buildTaskPrompt() ──► Provider
                                      │
                                      ▼
                              ┌───────────────┐
                              │   Prompt      │
                              │ - Task desc   │
                              │ - Validation  │
                              │ - Learnings   │
                              │ - Prev errors │
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │   Provider    │
                              │ - Stream JSON │
                              │ - Track tools │
                              │ - Get summary │
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │  Validation   │
                              │ - Detect pkgs │
                              │ - Run gates   │
                              │ - Format      │
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │   Judges      │
                              │ - Evaluate    │
                              │ - Aggregate   │
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │   Complete    │
                              │ - Update PRD  │
                              │ - Git commit  │
                              │ - Notify      │
                              └───────────────┘
```

### Provider Resolution

```
CLI Config ──► File Metadata ──► Task Provider ──► Resolved Config
   │                │                  │                 │
   ▼                ▼                  ▼                 ▼
 claude           gemini            cursor            claude
 opus             flash             gpt-4             opus
                                    plan
```

Priority: Task > File > CLI

## Error Handling

### Validation Failures

1. Store failure details in PRD (`validation_results`)
2. Track attempt count
3. Build retry prompt with error context
4. Continue to next iteration

### Session Crashes

1. Catch SIGINT/SIGTERM signals
2. Mark session as `crashed` with error info
3. Preserve current task info for resume
4. `ralph resume` restores context

### Provider Errors

1. Catch CLI errors (exit codes, timeouts)
2. Return failure result with error message
3. Continue to next iteration (task stays in_progress)

## Configuration Layers

```
┌─────────────────────────────────────┐
│           CLI Arguments             │  Highest priority
├─────────────────────────────────────┤
│         Environment Vars            │
├─────────────────────────────────────┤
│          PRD File Metadata          │
├─────────────────────────────────────┤
│          PRD Task Config            │
├─────────────────────────────────────┤
│           Default Config            │  Lowest priority
└─────────────────────────────────────┘
```

## Testing Strategy

```
tests/
├── unit/
│   ├── providers.test.ts    # Provider logic
│   ├── validation/*.test.ts # Validation gates
│   ├── session.test.ts      # Session management
│   ├── prd.test.ts          # PRD parsing
│   ├── judge.test.ts        # Judge system
│   └── learnings.test.ts    # Learnings system
└── integration/
    └── (future)
```

**Mocking strategy:**
- `execa` for command execution
- `fs` for file operations
- Provider CLIs return mock responses

## Security Considerations

1. **Command Injection** - All commands built from validated inputs
2. **File Access** - Scoped to project directory
3. **Hook Safety** - Auto-approve has dangerous command blocklist
4. **Credentials** - Never logged, stored in environment only
