import { describe, it, expect } from 'vitest';
import { detectPackagesFromFiles, detectPackageFromCategory } from './package-detector.js';

describe('package-detector', () => {
  describe('detectPackagesFromFiles', () => {
    it('should detect frontend package from frontend files', () => {
      const files = [
        'frontend/src/components/Button.tsx',
        'frontend/src/pages/Home.tsx',
      ];
      const packages = detectPackagesFromFiles(files);
      expect(packages).toEqual(['frontend']);
    });

    it('should detect backend package from backend files', () => {
      const files = [
        'backend/src/routes/auth.ts',
        'backend/prisma/schema.prisma',
      ];
      const packages = detectPackagesFromFiles(files);
      expect(packages).toEqual(['backend']);
    });

    it('should detect multiple packages from mixed files', () => {
      const files = [
        'frontend/src/components/Button.tsx',
        'backend/src/routes/auth.ts',
        'electron/src/main/index.ts',
      ];
      const packages = detectPackagesFromFiles(files);
      expect(packages).toContain('frontend');
      expect(packages).toContain('backend');
      expect(packages).toContain('electron');
      expect(packages).toHaveLength(3);
    });

    it('should return empty array for root files', () => {
      const files = ['README.md', 'package.json'];
      const packages = detectPackagesFromFiles(files);
      expect(packages).toEqual([]);
    });

    it('should detect mobile package', () => {
      const files = ['mobile/App.tsx'];
      const packages = detectPackagesFromFiles(files);
      expect(packages).toEqual(['mobile']);
    });

    it('should detect chrome-extension package', () => {
      const files = ['chrome-extension/manifest.json'];
      const packages = detectPackagesFromFiles(files);
      expect(packages).toEqual(['chrome-extension']);
    });

    it('should handle empty file list', () => {
      const packages = detectPackagesFromFiles([]);
      expect(packages).toEqual([]);
    });

    it('should deduplicate packages', () => {
      const files = [
        'frontend/src/components/A.tsx',
        'frontend/src/components/B.tsx',
        'frontend/src/components/C.tsx',
      ];
      const packages = detectPackagesFromFiles(files);
      expect(packages).toEqual(['frontend']);
    });
  });

  describe('detectPackageFromCategory', () => {
    it('should detect frontend from UI categories', () => {
      expect(detectPackageFromCategory('frontend-components')).toBe('frontend');
      expect(detectPackageFromCategory('ui-improvements')).toBe('frontend');
      expect(detectPackageFromCategory('calendar-features')).toBe('frontend');
    });

    it('should detect backend from API categories', () => {
      expect(detectPackageFromCategory('backend-api')).toBe('backend');
      expect(detectPackageFromCategory('api-endpoints')).toBe('backend');
      expect(detectPackageFromCategory('server-config')).toBe('backend');
    });

    it('should detect electron from desktop categories', () => {
      expect(detectPackageFromCategory('electron-features')).toBe('electron');
      expect(detectPackageFromCategory('desktop-app')).toBe('electron');
    });

    it('should detect mobile from app categories', () => {
      expect(detectPackageFromCategory('mobile-features')).toBe('mobile');
    });

    it('should detect chrome-extension from extension categories', () => {
      expect(detectPackageFromCategory('chrome-extension-popup')).toBe('chrome-extension');
      expect(detectPackageFromCategory('browser-extension')).toBe('chrome-extension');
    });

    it('should return null for unknown categories', () => {
      expect(detectPackageFromCategory('unknown-category')).toBeNull();
      expect(detectPackageFromCategory('docs')).toBeNull();
    });

    it('should be case-insensitive', () => {
      expect(detectPackageFromCategory('FRONTEND')).toBe('frontend');
      expect(detectPackageFromCategory('Backend')).toBe('backend');
    });
  });
});
