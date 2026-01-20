# Contributing to Ralph

Thank you for your interest in contributing to Ralph! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Python 3 (for hooks)
- One of the supported AI CLIs (Claude Code, Gemini, or Cursor)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/ralph.git
cd ralph

# Install dependencies
npm install

# Build
npm run build

# Run in development mode (with watch)
npm run dev

# Link globally for testing
npm link
```

### Project Structure

```
ralph/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/             # CLI commands
│   │   ├── run.ts            # Main autonomous loop
│   │   ├── status.ts         # PRD status
│   │   ├── resume.ts         # Session resume
│   │   ├── abort.ts          # Session abort
│   │   ├── sessions.ts       # Session management
│   │   └── evidence.ts       # Evidence capture
│   └── lib/                  # Core libraries
│       ├── providers.ts      # AI provider abstraction
│       ├── validation/       # Validation gates
│       │   ├── validator.ts
│       │   ├── gate-runner.ts
│       │   ├── package-detector.ts
│       │   ├── result-formatter.ts
│       │   └── validation.types.ts
│       ├── session.ts        # Session persistence
│       ├── judge.ts          # LLM judges
│       ├── prd.ts            # PRD management
│       ├── hooks.ts          # Claude Code hooks
│       ├── claude.ts         # Prompt building
│       ├── learnings.ts      # Knowledge accumulation
│       ├── config.ts         # Configuration
│       └── logger.ts         # Logging utilities
├── hooks/                    # Python hook scripts
│   ├── validate-stop.py
│   ├── post-edit-lint.py
│   └── auto-approve.py
├── docs/                     # Documentation
└── dist/                     # Compiled output
```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/lib/providers.test.ts
```

### Building

```bash
# Build for production
npm run build

# Watch mode for development
npm run watch

# Type check without emitting
npm run typecheck
```

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Code Guidelines

### TypeScript

- Use strict TypeScript settings
- Export types from module files
- Prefer interfaces over type aliases for object shapes
- Use type guards for runtime validation

```typescript
// Good: Type guard for runtime safety
export function isValidProvider(value: string): value is AIProvider {
  return ['claude', 'gemini', 'cursor'].includes(value);
}

// Good: Explicit interface
export interface ProviderResult {
  success: boolean;
  output: string;
  error?: string;
}
```

### Error Handling

- Use try/catch for async operations
- Return typed error results instead of throwing
- Log errors with context

```typescript
try {
  const result = await runProvider(provider, prompt, options);
  return { success: true, data: result };
} catch (error) {
  logger.error('Provider execution failed', { provider, error });
  return { success: false, error: String(error) };
}
```

### File Organization

- One module per file
- Co-locate tests with source (`file.ts` and `file.test.ts`)
- Export from index files for cleaner imports

### Commit Messages

Follow conventional commits:

```
feat: add Gemini provider support
fix: handle timeout in validation gate
docs: update provider configuration guide
test: add unit tests for session management
refactor: extract streaming logic to shared runner
```

## Adding Features

### Adding a New Provider

1. Add provider type to `config.ts`:
```typescript
export type AIProvider = 'claude' | 'gemini' | 'cursor' | 'newprovider';
```

2. Add provider config to `providers.ts`:
```typescript
const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  // ...existing providers
  newprovider: {
    command: 'newprovider-cli',
    displayName: 'New Provider',
    getModelDisplay: (opts) => opts.model || 'default',
    buildArgs: (prompt, options) => ['--prompt', prompt],
    parseEvent: (line, state) => {
      // Parse JSON events from the provider
    },
  },
};
```

3. Add CLI options in `index.ts`:
```typescript
.option('--newprovider-model <model>', 'New Provider model')
```

4. Add tests in `providers.test.ts`

### Adding a New Validation Gate

1. Add gate type to `validation.types.ts`:
```typescript
export type ValidationGate = 'oxlint' | 'build' | 'test' | 'lint' | 'newgate';
```

2. Add gate commands in `gate-runner.ts`:
```typescript
const GATE_COMMANDS: Record<Package, Record<ValidationGate, string>> = {
  frontend: {
    // ...existing gates
    newgate: 'npm run newgate',
  },
};
```

3. Update configuration in `config.ts`

### Adding a New Command

1. Create command file in `src/commands/`:
```typescript
// src/commands/mycommand.ts
import { Command } from 'commander';
import { logger } from '../lib/logger.js';

export function registerMyCommand(program: Command): void {
  program
    .command('mycommand')
    .description('Description of my command')
    .option('-o, --option <value>', 'Option description')
    .action(async (options) => {
      logger.info('Running my command');
      // Implementation
    });
}
```

2. Register in `index.ts`:
```typescript
import { registerMyCommand } from './commands/mycommand.js';
registerMyCommand(program);
```

## Testing Guidelines

### Unit Tests

- Test public API functions
- Mock external dependencies (fs, execa, etc.)
- Use descriptive test names

```typescript
describe('resolveProviderConfig', () => {
  it('should use CLI config when no PRD overrides', () => {
    const cliConfig = createCliConfig({ taskProvider: 'claude' });
    const prdFile = createPrdFile();
    const item = createPrdItem();

    const result = resolveProviderConfig(cliConfig, prdFile, item);

    expect(result.provider).toBe('claude');
  });

  it('should override with task-level provider (highest priority)', () => {
    // ...
  });
});
```

### Integration Tests

- Test command execution end-to-end
- Use temporary directories for file operations
- Clean up after tests

### Mocking

- Use Vitest's `vi.mock()` for module mocking
- Create helper functions for common mocks

```typescript
import { vi } from 'vitest';

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '', exitCode: 0 }),
}));
```

## Documentation

### Code Comments

- Use JSDoc for exported functions
- Explain "why" not "what"
- Keep comments up-to-date

```typescript
/**
 * Resolve effective provider config from PRD and CLI settings.
 * Priority: task-level > file-level > CLI-level
 *
 * @param cliConfig - Configuration from CLI flags
 * @param prdFile - PRD file with optional provider metadata
 * @param item - Task item with optional provider override
 */
export function resolveProviderConfig(
  cliConfig: ProviderConfig,
  prdFile: PrdFile,
  item: PrdItem
): ResolvedProviderConfig {
```

### Documentation Updates

When adding features, update:
- README.md (if user-facing)
- Relevant docs/ file
- Inline code comments

## Pull Request Process

1. **Fork and Branch**
   - Fork the repository
   - Create a feature branch: `git checkout -b feat/my-feature`

2. **Develop**
   - Write code following guidelines
   - Add tests
   - Update documentation

3. **Test**
   - Run all tests: `npm test`
   - Run linting: `npm run lint`
   - Build: `npm run build`

4. **Submit**
   - Push to your fork
   - Create pull request with clear description
   - Reference any related issues

5. **Review**
   - Address review feedback
   - Keep commits clean (squash if needed)

## Reporting Issues

### Bug Reports

Include:
- Ralph version
- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs/output

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternatives considered

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

- Open an issue for general questions
- Check existing issues/PRs for similar topics
- Review the documentation first
