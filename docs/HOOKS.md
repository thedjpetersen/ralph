# Claude Code Hooks Integration

Ralph provides deep integration with Claude Code through a hooks system that enables real-time validation feedback, automatic command approval, and completion control.

## Overview

Claude Code hooks are Python scripts that execute at specific points during AI interactions:

| Hook | When | Purpose |
|------|------|---------|
| **Stop** | Before completion | Validate before allowing task completion |
| **PostToolUse** | After Edit/Write | Instant lint feedback on file changes |
| **PreToolUse** | Before Bash | Auto-approve safe commands, block dangerous ones |

## Enabling Hooks

```bash
# Enable all hooks
ralph run 10 --hooks

# Or enable individual hooks
ralph run 10 --hook-stop --hook-lint --hook-auto-approve

# Disable hooks explicitly
ralph run 10 --no-hooks
```

## How It Works

1. Ralph creates `.claude/settings.local.json` with hook configurations
2. Claude Code loads these settings and executes hooks at appropriate times
3. Hooks communicate with Claude via JSON stdin/stdout
4. On completion/error, Ralph cleans up the settings file

```
Ralph
  │
  ├──► Creates .claude/settings.local.json
  │         │
  │         ▼
  │    Claude Code
  │         │
  │    ┌────┴────┐
  │    ▼         ▼
  │  Edit     Bash
  │    │         │
  │    ▼         ▼
  │ PostToolUse  PreToolUse
  │    │         │
  │    └────┬────┘
  │         │
  │         ▼
  │      Stop
  │         │
  └──► Cleans up settings
```

## Hook Details

### Stop Hook (validate-stop.py)

**Purpose:** Prevents Claude from completing until validation commands have been run and passed.

**Exit Conditions:**
1. Emergency escape: `RALPH_FORCE_STOP=true`
2. Already continuing from previous block
3. Max continuations reached
4. Validation commands ran AND passed

**Configuration:**
```bash
# Set max forced continuations before allowing stop
--max-continuations 5

# Environment variables
export RALPH_MAX_CONTINUATIONS=5
export RALPH_TARGET_PACKAGE=frontend
export RALPH_FORCE_STOP=true  # Emergency escape hatch
```

**Validation Commands Checked:**
```bash
# frontend
cd frontend && npm run build
cd frontend && npm test
cd frontend && npm run lint

# backend
cd backend && npm run build
cd backend && npm test
cd backend && npm run lint

# electron
cd electron && npm run build
cd electron && npm test

# mobile
cd mobile && npx tsc
cd mobile && npm test
```

**State Tracking:**

The hook maintains state in `.ralph/hook-state.json`:
```json
{
  "continuation_count": 2,
  "session_id": "abc123"
}
```

**Output Format:**

When blocking:
```json
{
  "decision": "block",
  "reason": "Run validation before completing. Missing: build, test. Commands: cd frontend && npm run build && npm test && npm run lint (Continuation 2/5)"
}
```

### PostToolUse Hook (post-edit-lint.py)

**Purpose:** Runs oxlint immediately after file edits, giving Claude instant feedback.

**Features:**
- Only runs on TypeScript/JavaScript files
- Uses oxlint for speed (faster than ESLint)
- Non-blocking (informational only)
- Limits output to 15 lines

**Supported Extensions:**
- `.ts`, `.tsx`
- `.js`, `.jsx`
- `.mjs`, `.cjs`

**Package Detection:**

The hook determines which package a file belongs to:
```
frontend/src/App.tsx    → frontend
backend/src/server.ts   → backend
electron/src/main.ts    → electron
mobile/app/index.tsx    → mobile
```

**Configuration:**
```bash
# Disable via environment
export RALPH_HOOK_LINT=false
```

**Output Format:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "⚠️ Lint issues in frontend/src/App.tsx:\n```\nerror: Unused variable 'x'\n```\nConsider fixing these before continuing."
  }
}
```

### PreToolUse Hook (auto-approve.py)

**Purpose:** Automatically approves safe validation commands and blocks dangerous ones.

**Safe Commands (Auto-Approved):**
```bash
# Validation
cd frontend && npm run build
cd backend && npm test
npx vitest --run
npx oxlint src/

# Git read-only
git status
git diff
git log

# Inspection
ls -la
pwd
which node
npm --version
```

**Dangerous Commands (Blocked):**
```bash
rm -rf /           # Recursive delete
sudo anything      # Privilege escalation
chmod 777          # World writable
curl ... | sh     # Pipe to shell
eval $COMMAND      # Command injection
dd if=/dev/zero   # Disk overwrite
```

**Ask Commands (Normal Flow):**
```bash
git push           # Git write operations
npm install        # Package modifications
rm file.txt        # Non-recursive delete
mv src dst         # File operations
```

**Configuration:**
```bash
# Disable via environment
export RALPH_HOOK_AUTO_APPROVE=false
```

**Output Format:**

Auto-approve:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Auto-approved by RALPH (safe validation command)"
  }
}
```

Block (exits with code 2):
```
🚫 Blocked dangerous command pattern: rm\s+(-[rf]+\s+|.*-[rf])
```

## Settings File Format

Ralph generates `.claude/settings.local.json`:

```json
{
  "_ralph_hooks": true,
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"/path/to/hooks/validate-stop.py\"",
            "timeout": 30
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"/path/to/hooks/post-edit-lint.py\"",
            "timeout": 15
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"/path/to/hooks/auto-approve.py\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

The `_ralph_hooks: true` marker allows Ralph to identify and clean up its own settings.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RALPH_TARGET_PACKAGE` | Package being validated | `frontend` |
| `RALPH_MAX_CONTINUATIONS` | Max forced continuations | `5` |
| `RALPH_FORCE_STOP` | Emergency escape hatch | `false` |
| `RALPH_HOOK_LINT` | Enable lint hook | `true` |
| `RALPH_HOOK_AUTO_APPROVE` | Enable auto-approve | `true` |
| `CLAUDE_PROJECT_DIR` | Project root (set by Claude) | cwd |

## Troubleshooting

### Hook Not Executing

1. Verify Python 3 is installed: `python3 --version`
2. Check hook file permissions: `chmod +x hooks/*.py`
3. Verify hooks directory exists: `ls -la scripts/ralph/hooks/`

### Infinite Loop Prevention

If Claude keeps getting blocked:

1. Check continuation count in `.ralph/hook-state.json`
2. Increase max continuations: `--max-continuations 10`
3. Emergency escape: `export RALPH_FORCE_STOP=true`

### Lint Hook Slow

If the lint hook causes delays:

1. Disable for faster iteration: `export RALPH_HOOK_LINT=false`
2. Check oxlint installation: `npx oxlint --version`

### Auto-Approve Not Working

1. Check environment: `echo $RALPH_HOOK_AUTO_APPROVE`
2. Verify command pattern matches (case-insensitive regex)
3. Check hook output in Claude logs

### Cleaning Up Stale Settings

If `.claude/settings.local.json` persists after errors:

```bash
# Manual cleanup
rm .claude/settings.local.json

# Or check for Ralph marker
cat .claude/settings.local.json | grep "_ralph_hooks"
```

## Custom Hooks

### Adding Custom Validation

Extend `validate-stop.py` to check custom criteria:

```python
# Add to check_validation_in_transcript()
custom_patterns = [
    (r'npm run custom-check', 'custom'),
]
```

### Adding Custom Safe Commands

Extend `auto-approve.py` patterns:

```python
SAFE_PATTERNS.append(
    r'^npm run my-safe-script'
)
```

### Adding Custom Lint Rules

The lint hook uses oxlint configuration from each package:

```bash
# Create/edit package-specific config
frontend/.oxlintrc.json
backend/.oxlintrc.json
```

## Best Practices

1. **Start with hooks enabled** - They catch issues early
2. **Tune max continuations** - 5 is usually enough, increase for complex tasks
3. **Monitor hook state** - Check `.ralph/hook-state.json` for debugging
4. **Use emergency escape sparingly** - `RALPH_FORCE_STOP=true` bypasses all checks
5. **Keep hooks fast** - Timeouts are set tight (5-30s)

## Security Considerations

1. **Command blocking** - The auto-approve hook blocks dangerous patterns
2. **No sudo** - All sudo commands are blocked
3. **No shell piping** - `curl | sh` patterns are blocked
4. **Safe defaults** - Unknown commands go through normal approval flow
