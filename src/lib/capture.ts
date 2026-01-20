import { execa } from 'execa';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

export interface CaptureOptions {
  captureScript: string;
  uploadScript: string;
  projectRoot: string;
}

export class Capturer {
  private captureScript: string;
  private uploadScript: string;
  private projectRoot: string;

  constructor(options: CaptureOptions) {
    this.captureScript = options.captureScript;
    this.uploadScript = options.uploadScript;
    this.projectRoot = options.projectRoot;
  }

  private get hasCapture(): boolean {
    return existsSync(this.captureScript);
  }

  private get hasUpload(): boolean {
    return existsSync(this.uploadScript);
  }

  /**
   * Find the most recent evidence screenshot (created by Claude or Playwright)
   * Only returns Playwright/browser screenshots, not desktop captures
   * @param taskId Optional task ID to look for task-specific evidence
   */
  async captureAppScreenshot(taskId?: string): Promise<string | null> {
    const evidenceDir = join(this.projectRoot, 'frontend/test-results/evidence');
    const testResultsDir = join(this.projectRoot, 'frontend/test-results');

    // If taskId provided, first look for task-specific screenshot
    if (taskId) {
      try {
        const { stdout } = await execa('find', [
          evidenceDir, '-name', `${taskId}*.png`, '-type', 'f'
        ], { reject: false });

        const files = stdout.trim().split('\n').filter(f => f);
        if (files.length > 0) {
          logger.success(`Found task evidence: ${files[0]}`);
          return files[0];
        }
      } catch {
        // Continue to general search
      }
    }

    // Look for recent screenshots, sorted by modification time (newest first)
    try {
      const { stdout } = await execa('find', [
        evidenceDir, '-name', '*.png', '-type', 'f', '-mmin', '-10',
        '-exec', 'stat', '-f', '%m %N', '{}', ';'
      ], { reject: false });

      const files = stdout.trim().split('\n')
        .filter(f => f)
        .map(line => {
          const [mtime, ...pathParts] = line.split(' ');
          return { mtime: parseInt(mtime, 10), path: pathParts.join(' ') };
        })
        .sort((a, b) => b.mtime - a.mtime)
        .map(f => f.path);

      if (files.length > 0) {
        logger.success(`Found evidence screenshot: ${files[0]}`);
        return files[0];
      }
    } catch {
      // Evidence dir might not exist yet, try simple find
      try {
        const { stdout } = await execa('find', [
          evidenceDir, '-name', '*.png', '-type', 'f', '-mmin', '-10'
        ], { reject: false });

        const files = stdout.trim().split('\n').filter(f => f);
        if (files.length > 0) {
          logger.success(`Found evidence screenshot: ${files[0]}`);
          return files[0];
        }
      } catch {
        // Evidence dir might not exist
      }
    }

    // Also check test-results for any Playwright screenshots (sorted by mtime)
    try {
      const { stdout } = await execa('find', [
        testResultsDir, '-name', '*.png', '-type', 'f', '-mmin', '-10',
        '-exec', 'stat', '-f', '%m %N', '{}', ';'
      ], { reject: false });

      const files = stdout.trim().split('\n')
        .filter(f => f)
        .map(line => {
          const [mtime, ...pathParts] = line.split(' ');
          return { mtime: parseInt(mtime, 10), path: pathParts.join(' ') };
        })
        .sort((a, b) => b.mtime - a.mtime)
        .map(f => f.path);

      if (files.length > 0) {
        logger.success(`Found Playwright screenshot: ${files[0]}`);
        return files[0];
      }
    } catch {
      // Try simple find as fallback
      try {
        const { stdout } = await execa('find', [
          testResultsDir, '-name', '*.png', '-type', 'f', '-mmin', '-10'
        ], { reject: false });

        const files = stdout.trim().split('\n').filter(f => f);
        if (files.length > 0) {
          logger.success(`Found Playwright screenshot: ${files[0]}`);
          return files[0];
        }
      } catch {
        // test-results might not exist
      }
    }

    logger.info('No Playwright screenshots found');
    return null;
  }

  /**
   * Capture a desktop screenshot
   */
  async captureDesktopScreenshot(): Promise<string | null> {
    if (!this.hasCapture) {
      logger.warning('Capture script not found');
      return null;
    }

    try {
      const result = await execa(this.captureScript, ['screenshot'], {
        reject: false,
      });

      const filepath = result.stdout.trim();
      if (filepath && existsSync(filepath)) {
        logger.success(`Captured desktop screenshot: ${filepath}`);
        return filepath;
      }
    } catch (error) {
      logger.error('Failed to capture screenshot:', error);
    }

    return null;
  }

  /**
   * Find recent Playwright video recordings
   * Only returns Playwright videos, not screen recordings
   * @param taskId Optional task ID to look for task-specific evidence
   */
  async captureAppVideo(taskId?: string): Promise<string | null> {
    const testResultsDir = join(this.projectRoot, 'frontend/test-results');

    // If taskId provided, first look for task-specific video
    if (taskId) {
      try {
        const { stdout } = await execa('find', [
          testResultsDir, '-name', `${taskId}*.webm`, '-type', 'f'
        ], { reject: false });

        const files = stdout.trim().split('\n').filter(f => f);
        if (files.length > 0) {
          logger.success(`Found task video: ${files[0]}`);
          return files[0];
        }
      } catch {
        // Continue to general search
      }
    }

    // Look for recent video files created by Playwright (sorted by mtime)
    try {
      const { stdout } = await execa('find', [
        testResultsDir, '-name', '*.webm', '-type', 'f', '-mmin', '-10',
        '-exec', 'stat', '-f', '%m %N', '{}', ';'
      ], { reject: false });

      const files = stdout.trim().split('\n')
        .filter(f => f)
        .map(line => {
          const [mtime, ...pathParts] = line.split(' ');
          return { mtime: parseInt(mtime, 10), path: pathParts.join(' ') };
        })
        .sort((a, b) => b.mtime - a.mtime)
        .map(f => f.path);

      if (files.length > 0) {
        logger.success(`Found Playwright video: ${files[0]}`);
        return files[0];
      }
    } catch {
      // Try simple find as fallback
      try {
        const { stdout } = await execa('find', [
          testResultsDir, '-name', '*.webm', '-type', 'f', '-mmin', '-10'
        ], { reject: false });

        const files = stdout.trim().split('\n').filter(f => f);
        if (files.length > 0) {
          logger.success(`Found Playwright video: ${files[0]}`);
          return files[0];
        }
      } catch {
        // test-results might not exist
      }
    }

    logger.info('No Playwright videos found');
    return null;
  }

  /**
   * Capture a screen video
   */
  async captureScreenVideo(duration: number = 10): Promise<string | null> {
    if (!this.hasCapture) {
      logger.warning('Capture script not found');
      return null;
    }

    try {
      logger.info(`Capturing screen video (${duration}s)...`);
      const result = await execa(this.captureScript, ['video', String(duration)], {
        timeout: (duration + 10) * 1000,
        reject: false,
      });

      const filepath = result.stdout.trim();
      if (filepath && existsSync(filepath)) {
        logger.success(`Captured screen video: ${filepath}`);
        return filepath;
      }
    } catch (error) {
      logger.error('Failed to capture video:', error);
    }

    return null;
  }

  /**
   * Upload a file to MinIO
   */
  async upload(filepath: string, folder: string = 'ralph'): Promise<string | null> {
    if (!this.hasUpload) {
      logger.warning('Upload script not found');
      return null;
    }

    if (!existsSync(filepath)) {
      logger.error(`File not found: ${filepath}`);
      return null;
    }

    try {
      logger.info(`Uploading to MinIO: ${filepath}`);
      const result = await execa(this.uploadScript, [filepath, '--folder', folder], {
        reject: false,
      });

      const url = result.stdout.trim();
      if (url && url.startsWith('http')) {
        logger.success(`Uploaded: ${url}`);
        return url;
      }
    } catch (error) {
      logger.error('Failed to upload:', error);
    }

    return null;
  }

  /**
   * Capture ASCII terminal recording
   */
  async captureAscii(command: string, name: string): Promise<string | null> {
    if (!this.hasCapture) {
      logger.warning('Capture script not found');
      return null;
    }

    try {
      logger.info(`Recording ASCII: ${command}`);
      const result = await execa(this.captureScript, ['ascii', command, name], {
        timeout: 120000,
        reject: false,
      });

      const filepath = result.stdout.trim();
      if (filepath && existsSync(filepath)) {
        logger.success(`ASCII recording: ${filepath}`);
        return filepath;
      }
    } catch (error) {
      logger.error('Failed to capture ASCII:', error);
    }

    return null;
  }
}
