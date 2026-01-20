#!/usr/bin/env python3
"""
RALPH PostToolUse Hook - Instant Lint Feedback

Runs lint on edited files immediately after Edit/Write operations.
Claude sees errors right away, enabling faster iteration.

Features:
- Only runs on TypeScript/JavaScript files
- Uses oxlint for speed
- Provides context back to Claude
- Non-blocking (informational only)
"""

import json
import os
import subprocess
import sys
from pathlib import Path


# File extensions to lint
LINTABLE_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'}

# Package detection patterns
PACKAGE_PATTERNS = [
    ('frontend/', 'frontend'),
    ('backend/', 'backend'),
    ('electron/', 'electron'),
    ('mobile/', 'mobile'),
    ('chrome-extension/', 'chrome-extension'),
]


def get_package_for_file(file_path: str) -> str | None:
    """Determine which package a file belongs to."""
    for pattern, package in PACKAGE_PATTERNS:
        if pattern in file_path:
            return package
    return None


def run_lint(file_path: str, package: str, project_root: str) -> str | None:
    """Run oxlint on a single file and return output if issues found."""
    package_dir = os.path.join(project_root, package)

    # Check if oxlint config exists
    oxlint_config = os.path.join(package_dir, '.oxlintrc.json')

    try:
        cmd = ['npx', 'oxlint']
        if os.path.exists(oxlint_config):
            cmd.extend(['--config', '.oxlintrc.json'])
        cmd.append(file_path)

        result = subprocess.run(
            cmd,
            cwd=package_dir,
            capture_output=True,
            text=True,
            timeout=10
        )

        output = (result.stdout + result.stderr).strip()

        # Check if there are actual issues (not just "Finished in Xms")
        if output and ('warning' in output.lower() or 'error' in output.lower()):
            # Filter to relevant lines
            lines = output.split('\n')
            relevant = []
            for line in lines:
                # Skip empty lines and metadata
                if not line.strip():
                    continue
                if line.startswith('Finished in'):
                    continue
                if 'Found 0 warnings' in line:
                    continue
                relevant.append(line)

            if relevant:
                return '\n'.join(relevant[:15])  # Limit output

        return None

    except subprocess.TimeoutExpired:
        return None
    except FileNotFoundError:
        return None
    except Exception as e:
        return None


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    # Only process Edit and Write tools
    tool_name = input_data.get("tool_name", "")
    if tool_name not in ("Edit", "Write"):
        sys.exit(0)

    # Check if hook is enabled
    if os.environ.get("RALPH_HOOK_LINT") == "false":
        sys.exit(0)

    # Get file path from tool input
    tool_input = input_data.get("tool_input", {})
    file_path = tool_input.get("file_path") or tool_input.get("filePath", "")

    if not file_path:
        sys.exit(0)

    # Check if it's a lintable file
    ext = Path(file_path).suffix.lower()
    if ext not in LINTABLE_EXTENSIONS:
        sys.exit(0)

    # Determine package
    package = get_package_for_file(file_path)
    if not package:
        sys.exit(0)

    # Get project root
    project_root = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())

    # Run lint
    lint_output = run_lint(file_path, package, project_root)

    if lint_output:
        # Provide feedback to Claude
        relative_path = file_path
        if file_path.startswith(project_root):
            relative_path = file_path[len(project_root):].lstrip('/')

        output = {
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": f"⚠️ Lint issues in {relative_path}:\n```\n{lint_output}\n```\nConsider fixing these before continuing."
            }
        }
        print(json.dumps(output))

    sys.exit(0)


if __name__ == "__main__":
    main()
