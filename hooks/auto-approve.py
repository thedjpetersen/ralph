#!/usr/bin/env python3
"""
RALPH PreToolUse Hook - Auto-Approve Validation Commands

Automatically approves safe validation and read-only commands.
Blocks dangerous commands. Speeds up the validation loop.

Features:
- Auto-approves: build, test, lint, git status/diff/log
- Blocks: rm -rf, sudo, dangerous pipes
- Configurable via environment variables
"""

import json
import os
import re
import sys


# Safe commands to auto-approve (patterns)
SAFE_PATTERNS = [
    # Validation commands
    r'^cd\s+(frontend|backend|electron|mobile|chrome-extension)\s*&&\s*npm\s+(run\s+)?(build|lint|test)',
    r'^cd\s+(frontend|backend|electron|mobile)\s*&&\s*npx\s+(tsc|vitest|playwright|oxlint)',
    r'^npm\s+(run\s+)?(build|lint|test|typecheck)',
    r'^npx\s+(tsc|vitest|playwright|oxlint|eslint|prettier)',

    # Git read-only commands
    r'^git\s+(status|diff|log|branch|show|ls-files)',
    r'^git\s+diff\s+',

    # Package info commands
    r'^npm\s+(ls|list|outdated|audit)',
    r'^cat\s+package\.json',

    # Safe inspection commands
    r'^ls\s',
    r'^pwd$',
    r'^echo\s',
    r'^which\s',
    r'^node\s+--version',
    r'^npm\s+--version',
]

# Dangerous commands to block
DANGEROUS_PATTERNS = [
    r'rm\s+(-[rf]+\s+|.*-[rf])',  # rm -rf, rm -r, rm -f
    r'sudo\s+',                    # Any sudo
    r'chmod\s+777',                # World writable
    r'>\s*/dev/',                  # Writing to /dev
    r'\|\s*(ba)?sh',               # Piping to shell
    r'curl.*\|\s*(ba)?sh',         # Curl pipe to shell
    r'wget.*\|\s*(ba)?sh',         # Wget pipe to shell
    r'eval\s+',                    # Eval
    r':\s*\(\)\s*\{',              # Fork bomb pattern
    r'mkfs\.',                     # Filesystem format
    r'dd\s+if=',                   # dd command
]

# Commands to always ask about (neither auto-approve nor block)
ASK_PATTERNS = [
    r'git\s+(push|pull|checkout|merge|rebase|reset)',  # Git write operations
    r'npm\s+(install|uninstall|update)',               # Package modifications
    r'rm\s+',                                           # Any rm without -rf
    r'mv\s+',                                           # Move commands
    r'cp\s+',                                           # Copy commands
]


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    # Only process Bash tool
    if input_data.get("tool_name") != "Bash":
        sys.exit(0)

    # Check if hook is enabled
    if os.environ.get("RALPH_HOOK_AUTO_APPROVE") == "false":
        sys.exit(0)

    command = input_data.get("tool_input", {}).get("command", "")
    if not command:
        sys.exit(0)

    # Normalize command for matching
    command_normalized = command.strip()

    # Check dangerous patterns first
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, command_normalized, re.IGNORECASE):
            print(f"🚫 Blocked dangerous command pattern: {pattern}", file=sys.stderr)
            sys.exit(2)  # Exit 2 = blocking error, shown to Claude

    # Check if we should ask (neither approve nor block)
    for pattern in ASK_PATTERNS:
        if re.search(pattern, command_normalized, re.IGNORECASE):
            # Don't interfere - let normal permission flow happen
            sys.exit(0)

    # Check safe patterns for auto-approval
    for pattern in SAFE_PATTERNS:
        if re.search(pattern, command_normalized, re.IGNORECASE):
            output = {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "allow",
                    "permissionDecisionReason": "Auto-approved by RALPH (safe validation command)"
                }
            }
            print(json.dumps(output))
            sys.exit(0)

    # Default: don't interfere
    sys.exit(0)


if __name__ == "__main__":
    main()
