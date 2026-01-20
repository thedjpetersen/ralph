# Ralph

**Autonomous AI Coding Loop with Validation Gates**

Ralph is an autonomous coding system that executes development tasks from PRD (Product Requirements Document) files, validates the results, and iterates until completion. It supports multiple AI providers (Claude, Gemini, Cursor), includes LLM-based code review judges, and maintains knowledge across sessions.

## Features

- **Autonomous Task Execution** - Processes tasks from JSON PRD files without human intervention
- **Multi-Provider Support** - Works with Claude Code, Gemini CLI, and Cursor Agent
- **Validation Gates** - Automated build, test, and lint verification before marking tasks complete
- **LLM Judges** - Persona-based code review (QA Engineer, Security Auditor, UX Designer, etc.)
- **Session Persistence** - Resume interrupted sessions, track progress across runs
- **Knowledge Accumulation** - Learns patterns and gotchas across tasks
- **Claude Code Hooks** - Deep integration with Claude Code for enhanced validation
- **Consume Mode** - Remove completed tasks from PRD to maintain focus

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ralph.git
cd ralph

# Install dependencies
npm install

# Build
npm run build

# Link globally (optional)
npm link
```

### Prerequisites

- Node.js 18+
- One of the supported AI CLIs:
  - [Claude Code](https://claude.ai/code) - `npm install -g @anthropic-ai/claude-code`
  - [Gemini CLI](https://cloud.google.com/gemini) - Installation varies
  - [Cursor](https://cursor.com) - Cursor Agent CLI

## Quick Start

1. **Create a PRD file** (`docs/prd/my-feature.json`):

```json
{
  "metadata": {
    "version": "1.0",
    "created_at": "2024-01-15"
  },
  "items": [
    {
      "id": "feature-001",
      "name": "Add user authentication",
      "description": "Implement JWT-based authentication with login/logout endpoints",
      "priority": "high",
      "acceptance_criteria": [
        "POST /api/auth/login accepts email and password",
        "Returns JWT token on successful authentication",
        "POST /api/auth/logout invalidates the token"
      ]
    }
  ]
}
```

2. **Run Ralph**:

```bash
# Run 10 iterations
ralph run 10

# Run with a specific PRD file
ralph run 10 --prd docs/prd/my-feature.json

# Run a single task
ralph once
```

3. **Monitor progress**:

```bash
# Check status
ralph status

# List sessions
ralph sessions
```

## Commands

| Command | Description |
|---------|-------------|
| `ralph run [n]` | Run n iterations (default: 30) |
| `ralph once` | Run a single iteration |
| `ralph status` | Show PRD status and next task |
| `ralph resume [id]` | Resume a crashed session |
| `ralph abort [id]` | Abort a session and reset tasks |
| `ralph sessions` | List all sessions |
| `ralph evidence [pkg]` | Capture evidence screenshots |
| `ralph test [pkg]` | Run tests for packages |

## CLI Options

```bash
# AI Provider Options
--provider <name>         # claude, gemini, or cursor (default: claude)
--model <model>           # opus or sonnet for Claude (default: opus)
--gemini-model <model>    # pro or flash for Gemini
--cursor-model <model>    # Model name for Cursor
--cursor-mode <mode>      # agent, plan, or ask

# Validation Options
--skip-validation         # Skip all validation gates
--no-build-check          # Skip build validation
--no-test-check           # Skip test validation
--no-lint-check           # Skip lint validation
--validation-timeout <ms> # Timeout per command (default: 120000)
--fail-fast               # Stop on first validation failure

# Task Management
--prd <path>              # Specific PRD file to process
--category <name>         # Filter tasks by category
--priority <level>        # Filter by priority (high/medium/low)
--pop-tasks               # Remove tasks after completion
--no-archive              # Don't archive popped tasks

# Hooks (Claude Code integration)
--hooks                   # Enable Claude Code hooks
--hook-stop               # Enable stop validation hook
--hook-lint               # Enable post-edit lint hook
--hook-auto-approve       # Enable auto-approve for safe commands
--max-continuations <n>   # Max forced continuations (default: 5)

# Output
-v, --verbose             # Verbose output
-q, --quiet               # Minimal output
--dry-run                 # Show what would run
--no-notify               # Disable Discord notifications
--no-commit               # Skip git commits
```

## PRD Format

PRD files define tasks for Ralph to execute. See [docs/PRD_FORMAT.md](docs/PRD_FORMAT.md) for the complete specification.

```json
{
  "metadata": {
    "version": "1.0",
    "provider": {
      "provider": "gemini",
      "model": "flash"
    }
  },
  "items": [
    {
      "id": "unique-id",
      "name": "Short name",
      "description": "Detailed task description",
      "priority": "high",
      "status": "pending",
      "acceptance_criteria": ["Criterion 1", "Criterion 2"],
      "judges": [
        { "persona": "QA Engineer", "required": true },
        { "persona": "Security Auditor" }
      ],
      "provider": {
        "provider": "claude",
        "model": "opus"
      }
    }
  ]
}
```

## AI Providers

Ralph supports multiple AI providers with task-level and file-level configuration:

| Provider | CLI | Models | Notes |
|----------|-----|--------|-------|
| Claude | `claude` | opus, sonnet | Default provider |
| Gemini | `gemini` | pro, flash | YOLO mode enabled |
| Cursor | `agent` | any | Supports agent/plan/ask modes |

Provider priority: Task-level > File-level > CLI-level

See [docs/PROVIDERS.md](docs/PROVIDERS.md) for configuration details.

## Validation Gates

Ralph validates code changes before marking tasks complete:

1. **oxlint** - Fast Rust-based linter (runs first)
2. **build** - TypeScript compilation
3. **test** - Unit test execution
4. **lint** - ESLint/full linting
5. **custom** - Project-specific validations

Gates are run for each affected package based on git diff analysis.

## LLM Judges

Configure persona-based code review in your PRD:

```json
{
  "judges": [
    {
      "persona": "QA Engineer",
      "criteria": ["Test coverage > 80%", "Edge cases handled"],
      "required": true
    },
    {
      "persona": "Security Auditor",
      "criteria": ["No SQL injection", "Input validation"],
      "required": true
    },
    {
      "persona": "UX Designer",
      "requireEvidence": true,
      "required": false
    }
  ]
}
```

Available personas:
- **QA Engineer** - Test coverage, edge cases, error handling
- **Security Auditor** - OWASP, input validation, authentication
- **UX Designer** - Accessibility, usability, consistency
- **Performance Engineer** - Memory, N+1 queries, bundle size
- **Architect** - Code structure, patterns, maintainability

## Session Management

Ralph persists session state to `.ralph/sessions/`:

```bash
# List sessions
ralph sessions

# Resume a crashed session
ralph resume abc12345

# Resume the most recent crashed session
ralph resume

# Abort and reset orphaned tasks
ralph abort abc12345

# Clean up old sessions (> 7 days)
ralph sessions --cleanup
```

## Claude Code Hooks

For deep integration with Claude Code, enable hooks:

```bash
ralph run 10 --hooks
```

This creates `.claude/settings.local.json` with:

- **Stop Hook** - Prevents completion until validation passes
- **PostToolUse Hook** - Instant lint feedback after edits
- **PreToolUse Hook** - Auto-approves safe validation commands

See [docs/HOOKS.md](docs/HOOKS.md) for details.

## Project Structure

```
ralph/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/             # CLI commands
│   │   ├── run.ts            # Main autonomous loop
│   │   ├── status.ts         # PRD status
│   │   ├── resume.ts         # Session resume
│   │   └── ...
│   └── lib/                  # Core libraries
│       ├── providers.ts      # AI provider abstraction
│       ├── validation/       # Validation gates
│       ├── session.ts        # Session persistence
│       ├── judge.ts          # LLM judges
│       ├── prd.ts            # PRD management
│       ├── hooks.ts          # Claude Code hooks
│       └── ...
├── hooks/                    # Python hook scripts
│   ├── validate-stop.py
│   ├── post-edit-lint.py
│   └── auto-approve.py
├── docs/                     # Documentation
└── dist/                     # Compiled output
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [Configuration](docs/CONFIGURATION.md) - All configuration options
- [PRD Format](docs/PRD_FORMAT.md) - PRD file specification
- [Providers](docs/PROVIDERS.md) - AI provider configuration
- [Hooks](docs/HOOKS.md) - Claude Code hook integration
- [Contributing](CONTRIBUTING.md) - Development guide

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run watch
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Ralph is named after Ralph Wiggum from The Simpsons, embodying the spirit of enthusiastic (if sometimes unpredictable) autonomous operation.
