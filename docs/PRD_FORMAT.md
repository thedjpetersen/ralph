# PRD Format Specification

This document describes the JSON format for Product Requirements Documents (PRDs) used by Ralph.

## Overview

PRD files are JSON documents that define tasks for Ralph to execute. They follow a structured format with metadata and task items.

## File Location

PRD files should be placed in:
```
{projectRoot}/docs/prd/
```

Ralph loads all `.json` files from this directory.

## File Structure

```json
{
  "metadata": {
    "version": "1.0",
    "created_at": "2024-01-15",
    "updated_at": "2024-01-20",
    "provider": {
      "provider": "claude",
      "model": "opus"
    }
  },
  "items": [
    {
      "id": "unique-task-id",
      "name": "Short task name",
      "description": "Detailed task description",
      "priority": "high",
      "status": "pending",
      "acceptance_criteria": ["Criterion 1", "Criterion 2"],
      "judges": [
        { "persona": "QA Engineer" }
      ]
    }
  ]
}
```

## Metadata Section

Optional metadata about the PRD file:

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | PRD format version |
| `created_at` | string | Creation date (ISO 8601) |
| `updated_at` | string | Last update date (ISO 8601) |
| `provider` | object | Default provider for all tasks |

### Provider Configuration

```json
{
  "provider": {
    "provider": "gemini",
    "model": "flash",
    "mode": "agent"
  }
}
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `provider` | string | `claude`, `gemini`, `cursor` | AI provider |
| `model` | string | varies | Provider-specific model |
| `mode` | string | `agent`, `plan`, `ask` | Cursor mode only |

## Task Items

Each item in the `items` array represents a task:

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (used in dependencies, commits) |
| `description` | string | Full task description |
| `priority` | string | `high`, `medium`, or `low` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Short display name |
| `status` | string | `pending`, `in_progress`, `completed` |
| `passes` | boolean | Alternative completion marker |
| `category` | string | Task category for filtering |
| `dependencies` | string[] | IDs of tasks that must complete first |
| `acceptance_criteria` | string[] | Success criteria |
| `steps` | string[] | Alternative to acceptance_criteria |
| `notes` | string | Additional notes or context |
| `estimated_hours` | number | Time estimate |
| `evidence_path` | string | Path to evidence screenshot |
| `validation_results` | object | Results from validation gates |
| `judges` | object[] | LLM judge configuration |
| `judge_results` | object | Results from LLM judges |
| `provider` | object | Task-level provider override |
| `completed_at` | string | Completion timestamp |

## Priority Levels

Tasks are processed in priority order:

1. **high** - Critical tasks, processed first
2. **medium** - Important tasks
3. **low** - Nice-to-have tasks, processed last

## Status Values

| Status | Description |
|--------|-------------|
| `pending` | Not yet started (default) |
| `in_progress` | Currently being worked on |
| `completed` | Finished successfully |

The `passes` field can be used as an alternative:
- `passes: false` - Task is pending
- `passes: true` - Task is completed

## Dependencies

Tasks can depend on other tasks:

```json
{
  "id": "task-2",
  "description": "Build on task-1",
  "dependencies": ["task-1"],
  "priority": "high"
}
```

Ralph will skip tasks whose dependencies are not yet completed.

## Acceptance Criteria

Define success criteria for a task:

```json
{
  "id": "auth-feature",
  "description": "Implement user authentication",
  "acceptance_criteria": [
    "POST /api/auth/login accepts email and password",
    "Returns JWT token on success",
    "Invalid credentials return 401",
    "Token expires after 24 hours"
  ]
}
```

The `steps` field is an alias for `acceptance_criteria`:

```json
{
  "steps": [
    "Step 1: Create the database schema",
    "Step 2: Implement the API endpoint",
    "Step 3: Add validation"
  ]
}
```

## LLM Judges

Configure AI-powered code review:

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
      "model": "opus"
    },
    {
      "persona": "UX Designer",
      "requireEvidence": true,
      "required": false
    }
  ]
}
```

### Judge Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `persona` | string | required | Judge persona name |
| `criteria` | string[] | - | Specific evaluation criteria |
| `model` | string | `sonnet` | Model for evaluation |
| `requireEvidence` | boolean | `false` | Whether screenshot evidence is required |
| `required` | boolean | `true` | Must pass for task completion |
| `weight` | number | `1.0` | Weight for aggregated scoring |

### Available Personas

- **QA Engineer** - Test coverage, edge cases, error handling
- **Security Auditor** - OWASP, input validation, authentication
- **UX Designer** - Accessibility, usability, consistency
- **Performance Engineer** - Memory usage, N+1 queries, bundle size
- **Architect** - Code structure, patterns, maintainability

## Provider Override

Override the AI provider at task level:

```json
{
  "id": "complex-task",
  "description": "Requires advanced reasoning",
  "provider": {
    "provider": "claude",
    "model": "opus"
  }
}
```

Priority: Task > File metadata > CLI

## Validation Results

Ralph stores validation results after each attempt:

```json
{
  "validation_results": {
    "passed": false,
    "failed_gates": ["frontend:test", "backend:lint"],
    "attempts": 2,
    "gates": [
      {
        "package": "frontend",
        "gate": "test",
        "passed": false,
        "duration": 15000,
        "error_summary": "3 tests failed"
      }
    ]
  }
}
```

## Examples

### Simple Task

```json
{
  "items": [
    {
      "id": "fix-typo",
      "description": "Fix typo in README.md line 42",
      "priority": "low"
    }
  ]
}
```

### Complex Feature

```json
{
  "metadata": {
    "version": "1.0",
    "provider": { "provider": "claude", "model": "opus" }
  },
  "items": [
    {
      "id": "auth-feature",
      "name": "User Authentication",
      "description": "Implement JWT-based authentication with login, logout, and token refresh",
      "priority": "high",
      "acceptance_criteria": [
        "POST /api/auth/login accepts email/password",
        "POST /api/auth/logout invalidates token",
        "POST /api/auth/refresh extends session",
        "Middleware validates JWT on protected routes"
      ],
      "judges": [
        {
          "persona": "Security Auditor",
          "criteria": [
            "Passwords hashed with bcrypt",
            "JWT secret from environment",
            "No sensitive data in token payload"
          ],
          "required": true
        },
        {
          "persona": "QA Engineer",
          "criteria": ["Unit tests for all endpoints"],
          "required": true
        }
      ]
    }
  ]
}
```

### Multi-Task PRD with Dependencies

```json
{
  "items": [
    {
      "id": "db-schema",
      "name": "Database Schema",
      "description": "Create Prisma schema for user management",
      "priority": "high"
    },
    {
      "id": "user-model",
      "name": "User Model",
      "description": "Implement User model with validation",
      "priority": "high",
      "dependencies": ["db-schema"]
    },
    {
      "id": "user-api",
      "name": "User API",
      "description": "Create CRUD endpoints for users",
      "priority": "medium",
      "dependencies": ["user-model"]
    }
  ]
}
```

### Cost-Optimized PRD

```json
{
  "metadata": {
    "provider": {
      "provider": "gemini",
      "model": "flash"
    }
  },
  "items": [
    {
      "id": "simple-task",
      "description": "Simple code formatting fix",
      "priority": "low"
    },
    {
      "id": "complex-task",
      "description": "Complex architectural refactor",
      "priority": "high",
      "provider": {
        "provider": "claude",
        "model": "opus"
      }
    }
  ]
}
```

## File Naming

PRD files are categorized by filename:

```
docs/prd/
├── auth.json          # category: "auth"
├── dashboard.json     # category: "dashboard"
├── mobile.json        # category: "mobile"
└── refactoring.json   # category: "refactoring"
```

Use `--category` to filter by category:

```bash
ralph run 10 --category auth
```

## Alternative Formats

Ralph supports both object and array formats:

### Object Format (Recommended)

```json
{
  "metadata": { ... },
  "items": [ ... ]
}
```

### Array Format (Legacy)

```json
[
  { "id": "task-1", ... },
  { "id": "task-2", ... }
]
```

## Best Practices

1. **Unique IDs** - Use descriptive, unique IDs (e.g., `auth-login-endpoint`)
2. **Clear Descriptions** - Write detailed descriptions for complex tasks
3. **Acceptance Criteria** - Define measurable success criteria
4. **Appropriate Priority** - Reserve "high" for critical tasks
5. **Use Dependencies** - Break large features into dependent tasks
6. **Configure Judges** - Add judges for quality-critical tasks
7. **Provider Matching** - Use opus for complex tasks, sonnet/flash for simple ones
