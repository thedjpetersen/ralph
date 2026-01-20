import { execa } from 'execa';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../lib/logger.js';
import { RalphConfig } from '../lib/config.js';
import { Notifier } from '../lib/notify.js';
import { Capturer } from '../lib/capture.js';

export interface EvidenceOptions {
  config: RalphConfig;
  packages: string[];
}

export async function evidenceCommand(options: EvidenceOptions): Promise<void> {
  const { config, packages } = options;
  const projectRoot = config.projectRoot;

  const notifier = new Notifier(config.notifyScript, config.notifyEnabled);
  const capturer = new Capturer({
    captureScript: config.captureScript,
    uploadScript: config.uploadScript,
    projectRoot,
  });

  logger.header('Evidence Capture');

  const allPackages = packages.length === 0 || packages.includes('all')
    ? ['frontend', 'backend', 'mobile', 'electron']
    : packages;

  for (const pkg of allPackages) {
    logger.info(`Capturing evidence for ${pkg}...`);

    switch (pkg) {
      case 'frontend':
        await captureFrontend(projectRoot, notifier, capturer);
        break;
      case 'backend':
        await captureBackend(projectRoot, notifier);
        break;
      case 'mobile':
        await captureMobile(projectRoot, notifier);
        break;
      case 'electron':
        await captureElectron(projectRoot, notifier);
        break;
      default:
        logger.warning(`Unknown package: ${pkg}`);
    }
  }

  logger.success('Evidence capture complete');
}

async function captureFrontend(
  projectRoot: string,
  notifier: Notifier,
  _capturer: Capturer
): Promise<void> {
  const frontendDir = join(projectRoot, 'frontend');
  const evidenceDir = join(frontendDir, 'test-results/evidence');

  if (!existsSync(frontendDir)) {
    logger.warning('Frontend directory not found');
    return;
  }

  try {
    // Run Playwright evidence tests
    logger.info('Running Playwright evidence capture...');
    await execa('npx', ['playwright', 'test', 'evidence-capture.spec.ts', '--reporter=list'], {
      cwd: frontendDir,
      timeout: 120000,
      reject: false,
    });

    // Send screenshots to Discord
    const screenshots = ['login-page.png', 'dashboard.png', 'timer-page.png', 'sessions-page.png'];
    for (const screenshot of screenshots) {
      const filepath = join(evidenceDir, screenshot);
      if (existsSync(filepath)) {
        const name = screenshot.replace('.png', '').replace(/-/g, ' ');
        await notifier.send({
          title: `Frontend: ${name}`,
          description: 'Playwright E2E capture',
          file: filepath,
          color: '0x3498DB',
          footer: 'clockzen-next/frontend',
        });
      }
    }

    logger.success('Frontend evidence captured');
  } catch (error) {
    logger.error('Frontend evidence capture failed:', error);
  }
}

async function captureBackend(projectRoot: string, notifier: Notifier): Promise<void> {
  const backendDir = join(projectRoot, 'backend');

  if (!existsSync(backendDir)) {
    logger.warning('Backend directory not found');
    return;
  }

  try {
    logger.info('Running backend tests...');
    const result = await execa('npm', ['run', 'test', '--', '--reporter=verbose'], {
      cwd: backendDir,
      timeout: 180000,
      reject: false,
    });

    // Parse test results
    const output = result.stdout;
    const passedMatch = output.match(/(\d+) passed/);
    const passed = passedMatch ? passedMatch[1] : '?';

    await notifier.send({
      title: 'Backend Evidence',
      description: `**Tests:** ${passed} passed\n**Framework:** Vitest`,
      color: result.exitCode === 0 ? '0x2ECC71' : '0xE74C3C',
      fields: [
        { name: 'Status', value: result.exitCode === 0 ? '✅ Pass' : '❌ Fail' },
      ],
      footer: 'clockzen-next/backend',
    });

    logger.success('Backend evidence captured');
  } catch (error) {
    logger.error('Backend evidence capture failed:', error);
  }
}

async function captureMobile(projectRoot: string, notifier: Notifier): Promise<void> {
  const mobileDir = join(projectRoot, 'mobile');

  if (!existsSync(mobileDir)) {
    logger.warning('Mobile directory not found');
    return;
  }

  try {
    logger.info('Running TypeScript check...');
    const result = await execa('npx', ['tsc', '--noEmit'], {
      cwd: mobileDir,
      timeout: 60000,
      reject: false,
    });

    await notifier.send({
      title: 'Mobile Evidence',
      description: '**Framework:** React Native + Expo Router',
      color: result.exitCode === 0 ? '0x2ECC71' : '0xFFA500',
      fields: [
        { name: 'TypeScript', value: result.exitCode === 0 ? '✅ Pass' : '⚠️ Warnings' },
        { name: 'Platform', value: 'iOS/Android' },
      ],
      footer: 'clockzen-next/mobile',
    });

    logger.success('Mobile evidence captured');
  } catch (error) {
    logger.error('Mobile evidence capture failed:', error);
  }
}

async function captureElectron(projectRoot: string, notifier: Notifier): Promise<void> {
  const electronDir = join(projectRoot, 'electron');

  if (!existsSync(electronDir)) {
    logger.warning('Electron directory not found');
    return;
  }

  try {
    logger.info('Running TypeScript check...');
    const result = await execa('npx', ['tsc', '--noEmit'], {
      cwd: electronDir,
      timeout: 60000,
      reject: false,
    });

    await notifier.send({
      title: 'Electron Evidence',
      description: '**Framework:** Electron + Playwright QA',
      color: result.exitCode === 0 ? '0x2ECC71' : '0xFFA500',
      fields: [
        { name: 'TypeScript', value: result.exitCode === 0 ? '✅ Pass' : '⚠️ Warnings' },
        { name: 'Platform', value: 'macOS/Windows/Linux' },
      ],
      footer: 'clockzen-next/electron',
    });

    logger.success('Electron evidence captured');
  } catch (error) {
    logger.error('Electron evidence capture failed:', error);
  }
}
