/**
 * Validation module exports
 */

// Types
export type {
  GateType,
  Package,
  GateResult,
  ValidationResult,
  ValidationConfig,
  CustomValidation,
} from './validation.types.js';

export {
  DEFAULT_VALIDATION_CONFIG,
  GATE_COMMANDS,
  PACKAGE_DIRS,
  PATH_TO_PACKAGE,
} from './validation.types.js';

// Package detection
export {
  getChangedFiles,
  detectPackagesFromFiles,
  detectPackageFromCategory,
  getAffectedPackages,
  getChangesSummary,
} from './package-detector.js';

// Gate runner
export {
  runGate,
  runCustomValidation,
  parseCustomValidations,
} from './gate-runner.js';

// Validator
export type { ValidatorOptions } from './validator.js';
export {
  Validator,
  runValidation,
  shouldMarkComplete,
  getRetryMessage,
} from './validator.js';

// Result formatting
export {
  formatValidationResultsForConsole,
  formatValidationResultsForDiscord,
  formatValidationResultsAsFields,
  formatValidationForStatus,
  formatValidationCompact,
  extractValidationMetrics,
} from './result-formatter.js';
