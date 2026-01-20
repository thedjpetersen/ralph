import { describe, it, expect } from 'vitest';
import {
  isValidProvider,
  isValidClaudeModel,
  isValidGeminiModel,
  isValidCursorMode,
  getProviderDisplayName,
  resolveProviderConfig,
  AIProvider,
} from './providers.js';
import type { ProviderConfig } from './config.js';
import type { PrdFile, PrdItem } from './prd.js';

describe('providers', () => {
  describe('validation helpers', () => {
    describe('isValidProvider', () => {
      it('should return true for valid providers', () => {
        expect(isValidProvider('claude')).toBe(true);
        expect(isValidProvider('gemini')).toBe(true);
        expect(isValidProvider('cursor')).toBe(true);
      });

      it('should return false for invalid providers', () => {
        expect(isValidProvider('openai')).toBe(false);
        expect(isValidProvider('')).toBe(false);
        expect(isValidProvider('Claude')).toBe(false); // case-sensitive
      });
    });

    describe('isValidClaudeModel', () => {
      it('should return true for valid Claude models', () => {
        expect(isValidClaudeModel('opus')).toBe(true);
        expect(isValidClaudeModel('sonnet')).toBe(true);
      });

      it('should return false for invalid Claude models', () => {
        expect(isValidClaudeModel('haiku')).toBe(false);
        expect(isValidClaudeModel('gpt-4')).toBe(false);
        expect(isValidClaudeModel('')).toBe(false);
      });
    });

    describe('isValidGeminiModel', () => {
      it('should return true for valid Gemini models', () => {
        expect(isValidGeminiModel('pro')).toBe(true);
        expect(isValidGeminiModel('flash')).toBe(true);
      });

      it('should return false for invalid Gemini models', () => {
        expect(isValidGeminiModel('ultra')).toBe(false);
        expect(isValidGeminiModel('nano')).toBe(false);
        expect(isValidGeminiModel('')).toBe(false);
      });
    });

    describe('isValidCursorMode', () => {
      it('should return true for valid Cursor modes', () => {
        expect(isValidCursorMode('agent')).toBe(true);
        expect(isValidCursorMode('plan')).toBe(true);
        expect(isValidCursorMode('ask')).toBe(true);
      });

      it('should return false for invalid Cursor modes', () => {
        expect(isValidCursorMode('chat')).toBe(false);
        expect(isValidCursorMode('')).toBe(false);
      });
    });
  });

  describe('getProviderDisplayName', () => {
    it('should return correct display names', () => {
      expect(getProviderDisplayName('claude')).toBe('Claude Code');
      expect(getProviderDisplayName('gemini')).toBe('Gemini CLI');
      expect(getProviderDisplayName('cursor')).toBe('Cursor Agent');
    });
  });

  describe('resolveProviderConfig', () => {
    const createCliConfig = (overrides: Partial<ProviderConfig> = {}): ProviderConfig => ({
      taskProvider: 'claude',
      validationProvider: undefined,
      claudeModel: 'sonnet',
      geminiModel: 'pro',
      cursorModel: 'claude-3-5-sonnet',
      cursorMode: 'agent',
      ...overrides,
    });

    const createPrdFile = (provider?: { provider?: AIProvider; model?: string; mode?: 'agent' | 'plan' | 'ask' }): PrdFile => ({
      filename: 'test.json',
      filepath: '/test/prd/test.json',
      category: 'test',
      items: [],
      metadata: provider ? { provider } : undefined,
    });

    const createPrdItem = (provider?: { provider?: AIProvider; model?: string; mode?: 'agent' | 'plan' | 'ask' }): PrdItem => ({
      id: 'task-1',
      description: 'Test task',
      priority: 'high',
      provider,
    });

    it('should use CLI config when no PRD overrides', () => {
      const cliConfig = createCliConfig({ taskProvider: 'claude', claudeModel: 'opus' });
      const prdFile = createPrdFile();
      const item = createPrdItem();

      const result = resolveProviderConfig(cliConfig, prdFile, item);

      expect(result.provider).toBe('claude');
      expect(result.claudeModel).toBe('opus');
    });

    it('should override with file-level provider', () => {
      const cliConfig = createCliConfig({ taskProvider: 'claude' });
      const prdFile = createPrdFile({ provider: 'gemini', model: 'flash' });
      const item = createPrdItem();

      const result = resolveProviderConfig(cliConfig, prdFile, item);

      expect(result.provider).toBe('gemini');
      expect(result.geminiModel).toBe('flash');
    });

    it('should override with task-level provider (highest priority)', () => {
      const cliConfig = createCliConfig({ taskProvider: 'claude' });
      const prdFile = createPrdFile({ provider: 'gemini' });
      const item = createPrdItem({ provider: 'cursor', model: 'gpt-4', mode: 'plan' });

      const result = resolveProviderConfig(cliConfig, prdFile, item);

      expect(result.provider).toBe('cursor');
      expect(result.cursorModel).toBe('gpt-4');
      expect(result.cursorMode).toBe('plan');
    });

    it('should apply model override for correct provider', () => {
      const cliConfig = createCliConfig({ taskProvider: 'claude', claudeModel: 'sonnet' });
      const prdFile = createPrdFile();
      const item = createPrdItem({ model: 'opus' }); // No provider specified, uses CLI provider

      const result = resolveProviderConfig(cliConfig, prdFile, item);

      expect(result.provider).toBe('claude');
      expect(result.claudeModel).toBe('opus');
    });

    it('should ignore invalid provider values', () => {
      const cliConfig = createCliConfig({ taskProvider: 'claude' });
      const prdFile = createPrdFile();
      // @ts-expect-error - testing invalid input
      const item = createPrdItem({ provider: 'invalid-provider' });

      const result = resolveProviderConfig(cliConfig, prdFile, item);

      expect(result.provider).toBe('claude'); // Falls back to CLI config
    });

    it('should ignore invalid model values for Claude', () => {
      const cliConfig = createCliConfig({ taskProvider: 'claude', claudeModel: 'sonnet' });
      const prdFile = createPrdFile();
      const item = createPrdItem({ model: 'invalid-model' });

      const result = resolveProviderConfig(cliConfig, prdFile, item);

      expect(result.claudeModel).toBe('sonnet'); // Falls back to CLI config
    });

    it('should ignore invalid model values for Gemini', () => {
      const cliConfig = createCliConfig({ taskProvider: 'gemini', geminiModel: 'pro' });
      const prdFile = createPrdFile();
      const item = createPrdItem({ model: 'invalid-model' });

      const result = resolveProviderConfig(cliConfig, prdFile, item);

      expect(result.geminiModel).toBe('pro'); // Falls back to CLI config
    });

    it('should allow any model value for Cursor', () => {
      const cliConfig = createCliConfig({ taskProvider: 'cursor', cursorModel: 'default' });
      const prdFile = createPrdFile();
      const item = createPrdItem({ model: 'any-custom-model' });

      const result = resolveProviderConfig(cliConfig, prdFile, item);

      expect(result.cursorModel).toBe('any-custom-model'); // Cursor accepts any model
    });

    it('should ignore mode for non-cursor providers', () => {
      const cliConfig = createCliConfig({ taskProvider: 'claude', cursorMode: 'agent' });
      const prdFile = createPrdFile();
      const item = createPrdItem({ mode: 'plan' });

      const result = resolveProviderConfig(cliConfig, prdFile, item);

      expect(result.cursorMode).toBe('agent'); // Mode only applies to cursor
    });

    it('should apply mode for cursor provider', () => {
      const cliConfig = createCliConfig({ taskProvider: 'cursor', cursorMode: 'agent' });
      const prdFile = createPrdFile();
      const item = createPrdItem({ mode: 'ask' });

      const result = resolveProviderConfig(cliConfig, prdFile, item);

      expect(result.cursorMode).toBe('ask');
    });

    it('should chain overrides correctly (CLI -> file -> task)', () => {
      const cliConfig = createCliConfig({
        taskProvider: 'claude',
        claudeModel: 'sonnet',
        geminiModel: 'pro',
      });
      const prdFile = createPrdFile({ provider: 'gemini' }); // Override provider
      const item = createPrdItem({ model: 'flash' }); // Override model for current provider (gemini)

      const result = resolveProviderConfig(cliConfig, prdFile, item);

      expect(result.provider).toBe('gemini');
      expect(result.geminiModel).toBe('flash');
      expect(result.claudeModel).toBe('sonnet'); // Unchanged
    });
  });
});
