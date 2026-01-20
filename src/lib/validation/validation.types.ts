/**
 * Validation types for Ralph validation gates
 */

export type GateType = 'oxlint' | 'build' | 'test' | 'lint' | 'custom';
export type Package = 'frontend' | 'backend' | 'electron' | 'mobile' | 'chrome-extension';

export interface GateResult {
  gate: GateType;
  package: Package;
  passed: boolean;
  duration: number;
  output?: string;
  error_summary?: string;
}

export interface ValidationResult {
  last_run: string;
  passed: boolean;
  failed_gates: string[];
  attempts: number;
  gates: GateResult[];
}

export interface ValidationConfig {
  gates: {
    oxlint: boolean;  // Fast Rust linter - runs first
    build: boolean;
    test: boolean;
    lint: boolean;   // ESLint - runs after oxlint
    custom: boolean;
  };
  timeout: number;      // ms per command
  failFast: boolean;    // stop on first failure
  packages?: Package[]; // explicit packages to validate (overrides detection)
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  gates: {
    oxlint: true,     // Run oxlint first (fast)
    build: true,
    test: true,
    lint: true,
    custom: true,
  },
  timeout: 120000,  // 2 minutes
  failFast: false,
};

export interface CustomValidation {
  name: string;
  command: string;
  package: Package;
}

/**
 * Commands for each gate type per package
 */
export const GATE_COMMANDS: Record<Package, Partial<Record<GateType, string>>> = {
  frontend: {
    oxlint: 'npm run lint:ox',  // Fast Rust linter
    build: 'npm run build',
    test: 'npm test -- --run',
    lint: 'npm run lint',       // ESLint
  },
  backend: {
    oxlint: 'npm run lint:ox',  // Fast Rust linter
    build: 'npm run build',
    test: 'npm test -- --run',
    lint: 'npm run lint',       // ESLint
  },
  electron: {
    oxlint: 'npm run lint:ox',  // Fast Rust linter
    build: 'npm run build:main',
    test: 'npm test -- --run',
  },
  mobile: {
    build: 'npx tsc --noEmit',
    test: 'npm test -- --run',
  },
  'chrome-extension': {
    build: 'npm run build',
  },
};

/**
 * Package directory mappings
 */
export const PACKAGE_DIRS: Record<Package, string> = {
  frontend: 'frontend',
  backend: 'backend',
  electron: 'electron',
  mobile: 'mobile',
  'chrome-extension': 'chrome-extension',
};

/**
 * File path patterns to package mapping
 */
export const PATH_TO_PACKAGE: Array<{ pattern: RegExp; package: Package }> = [
  { pattern: /^frontend\//, package: 'frontend' },
  { pattern: /^backend\//, package: 'backend' },
  { pattern: /^electron\//, package: 'electron' },
  { pattern: /^mobile\//, package: 'mobile' },
  { pattern: /^chrome-extension\//, package: 'chrome-extension' },
];
