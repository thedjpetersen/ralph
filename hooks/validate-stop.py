#!/usr/bin/env python3
"""
RALPH Stop Hook - Validation Gate

Prevents Claude from stopping until validation commands have been run and passed.
Includes exit conditions to prevent infinite loops.

Exit conditions:
1. stop_hook_active=true (already continuing from previous block)
2. Max continuations reached (from RALPH_MAX_CONTINUATIONS env var)
3. Validation commands were run AND passed
4. RALPH_FORCE_STOP=true (emergency escape hatch)
"""

import json
import os
import re
import sys
from pathlib import Path


def get_ralph_state_file() -> Path:
    """Get path to RALPH state file for tracking continuations."""
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    return Path(project_dir) / ".ralph" / "hook-state.json"


def load_ralph_state() -> dict:
    """Load RALPH hook state."""
    state_file = get_ralph_state_file()
    if state_file.exists():
        try:
            return json.loads(state_file.read_text())
        except:
            pass
    return {"continuation_count": 0, "session_id": None}


def save_ralph_state(state: dict) -> None:
    """Save RALPH hook state."""
    state_file = get_ralph_state_file()
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state_file.write_text(json.dumps(state, indent=2))


def check_validation_in_transcript(transcript: str, target_package: str) -> dict:
    """
    Check if validation commands were run and passed.
    Returns dict with 'ran' and 'passed' booleans, and 'missing' list.
    """
    # Commands to check based on package
    package_commands = {
        "frontend": [
            (r"cd frontend\s*&&\s*npm run build", "build"),
            (r"cd frontend\s*&&\s*npm test", "test"),
            (r"cd frontend\s*&&\s*npm run lint", "lint"),
        ],
        "backend": [
            (r"cd backend\s*&&\s*npm run build", "build"),
            (r"cd backend\s*&&\s*npm test", "test"),
            (r"cd backend\s*&&\s*npm run lint", "lint"),
        ],
        "electron": [
            (r"cd electron\s*&&\s*npm run build", "build"),
            (r"cd electron\s*&&\s*npm test", "test"),
        ],
        "mobile": [
            (r"cd mobile\s*&&\s*npx tsc", "build"),
            (r"cd mobile\s*&&\s*npm test", "test"),
        ],
    }

    commands = package_commands.get(target_package, package_commands["frontend"])

    ran_commands = []
    missing_commands = []

    for pattern, name in commands:
        if re.search(pattern, transcript, re.IGNORECASE):
            ran_commands.append(name)
        else:
            missing_commands.append(name)

    # Check for failures in recent output (last 100 lines)
    recent_lines = transcript.split('\n')[-100:]
    recent_output = '\n'.join(recent_lines)

    failure_patterns = [
        r'FAIL\s+',
        r'error TS\d+',
        r'\d+ errors?\b',
        r'npm ERR!',
        r'Command failed',
        r'Build failed',
        r'Test failed',
    ]

    has_failures = any(
        re.search(p, recent_output, re.IGNORECASE)
        for p in failure_patterns
    )

    # Check for success indicators
    success_patterns = [
        r'Build completed',
        r'All tests passed',
        r'✓.*tests? passed',
        r'Found \d+ warnings? and 0 errors',
        r'0 errors',
    ]

    has_success = any(
        re.search(p, recent_output, re.IGNORECASE)
        for p in success_patterns
    )

    return {
        "ran": len(ran_commands) > 0,
        "ran_commands": ran_commands,
        "missing": missing_commands,
        "has_failures": has_failures,
        "has_success": has_success,
        "passed": len(missing_commands) == 0 and not has_failures and has_success,
    }


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Error parsing input: {e}", file=sys.stderr)
        sys.exit(1)

    # Exit condition 1: Emergency escape hatch
    if os.environ.get("RALPH_FORCE_STOP") == "true":
        sys.exit(0)

    # Exit condition 2: Already continuing from previous block
    if input_data.get("stop_hook_active"):
        # Reset continuation count on successful stop
        state = load_ralph_state()
        state["continuation_count"] = 0
        save_ralph_state(state)
        sys.exit(0)

    # Load and update state
    state = load_ralph_state()
    session_id = input_data.get("session_id", "unknown")

    # Reset count if new session
    if state.get("session_id") != session_id:
        state = {"continuation_count": 0, "session_id": session_id}

    state["continuation_count"] = state.get("continuation_count", 0) + 1
    save_ralph_state(state)

    # Exit condition 3: Max continuations reached
    max_continuations = int(os.environ.get("RALPH_MAX_CONTINUATIONS", "5"))
    if state["continuation_count"] > max_continuations:
        print(f"Max continuations ({max_continuations}) reached, allowing stop", file=sys.stderr)
        sys.exit(0)

    # Read transcript
    transcript_path = input_data.get("transcript_path", "")
    if not transcript_path or not os.path.exists(transcript_path):
        sys.exit(0)  # Can't verify, allow stop

    try:
        with open(transcript_path, 'r') as f:
            transcript = f.read()
    except Exception as e:
        print(f"Error reading transcript: {e}", file=sys.stderr)
        sys.exit(0)

    # Get target package from environment (set by RALPH)
    target_package = os.environ.get("RALPH_TARGET_PACKAGE", "frontend")

    # Check validation status
    validation = check_validation_in_transcript(transcript, target_package)

    # Exit condition 4: Validation passed
    if validation["passed"]:
        state["continuation_count"] = 0
        save_ralph_state(state)
        sys.exit(0)

    # Block and provide guidance
    if validation["missing"]:
        reason = f"Run validation before completing. Missing: {', '.join(validation['missing'])}. "
        reason += f"Commands: cd {target_package} && npm run build && npm test && npm run lint"
    elif validation["has_failures"]:
        reason = "Validation errors detected. Fix the errors and re-run validation commands."
    elif not validation["has_success"]:
        reason = f"Validation commands ran but success not confirmed. Re-run: cd {target_package} && npm run build && npm test && npm run lint"
    else:
        reason = "Validation incomplete. Ensure all commands pass before completing."

    reason += f" (Continuation {state['continuation_count']}/{max_continuations})"

    output = {
        "decision": "block",
        "reason": reason
    }
    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
