<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node Version">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
</p>

<h1 align="center">Ralph</h1>

<p align="center">
  <strong>Autonomous AI coding agent that turns PRDs into working code</strong>
</p>

<p align="center">
  Define tasks in JSON. Ralph executes them with AI, validates the results, and iterates until done.
</p>

---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   PRD.json ──► Ralph ──► AI Provider ──► Code Changes ──► Validation ──►   │
│       ▲                   (Claude/        (Edit files,     (Build,     │   │
│       │                    Gemini/         run tests)       Test,      │   │
│       │                    Cursor/                          Lint)      │   │
│       │                    Codex)                               │       │   │
│       └────────────────────── Retry if failed ─────────────────┘       │   │
│                                                                             │
│   ✓ Task complete ──► Next task                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Why Ralph?

**The problem:** You have a backlog of well-defined tasks. AI can do them, but you're stuck babysitting—copying prompts, checking results, re-running when things fail.

**The solution:** Ralph runs autonomously. Give it a PRD, walk away, come back to completed work. It handles the loop: execute → validate → retry → next task.

```bash
# This runs overnight and completes your backlog
ralph run 50 --prd docs/prd/refactoring.json
```

## Quick Start

```bash
# Install
npm install -g ralph-ai

# Create a task file
cat > tasks.json << 'EOF'
{
  "items": [
    {
      "id": "hello-world",
      "description": "Create a hello world Express server in src/server.ts",
      "priority": "high",
      "acceptance_criteria": [
        "GET / returns 'Hello World'",
        "Server runs on port 3000",
        "Include a health check endpoint"
      ]
    }
  ]
}
EOF

# Run it
ralph run 5 --prd tasks.json

# Or just run `ralph` for the interactive menu
ralph
```

## Features

### Multi-Provider Support

Use the best AI for each task. Ralph supports four providers:

| Provider | Models | Install |
|----------|--------|---------|
| **Claude Code** | opus, sonnet, haiku | `npm install -g @anthropic-ai/claude-code` |
| **Gemini CLI** | pro, flash | `npm install -g @google/gemini-cli` |
| **Cursor** | configurable | [cursor.com](https://cursor.com) |
| **OpenAI Codex** | configurable | `npm install -g @openai/codex` |

```bash
ralph run 10 --provider claude --model opus       # Complex tasks
ralph run 50 --provider gemini --gemini-model flash  # Bulk simple tasks
ralph run 10 --provider codex                     # Codex full-auto
```

Or mix providers in one PRD:

```json
{
  "items": [
    {
      "id": "security-audit",
      "description": "Review auth for vulnerabilities",
      "provider": { "provider": "claude", "model": "opus" }
    },
    {
      "id": "add-comments",
      "description": "Add JSDoc to utils/",
      "provider": { "provider": "gemini", "model": "flash" }
    }
  ]
}
```

### Factory Mode

Run multiple AI workers in parallel with intelligent task routing. Factory mode spins up isolated git worktrees, routes tasks by complexity, and merges completed work back to your main branch.

```bash
ralph factory --prd features.json \
  --max-workers 5 \
  --opus-slots 1 \
  --sonnet-slots 2 \
  --haiku-slots 3 \
  --gemini-pro-slots 2 \
  --gemini-flash-slots 3
```

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   PRD ──► Complexity Router ──┬──► Worker 1 (Claude Opus)       │
│                               ├──► Worker 2 (Claude Sonnet)     │
│                               ├──► Worker 3 (Gemini Pro)        │
│                               ├──► Worker 4 (Claude Haiku)      │
│                               └──► Worker 5 (Gemini Flash)      │
│                                          │                       │
│   Planner (generates new tasks) ◄────────┤                       │
│                                          ▼                       │
│                                   Merge Coordinator              │
│                                   (cherry-pick to main)          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Key capabilities:

- **Complexity routing** — High-complexity tasks go to Opus/Pro, medium to Sonnet, low to Haiku/Flash
- **Git worktrees** — Each worker gets an isolated workspace, no conflicts
- **Dynamic planner** — AI generates new tasks from spec URLs or existing PRD context
- **Retry escalation** — Failed tasks automatically escalate to higher-tier providers
- **Merge coordinator** — Cherry-picks completed work back to your main branch
- **Convergence detection** — Stops when all tasks are done or the spec is satisfied

```bash
# Feed a spec URL so the planner can generate tasks dynamically
ralph factory --spec-url https://example.com/api-docs --max-workers 3

# Multiple spec URLs
ralph factory --spec-url https://example.com/spec --spec-url https://example.com/design
```

### Validation Gates

Code doesn't ship until it passes. Ralph runs validation after each task:

| Gate | What it checks |
|------|----------------|
| **oxlint** | Fast linting (Rust-based, runs in ms) |
| **build** | TypeScript compilation |
| **test** | Unit tests pass |
| **lint** | Full ESLint check |

Failed validation? Ralph feeds the errors back to the AI and retries automatically.

```bash
# Skip specific gates if needed
ralph run 10 --no-test-check --no-lint-check
```

### LLM Judges

AI-powered code review before marking tasks complete:

```json
{
  "judges": [
    {
      "persona": "Security Auditor",
      "criteria": ["No hardcoded secrets", "Input validation present"],
      "required": true,
      "threshold": 80
    },
    {
      "persona": "QA Engineer",
      "criteria": ["Test coverage > 80%", "Edge cases handled"],
      "threshold": 70
    }
  ]
}
```

Personas: `QA Engineer` · `Security Auditor` · `UX Designer` · `Performance Engineer` · `Software Architect`

### Session Recovery

Ralph saves state. Crash? Resume where you left off.

```bash
ralph sessions          # List all sessions
ralph resume            # Resume most recent
ralph resume abc123     # Resume specific session
ralph abort abc123      # Abort and reset orphaned tasks
```

### Interactive Mode

Run `ralph` with no arguments for an interactive menu:

- Discovers PRD files across your project with progress bars
- Create new PRDs from templates
- Choose actions: run one, run multiple, run all, factory mode, or resume
- Enter custom PRD paths

### Claude Code Hooks

Deep integration with Claude Code for real-time feedback:

```bash
ralph run 10 --hooks
```

- **Stop Hook** — Blocks completion until validation passes
- **Lint Hook** — Instant feedback after every file edit
- **Auto-approve** — Skips permission prompts for safe commands

## Installation

### From npm

```bash
npm install -g ralph-ai
```

### From source

```bash
git clone https://github.com/thedjpetersen/ralph.git
cd ralph
npm install && npm run build
npm link
```

### Prerequisites

You need at least one AI CLI installed:

| Provider | Install |
|----------|---------|
| Claude Code | `npm install -g @anthropic-ai/claude-code` |
| Gemini CLI | `npm install -g @google/gemini-cli` |
| Cursor | Included with [Cursor IDE](https://cursor.com) |
| OpenAI Codex | `npm install -g @openai/codex` |

## Usage

### Commands

```bash
ralph                   # Interactive menu
ralph run [n]           # Run n iterations (default: 30)
ralph once              # Run single task
ralph factory           # Parallel factory mode
ralph status            # Show PRD status
ralph sessions          # List sessions
ralph resume [id]       # Resume crashed session
ralph abort [id]        # Abort session, reset tasks
ralph test [packages]   # Run tests for packages
ralph evidence [pkgs]   # Capture screenshots/video
```

### Common Patterns

```bash
# Work through a PRD overnight
ralph run 100 --prd features.json --provider claude

# Quick iteration on simple tasks
ralph run 20 --provider gemini --gemini-model flash

# High-quality with code review
ralph run 10 --hooks --provider claude --model opus

# Parallel factory with spec-driven planning
ralph factory --prd features.json --spec-url https://example.com/spec

# Filter by priority or category
ralph run 10 --priority high --category backend

# Run a specific task by ID
ralph run 1 --task my-task-id

# Dry run to see what would execute
ralph run 10 --dry-run
```

### PRD Format

```json
{
  "project": "My Project",
  "description": "Project description",
  "metadata": {
    "version": "1.0",
    "provider": {
      "provider": "claude",
      "model": "opus"
    }
  },
  "items": [
    {
      "id": "unique-id",
      "name": "Task Name",
      "description": "What to build",
      "priority": "high",
      "category": "backend",
      "dependencies": ["other-task-id"],
      "complexity": "high",
      "acceptance_criteria": [
        "Criterion 1",
        "Criterion 2"
      ],
      "provider": {
        "provider": "gemini",
        "model": "pro"
      },
      "validation": {
        "gates": { "test": true, "build": true },
        "skip": false
      },
      "judges": [
        { "persona": "QA Engineer", "threshold": 70 }
      ]
    }
  ]
}
```

Tasks support **dependency DAGs** via the `dependencies` field — Ralph will only execute a task once its dependencies are complete. The `complexity` field (`low`, `medium`, `high`) hints factory mode's routing.

See [docs/PRD_FORMAT.md](docs/PRD_FORMAT.md) for the complete specification.

## Configuration

### CLI Options

```bash
# Providers
--provider <name>           # claude, gemini, cursor, codex
--model <model>             # opus, sonnet, haiku (Claude)
--gemini-model <model>      # pro, flash (Gemini)
--cursor-model <model>      # Model name (Cursor)
--cursor-mode <mode>        # plan, ask (Cursor)
--validation-provider <p>   # Separate provider for validation

# Validation
--skip-validation           # Skip all gates
--no-build-check            # Skip build
--no-test-check             # Skip tests
--no-lint-check             # Skip lint
--validation-timeout <ms>   # Timeout per gate
--fail-fast                 # Stop on first failure

# Tasks
--prd <path>                # Specific PRD file
--priority <level>          # Filter: high/medium/low
--category <category>       # Filter by category
--task <id>                 # Run a specific task
--pop-tasks                 # Remove completed tasks
--no-archive                # Don't archive popped tasks

# Factory mode
--max-workers <n>           # Max concurrent workers (default: 5)
--opus-slots <n>            # Claude Opus slots
--sonnet-slots <n>          # Claude Sonnet slots
--haiku-slots <n>           # Claude Haiku slots
--gemini-pro-slots <n>      # Gemini Pro slots
--gemini-flash-slots <n>    # Gemini Flash slots
--codex-slots <n>           # Codex slots
--cursor-slots <n>          # Cursor slots
--planner-model <model>     # Model for the planner
--spec-url <url...>         # Spec URLs for planner
--retry-limit <n>           # Max retries per task
--escalate-on-retry         # Escalate tier on failure

# Output
-v, --verbose               # Detailed logging
-q, --quiet                 # Minimal output
--dry-run                   # Preview without executing
--no-commit                 # Skip git commits
--capture                   # Capture screenshots
--capture-video             # Capture video
```

### Environment Variables

```bash
export RALPH_PROVIDER=claude
export RALPH_MODEL=opus
export RALPH_MAX_CONTINUATIONS=5
```

Full reference: [docs/CONFIGURATION.md](docs/CONFIGURATION.md)

## How It Works

```
1. Load PRD         Parse JSON, find next pending task by priority/dependencies
                    ↓
2. Build Prompt     Task description + acceptance criteria + previous errors
                    ↓
3. Execute          Stream to AI provider, track tool usage
                    ↓
4. Validate         Run oxlint → build → test → lint on changed packages
                    ↓
5. Judge            Optional LLM review with configured personas
                    ↓
6. Complete/Retry   Pass → mark done, next task. Fail → retry with errors
```

Architecture details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Documentation

| Doc | Description |
|-----|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, components |
| [Configuration](docs/CONFIGURATION.md) | All options and environment variables |
| [PRD Format](docs/PRD_FORMAT.md) | Task file specification |
| [Providers](docs/PROVIDERS.md) | AI provider setup and configuration |
| [Hooks](docs/HOOKS.md) | Claude Code integration |
| [Contributing](CONTRIBUTING.md) | Development setup and guidelines |

## Development

```bash
npm run dev          # Run with hot reload
npm test             # Run tests
npm run build        # Compile TypeScript
npm run typecheck    # Type check without emit
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Quick start for contributors
git clone https://github.com/thedjpetersen/ralph.git
cd ralph
npm install
npm test
```

## License

MIT © [Ralph Contributors](LICENSE)

---

<p align="center">
  <sub>Named after Ralph Wiggum — enthusiastic, autonomous, occasionally surprising.</sub>
</p>
