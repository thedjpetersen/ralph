/**
 * Package detector - analyzes git diff to determine which packages need validation
 */

import { execa } from 'execa';
import { logger } from '../logger.js';
import { Package, PATH_TO_PACKAGE } from './validation.types.js';

/**
 * Get list of changed files from git
 */
export async function getChangedFiles(cwd: string): Promise<string[]> {
  try {
    // Get both staged and unstaged changes
    const { stdout: diffStaged } = await execa('git', ['diff', '--staged', '--name-only'], { cwd });
    const { stdout: diffUnstaged } = await execa('git', ['diff', '--name-only'], { cwd });
    const { stdout: untrackedOutput } = await execa('git', ['ls-files', '--others', '--exclude-standard'], { cwd });

    const files = new Set<string>();

    // Add all changed files
    for (const output of [diffStaged, diffUnstaged, untrackedOutput]) {
      for (const file of output.split('\n').filter(Boolean)) {
        files.add(file);
      }
    }

    return Array.from(files);
  } catch (error) {
    logger.error('Failed to get changed files from git:', error);
    return [];
  }
}

/**
 * Detect which packages have changes based on file paths
 */
export function detectPackagesFromFiles(files: string[]): Package[] {
  const packages = new Set<Package>();

  for (const file of files) {
    for (const { pattern, package: pkg } of PATH_TO_PACKAGE) {
      if (pattern.test(file)) {
        packages.add(pkg);
        break;
      }
    }
  }

  return Array.from(packages);
}

/**
 * Detect packages from PRD category
 */
export function detectPackageFromCategory(category: string): Package | null {
  const categoryLower = category.toLowerCase();

  if (categoryLower.includes('frontend') || categoryLower.includes('ui') || categoryLower.includes('calendar')) {
    return 'frontend';
  }
  if (categoryLower.includes('backend') || categoryLower.includes('api') || categoryLower.includes('server')) {
    return 'backend';
  }
  if (categoryLower.includes('electron') || categoryLower.includes('desktop')) {
    return 'electron';
  }
  if (categoryLower.includes('mobile') || categoryLower.includes('app')) {
    return 'mobile';
  }
  if (categoryLower.includes('chrome') || categoryLower.includes('extension')) {
    return 'chrome-extension';
  }

  return null;
}

/**
 * Get affected packages for validation
 * Priority: explicit config > git diff > PRD category
 */
export async function getAffectedPackages(
  cwd: string,
  options: {
    explicitPackages?: Package[];
    category?: string;
  } = {}
): Promise<Package[]> {
  // 1. Use explicit packages if provided
  if (options.explicitPackages && options.explicitPackages.length > 0) {
    logger.debug(`Using explicit packages: ${options.explicitPackages.join(', ')}`);
    return options.explicitPackages;
  }

  // 2. Detect from git diff
  const changedFiles = await getChangedFiles(cwd);
  const packagesFromGit = detectPackagesFromFiles(changedFiles);

  if (packagesFromGit.length > 0) {
    logger.debug(`Detected packages from git: ${packagesFromGit.join(', ')}`);
    return packagesFromGit;
  }

  // 3. Fallback to category-based detection
  if (options.category) {
    const categoryPackage = detectPackageFromCategory(options.category);
    if (categoryPackage) {
      logger.debug(`Detected package from category: ${categoryPackage}`);
      return [categoryPackage];
    }
  }

  // 4. Default to frontend if nothing detected
  logger.debug('No packages detected, defaulting to frontend');
  return ['frontend'];
}

/**
 * Get summary of what changed for logging
 */
export async function getChangesSummary(cwd: string): Promise<string> {
  const files = await getChangedFiles(cwd);
  const packages = detectPackagesFromFiles(files);

  return `${files.length} files changed in ${packages.length > 0 ? packages.join(', ') : 'no packages'}`;
}
