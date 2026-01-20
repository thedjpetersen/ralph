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
│       │                    Cursor)                          Lint)      │   │
│       │                                                        │       │   │
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
```

## Features

### Multi-Provider Support

Use the best AI for each task. Configure at the CLI, file, or task level.

```bash
ralph run 10 --provider claude --model opus     # Complex tasks
ralph run 50 --provider gemini --gemini-model flash  # Bulk simple tasks
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
      "required": true
    },
    {
      "persona": "QA Engineer",
      "criteria": ["Test coverage > 80%", "Edge cases handled"]
    }
  ]
}
```

Personas: `QA Engineer` · `Security Auditor` · `UX Designer` · `Performance Engineer` · `Architect`

### Session Recovery

Ralph saves state. Crash? Resume where you left off.

```bash
ralph sessions          # List all sessions
ralph resume            # Resume most recent
ralph resume abc123     # Resume specific session
```

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
| Gemini CLI | [cloud.google.com/gemini](https://cloud.google.com/gemini) |
| Cursor | Included with [Cursor IDE](https://cursor.com) |

## Usage

### Basic Commands

```bash
ralph run [n]           # Run n iterations (default: 30)
ralph once              # Run single task
ralph status            # Show PRD status
ralph sessions          # List sessions
ralph resume [id]       # Resume crashed session
```

### Common Patterns

```bash
# Work through a PRD overnight
ralph run 100 --prd features.json --provider claude

# Quick iteration on simple tasks
ralph run 20 --provider gemini --gemini-model flash

# High-quality with code review
ralph run 10 --hooks --provider claude --model opus

# Filter by priority
ralph run 10 --priority high

# Dry run to see what would execute
ralph run 10 --dry-run
```

### PRD Format

```json
{
  "metadata": {
    "version": "1.0"
  },
  "items": [
    {
      "id": "unique-id",
      "description": "What to build",
      "priority": "high",
      "acceptance_criteria": [
        "Criterion 1",
        "Criterion 2"
      ],
      "judges": [
        { "persona": "QA Engineer" }
      ]
    }
  ]
}
```

See [docs/PRD_FORMAT.md](docs/PRD_FORMAT.md) for the complete specification.

## Configuration

### CLI Options

```bash
# Providers
--provider <name>           # claude, gemini, cursor
--model <model>             # opus, sonnet (Claude)
--gemini-model <model>      # pro, flash (Gemini)

# Validation
--skip-validation           # Skip all gates
--no-build-check            # Skip build
--no-test-check             # Skip tests
--fail-fast                 # Stop on first failure

# Tasks
--prd <path>                # Specific PRD file
--priority <level>          # Filter: high/medium/low
--pop-tasks                 # Remove completed tasks

# Output
-v, --verbose               # Detailed logging
-q, --quiet                 # Minimal output
--dry-run                   # Preview without executing
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
1. Load PRD         Parse JSON, find next pending task by priority
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
