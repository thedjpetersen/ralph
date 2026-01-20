# AI Provider Configuration

Ralph supports multiple AI providers for task execution. This document covers installation, configuration, and best practices for each provider.

## Supported Providers

| Provider | CLI Command | Models | Best For |
|----------|-------------|--------|----------|
| Claude Code | `claude` | opus, sonnet | Complex tasks, code quality |
| Gemini CLI | `gemini` | pro, flash | Cost-effective bulk tasks |
| Cursor Agent | `agent` | any | IDE integration, project context |

## Installation

### Claude Code

```bash
# Install via npm
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version

# Authenticate
claude login
```

### Gemini CLI

```bash
# Install via Google Cloud SDK or standalone
# (Installation varies by platform)

# Verify installation
gemini --version

# Authenticate
gcloud auth application-default login
```

### Cursor Agent

```bash
# Cursor Agent CLI comes bundled with Cursor IDE
# Available from Cursor settings or via PATH

# Verify installation
agent --version
```

## Configuration

### CLI Flags

```bash
# Select provider
ralph run 10 --provider claude
ralph run 10 --provider gemini
ralph run 10 --provider cursor

# Claude options
ralph run 10 --provider claude --model opus
ralph run 10 --provider claude --model sonnet

# Gemini options
ralph run 10 --provider gemini --gemini-model pro
ralph run 10 --provider gemini --gemini-model flash

# Cursor options
ralph run 10 --provider cursor --cursor-model claude-3-5-sonnet
ralph run 10 --provider cursor --cursor-mode agent
ralph run 10 --provider cursor --cursor-mode plan
ralph run 10 --provider cursor --cursor-mode ask
```

### Environment Variables

```bash
# Default provider
export RALPH_PROVIDER=claude

# Default model
export RALPH_MODEL=opus
```

### PRD Configuration

#### File-Level (applies to all tasks in file)

```json
{
  "metadata": {
    "provider": {
      "provider": "gemini",
      "model": "flash"
    }
  },
  "items": [...]
}
```

#### Task-Level (highest priority)

```json
{
  "items": [
    {
      "id": "complex-task",
      "description": "Needs advanced reasoning",
      "provider": {
        "provider": "claude",
        "model": "opus"
      }
    }
  ]
}
```

## Provider Details

### Claude Code

**Command:** `claude`

**Models:**
| Model | Description | Use Case |
|-------|-------------|----------|
| `opus` | Most capable, highest quality | Complex refactors, architecture |
| `sonnet` | Balanced speed/quality | General development |

**CLI Arguments:**
```bash
claude --print --verbose \
  --output-format stream-json \
  --dangerously-skip-permissions \
  --model sonnet \
  --max-turns 50 \
  "Your prompt here"
```

**Features:**
- Native tool use (file editing, bash commands)
- Streaming JSON output
- Token tracking
- Deep integration via hooks (see [HOOKS.md](HOOKS.md))

**Best practices:**
- Use opus for complex multi-file changes
- Use sonnet for simple, single-file tasks
- Enable hooks for validation feedback

### Gemini CLI

**Command:** `gemini`

**Models:**
| Model | CLI Value | Description |
|-------|-----------|-------------|
| `pro` | `2.5-pro` | Most capable |
| `flash` | `2.5-flash` | Fast and efficient |

**CLI Arguments:**
```bash
gemini -p "Your prompt here" \
  -m 2.5-pro \
  --output-format stream-json \
  -y  # YOLO mode - auto-accept
```

**Features:**
- YOLO mode (`-y`) for autonomous operation
- Streaming JSON output
- Cost-effective for bulk operations

**Best practices:**
- Use flash for high-volume, simple tasks
- Great for linting, formatting, documentation
- Consider for cost optimization in CI/CD

### Cursor Agent

**Command:** `agent`

**Modes:**
| Mode | Description |
|------|-------------|
| `agent` | Full autonomous agent with tools |
| `plan` | Planning mode, suggests without executing |
| `ask` | Q&A mode, no code changes |

**CLI Arguments:**
```bash
agent -p "Your prompt here" \
  --model claude-3-5-sonnet \
  --output-format json \
  --mode=agent
```

**Features:**
- Any model supported by Cursor
- Three operational modes
- Project-aware context

**Best practices:**
- Use agent mode for full autonomous operation
- Use plan mode for reviewing changes before execution
- Great for tasks requiring IDE context

## Provider Resolution

Ralph resolves the provider configuration with this priority:

```
1. Task-level provider (highest)
   └── item.provider in PRD
2. File-level provider
   └── metadata.provider in PRD
3. CLI flags
   └── --provider, --model, etc.
4. Default configuration
   └── claude with sonnet
```

### Resolution Example

```json
// CLI: ralph run 10 --provider claude --model sonnet

// PRD file with overrides:
{
  "metadata": {
    "provider": { "provider": "gemini", "model": "pro" }
  },
  "items": [
    {
      "id": "task-1",
      // No override - uses file-level: gemini pro
    },
    {
      "id": "task-2",
      "provider": { "model": "flash" }
      // Partial override - uses gemini flash
    },
    {
      "id": "task-3",
      "provider": { "provider": "claude", "model": "opus" }
      // Full override - uses claude opus
    }
  ]
}
```

**Result:**
- task-1: Gemini pro (file-level)
- task-2: Gemini flash (task model override)
- task-3: Claude opus (full task override)

## Split Provider Configuration

Run tasks with one provider, validation with another:

```bash
ralph run 10 \
  --provider gemini \
  --gemini-model flash \
  --validation-provider claude \
  --model sonnet
```

Use cases:
- Cost optimization: cheap provider for tasks, quality provider for validation
- Speed: fast provider for iteration, thorough provider for review

## Output Parsing

Each provider outputs JSON events that Ralph parses:

### Claude Event Format

```json
{
  "type": "assistant",
  "message": {
    "content": [
      { "type": "tool_use", "name": "Edit" },
      { "type": "text", "text": "I've updated the file..." }
    ]
  }
}
```

### Gemini Event Format

```json
{
  "type": "tool_call",
  "tool_name": "write_file",
  "text": "Creating new file..."
}
```

### Cursor Event Format

```json
{
  "type": "tool_use",
  "tool": "edit_file",
  "content": "Making changes..."
}
```

## Availability Checking

Ralph checks if a provider is available before running:

```typescript
const available = await isProviderAvailable('claude');
// Returns true if `claude --version` succeeds
```

If a provider is unavailable, Ralph will:
1. Log an error with installation instructions
2. Exit with a non-zero code

## Token Limits

Configure token limits per model:

```typescript
// In RalphConfig
opusTokenLimit: 150000,   // Higher for complex tasks
sonnetTokenLimit: 50000,  // Lower for simple tasks
```

## Timeout Configuration

Set execution timeout per task:

```bash
# Default: 30 minutes
ralph run 10 --validation-timeout 120000  # 2 minutes for validation
```

## Cost Optimization Strategies

### 1. Model Matching

```json
{
  "items": [
    {
      "id": "docs-update",
      "description": "Update README",
      "priority": "low",
      "provider": { "provider": "gemini", "model": "flash" }
    },
    {
      "id": "security-fix",
      "description": "Fix SQL injection vulnerability",
      "priority": "high",
      "provider": { "provider": "claude", "model": "opus" }
    }
  ]
}
```

### 2. Provider Tiering

```bash
# Development: fast iteration
ralph run 10 --provider gemini --gemini-model flash

# Pre-commit: quality check
ralph run 1 --provider claude --model opus
```

### 3. Batch Similar Tasks

Group simple tasks in one PRD with cost-effective provider:

```json
// formatting-tasks.json
{
  "metadata": {
    "provider": { "provider": "gemini", "model": "flash" }
  },
  "items": [
    { "id": "format-1", "description": "Format component A" },
    { "id": "format-2", "description": "Format component B" },
    { "id": "format-3", "description": "Format component C" }
  ]
}
```

## Troubleshooting

### Provider Not Found

```
Error: claude command not found
```

**Solution:** Install the provider CLI and ensure it's in PATH.

### Authentication Error

```
Error: Not authenticated with provider
```

**Solution:** Run the provider's login command (`claude login`, `gcloud auth`, etc.)

### Timeout Error

```
Error: Provider execution timed out
```

**Solution:** Increase timeout or simplify the task.

### Invalid Model

```
Error: Invalid model "ultra" for provider gemini
```

**Solution:** Use a valid model name (pro, flash for Gemini).
