import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { Switch } from '../components/ui/Switch';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { KeyboardShortcutsViewer } from '../components/ui/KeyboardShortcutsViewer';
import { StreakSettings } from '../components/StreakSettings';
import {
  useAppSettingsStore,
  type SettingsSection,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_AI_SETTINGS,
  DEFAULT_APPEARANCE_SETTINGS,
} from '../stores/appSettings';
import { useUserStore } from '../stores/user';
import { useSmartTypographyStore } from '../stores/smartTypography';
import { useParagraphFocusStore } from '../stores/paragraphFocus';
import { useTypewriterScrollStore } from '../stores/typewriterScroll';
import { useKeyboardShortcutsStore } from '../stores/keyboardShortcuts';
import { useImageUpload } from '../hooks/useImageUpload';
import { SettingsFormSkeleton } from '../components/skeletons';
import './OrganizedSettings.css';

// Section navigation items
const SECTIONS: { id: SettingsSection; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'editor', label: 'Editor', icon: 'edit' },
  { id: 'ai', label: 'AI', icon: 'sparkles' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'goals', label: 'Writing Goals', icon: 'fire' },
  { id: 'account', label: 'Account', icon: 'user' },
];

// Icon component for section icons
function SectionIcon({ name }: { name: string }) {
  switch (name) {
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'edit':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
          <path d="M19 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
          <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" />
        </svg>
      );
    case 'palette':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="13.5" cy="6.5" r="2" />
          <circle cx="17.5" cy="10.5" r="2" />
          <circle cx="8.5" cy="7.5" r="2" />
          <circle cx="6.5" cy="12.5" r="2" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
        </svg>
      );
    case 'user':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'fire':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C8.5 6 4 9 4 14a8 8 0 0 0 16 0c0-5-4.5-8-8-12z" />
          <path d="M12 20c-2.21 0-4-1.79-4-4 0-2.5 2-4 4-6 2 2 4 3.5 4 6 0 2.21-1.79 4-4 4z" />
        </svg>
      );
    default:
      return null;
  }
}

// General Settings Section
function GeneralSection() {
  const settings = useAppSettingsStore((state) => state.settings.general);
  const updateGeneralSettings = useAppSettingsStore((state) => state.updateGeneralSettings);
  const resetToDefaults = useAppSettingsStore((state) => state.resetToDefaults);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const openShortcutsModal = useKeyboardShortcutsStore((state) => state.openModal);

  const handleReset = useCallback(() => {
    resetToDefaults('general');
    setShowResetConfirm(false);
  }, [resetToDefaults]);

  return (
    <div className="settings-section-content">
      <div className="section-header">
        <h2>General Settings</h2>
        <p>Configure general application behavior</p>
      </div>

      <div className="settings-group">
        <h3>Keyboard Shortcuts</h3>
        <div className="setting-item shortcuts-link">
          <div className="setting-info">
            <span className="setting-label">View all keyboard shortcuts</span>
            <span className="setting-description">
              See a complete list of available keyboard shortcuts organized by category
            </span>
          </div>
          <Button variant="secondary" onClick={openShortcutsModal}>
            View Shortcuts
          </Button>
        </div>
      </div>

      <div className="settings-group">
        <h3>Auto-Save</h3>
        <div className="setting-item">
          <Switch
            label="Enable auto-save"
            description="Automatically save your work as you type"
            checked={settings.autoSave}
            onChange={(e) => updateGeneralSettings({ autoSave: e.target.checked })}
          />
        </div>
        {settings.autoSave && (
          <div className="setting-item">
            <label className="setting-label">
              Auto-save interval
              <span className="setting-description">How often to save (in seconds)</span>
            </label>
            <select
              className="setting-select"
              value={settings.autoSaveInterval}
              onChange={(e) => updateGeneralSettings({ autoSaveInterval: Number(e.target.value) })}
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
            </select>
          </div>
        )}
      </div>

      <div className="settings-group">
        <h3>Startup</h3>
        <div className="setting-item">
          <label className="setting-label">
            Start page
            <span className="setting-description">Which page to show when you open the app</span>
          </label>
          <select
            className="setting-select"
            value={settings.startPage}
            onChange={(e) =>
              updateGeneralSettings({
                startPage: e.target.value as 'dashboard' | 'documents' | 'lastOpened',
              })
            }
          >
            <option value="dashboard">Dashboard</option>
            <option value="documents">Documents</option>
            <option value="lastOpened">Last opened document</option>
          </select>
        </div>
      </div>

      <div className="settings-group">
        <h3>Navigation</h3>
        <div className="setting-item">
          <Switch
            label="Confirm on exit"
            description="Show a confirmation dialog when leaving with unsaved changes"
            checked={settings.confirmOnExit}
            onChange={(e) => updateGeneralSettings({ confirmOnExit: e.target.checked })}
          />
        </div>
      </div>

      <div className="settings-group">
        <h3>Reset</h3>
        <div className="reset-section">
          <p>Reset general settings to their default values</p>
          <Button variant="secondary" onClick={() => setShowResetConfirm(true)}>
            Reset to Defaults
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset General Settings"
        description="Are you sure you want to reset all general settings to their default values? This action cannot be undone."
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Reset Settings
            </Button>
          </div>
        }
      >
        <div className="reset-preview">
          <h4>Settings will be reset to:</h4>
          <ul>
            <li>Auto-save: {DEFAULT_GENERAL_SETTINGS.autoSave ? 'Enabled' : 'Disabled'}</li>
            <li>Auto-save interval: {DEFAULT_GENERAL_SETTINGS.autoSaveInterval} seconds</li>
            <li>Start page: {DEFAULT_GENERAL_SETTINGS.startPage}</li>
            <li>Confirm on exit: {DEFAULT_GENERAL_SETTINGS.confirmOnExit ? 'Enabled' : 'Disabled'}</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}

// Editor Settings Section
function EditorSection() {
  const settings = useAppSettingsStore((state) => state.settings.editor);
  const updateEditorSettings = useAppSettingsStore((state) => state.updateEditorSettings);
  const resetToDefaults = useAppSettingsStore((state) => state.resetToDefaults);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync with feature stores
  const smartTypographyEnabled = useSmartTypographyStore((state) => state.isEnabled);
  const setSmartTypographyEnabled = useSmartTypographyStore((state) => state.setEnabled);
  const paragraphFocusEnabled = useParagraphFocusStore((state) => state.isEnabled);
  const toggleParagraphFocus = useParagraphFocusStore((state) => state.toggle);
  const typewriterScrollEnabled = useTypewriterScrollStore((state) => state.isEnabled);
  const toggleTypewriterScroll = useTypewriterScrollStore((state) => state.toggle);

  // Sync settings with feature stores on mount
  useEffect(() => {
    setSmartTypographyEnabled(settings.smartTypography);
  }, [settings.smartTypography, setSmartTypographyEnabled]);

  const handleSmartTypographyChange = (enabled: boolean) => {
    updateEditorSettings({ smartTypography: enabled });
    setSmartTypographyEnabled(enabled);
  };

  const handleParagraphFocusChange = (enabled: boolean) => {
    updateEditorSettings({ paragraphFocus: enabled });
    if (enabled !== paragraphFocusEnabled) {
      toggleParagraphFocus();
    }
  };

  const handleTypewriterScrollChange = (enabled: boolean) => {
    updateEditorSettings({ typewriterScroll: enabled });
    if (enabled !== typewriterScrollEnabled) {
      toggleTypewriterScroll();
    }
  };

  const handleReset = useCallback(() => {
    resetToDefaults('editor');
    setShowResetConfirm(false);
  }, [resetToDefaults]);

  return (
    <div className="settings-section-content">
      <div className="section-header">
        <h2>Editor Settings</h2>
        <p>Customize your writing experience</p>
      </div>

      <div className="settings-group">
        <h3>Writing Modes</h3>
        <div className="setting-item">
          <Switch
            label="Smart typography"
            description="Automatically convert quotes, dashes, and other characters"
            checked={smartTypographyEnabled}
            onChange={(e) => handleSmartTypographyChange(e.target.checked)}
          />
        </div>
        <div className="setting-item">
          <Switch
            label="Paragraph focus"
            description="Dim all paragraphs except the one you're editing"
            checked={paragraphFocusEnabled}
            onChange={(e) => handleParagraphFocusChange(e.target.checked)}
          />
        </div>
        <div className="setting-item">
          <Switch
            label="Typewriter scroll"
            description="Keep the current line centered on screen"
            checked={typewriterScrollEnabled}
            onChange={(e) => handleTypewriterScrollChange(e.target.checked)}
          />
        </div>
      </div>

      <div className="settings-group">
        <h3>Text Options</h3>
        <div className="setting-item">
          <Switch
            label="Spell check"
            description="Underline misspelled words"
            checked={settings.spellCheck}
            onChange={(e) => updateEditorSettings({ spellCheck: e.target.checked })}
          />
        </div>
        <div className="setting-item">
          <Switch
            label="Line numbers"
            description="Show line numbers in the editor"
            checked={settings.lineNumbers}
            onChange={(e) => updateEditorSettings({ lineNumbers: e.target.checked })}
          />
        </div>
        <div className="setting-item">
          <Switch
            label="Word wrap"
            description="Wrap long lines to fit the editor width"
            checked={settings.wordWrap}
            onChange={(e) => updateEditorSettings({ wordWrap: e.target.checked })}
          />
        </div>
      </div>

      <div className="settings-group">
        <h3>Typography</h3>
        <div className="setting-item">
          <label className="setting-label">
            Font size
            <span className="setting-description">Text size in the editor</span>
          </label>
          <div className="font-size-control">
            <input
              type="range"
              min="12"
              max="24"
              value={settings.fontSize}
              onChange={(e) => updateEditorSettings({ fontSize: Number(e.target.value) })}
              className="setting-range"
            />
            <span className="font-size-value">{settings.fontSize}px</span>
          </div>
        </div>
        <div className="setting-item">
          <label className="setting-label">
            Font family
            <span className="setting-description">The typeface used in the editor</span>
          </label>
          <select
            className="setting-select"
            value={settings.fontFamily}
            onChange={(e) =>
              updateEditorSettings({
                fontFamily: e.target.value as 'system' | 'serif' | 'sans-serif' | 'monospace' | 'georgia',
              })
            }
          >
            <option value="system">System default</option>
            <option value="serif">Serif (Georgia, Times)</option>
            <option value="sans-serif">Sans-serif (Helvetica, Arial)</option>
            <option value="monospace">Monospace (Courier)</option>
            <option value="georgia">Georgia</option>
          </select>
        </div>
        <div className="setting-item">
          <label className="setting-label">
            Line height
            <span className="setting-description">Spacing between lines of text</span>
          </label>
          <div className="font-size-control">
            <input
              type="range"
              min="1.4"
              max="2.0"
              step="0.1"
              value={settings.lineHeight}
              onChange={(e) => updateEditorSettings({ lineHeight: Number(e.target.value) })}
              className="setting-range"
            />
            <span className="font-size-value">{settings.lineHeight.toFixed(1)}</span>
          </div>
        </div>
        <div className="setting-item">
          <label className="setting-label">
            Tab size
            <span className="setting-description">Number of spaces for each tab</span>
          </label>
          <select
            className="setting-select"
            value={settings.tabSize}
            onChange={(e) => updateEditorSettings({ tabSize: Number(e.target.value) })}
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
            <option value={8}>8 spaces</option>
          </select>
        </div>
      </div>

      <div className="settings-group">
        <h3>Layout</h3>
        <div className="setting-item">
          <label className="setting-label">
            Editor width
            <span className="setting-description">The width of the writing area</span>
          </label>
          <select
            className="setting-select"
            value={settings.editorWidth}
            onChange={(e) =>
              updateEditorSettings({
                editorWidth: e.target.value as 'narrow' | 'medium' | 'wide' | 'full',
              })
            }
          >
            <option value="narrow">Narrow</option>
            <option value="medium">Medium</option>
            <option value="wide">Wide</option>
            <option value="full">Full Width</option>
          </select>
        </div>
      </div>

      <div className="settings-group">
        <h3>Reset</h3>
        <div className="reset-section">
          <p>Reset editor settings to their default values</p>
          <Button variant="secondary" onClick={() => setShowResetConfirm(true)}>
            Reset to Defaults
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset Editor Settings"
        description="Are you sure you want to reset all editor settings to their default values?"
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Reset Settings
            </Button>
          </div>
        }
      >
        <div className="reset-preview">
          <h4>Settings will be reset to:</h4>
          <ul>
            <li>Smart typography: {DEFAULT_EDITOR_SETTINGS.smartTypography ? 'Enabled' : 'Disabled'}</li>
            <li>Paragraph focus: {DEFAULT_EDITOR_SETTINGS.paragraphFocus ? 'Enabled' : 'Disabled'}</li>
            <li>Typewriter scroll: {DEFAULT_EDITOR_SETTINGS.typewriterScroll ? 'Enabled' : 'Disabled'}</li>
            <li>Font size: {DEFAULT_EDITOR_SETTINGS.fontSize}px</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}

// AI Settings Section
function AISection() {
  const settings = useAppSettingsStore((state) => state.settings.ai);
  const updateAISettings = useAppSettingsStore((state) => state.updateAISettings);
  const resetToDefaults = useAppSettingsStore((state) => state.resetToDefaults);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleReset = useCallback(() => {
    resetToDefaults('ai');
    setShowResetConfirm(false);
  }, [resetToDefaults]);

  return (
    <div className="settings-section-content">
      <div className="section-header">
        <h2>AI Settings</h2>
        <p>Configure AI-powered features</p>
      </div>

      <div className="settings-group">
        <h3>AI Features</h3>
        <div className="setting-item">
          <Switch
            label="AI suggestions"
            description="Get intelligent autocomplete suggestions as you type"
            checked={settings.enableSuggestions}
            onChange={(e) => updateAISettings({ enableSuggestions: e.target.checked })}
          />
        </div>
        <div className="setting-item">
          <Switch
            label="AI rewrite"
            description="Rewrite selected text to be shorter, longer, or clearer"
            checked={settings.enableRewrite}
            onChange={(e) => updateAISettings({ enableRewrite: e.target.checked })}
          />
        </div>
        <div className="setting-item">
          <Switch
            label="AI comments"
            description="Generate AI-powered comments and insights"
            checked={settings.enableComments}
            onChange={(e) => updateAISettings({ enableComments: e.target.checked })}
          />
        </div>
      </div>

      <div className="settings-group">
        <h3>Behavior</h3>
        <div className="setting-item">
          <label className="setting-label">
            Suggestion delay
            <span className="setting-description">How long to wait before showing suggestions</span>
          </label>
          <select
            className="setting-select"
            value={settings.suggestionDelay}
            onChange={(e) => updateAISettings({ suggestionDelay: Number(e.target.value) })}
          >
            <option value={250}>Fast (250ms)</option>
            <option value={500}>Normal (500ms)</option>
            <option value={1000}>Slow (1s)</option>
            <option value={2000}>Very slow (2s)</option>
          </select>
        </div>
      </div>

      <div className="settings-group">
        <h3>Provider</h3>
        <div className="setting-item">
          <label className="setting-label">
            AI Provider
            <span className="setting-description">Choose your AI service provider</span>
          </label>
          <select
            className="setting-select"
            value={settings.aiProvider}
            onChange={(e) =>
              updateAISettings({
                aiProvider: e.target.value as 'default' | 'openai' | 'anthropic' | 'custom',
              })
            }
          >
            <option value="default">Default (Built-in)</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="custom">Custom API</option>
          </select>
        </div>
        {settings.aiProvider !== 'default' && (
          <div className="setting-item">
            <label className="setting-label">
              API Key
              <span className="setting-description">Your API key for the selected provider</span>
            </label>
            <div className="api-key-input">
              <input
                type={showApiKey ? 'text' : 'password'}
                className="setting-input"
                value={settings.apiKey}
                onChange={(e) => updateAISettings({ apiKey: e.target.value })}
                placeholder="Enter your API key"
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-group">
        <h3>Reset</h3>
        <div className="reset-section">
          <p>Reset AI settings to their default values</p>
          <Button variant="secondary" onClick={() => setShowResetConfirm(true)}>
            Reset to Defaults
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset AI Settings"
        description="Are you sure you want to reset all AI settings to their default values? This will also clear your API key."
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Reset Settings
            </Button>
          </div>
        }
      >
        <div className="reset-preview">
          <h4>Settings will be reset to:</h4>
          <ul>
            <li>AI suggestions: {DEFAULT_AI_SETTINGS.enableSuggestions ? 'Enabled' : 'Disabled'}</li>
            <li>AI rewrite: {DEFAULT_AI_SETTINGS.enableRewrite ? 'Enabled' : 'Disabled'}</li>
            <li>AI comments: {DEFAULT_AI_SETTINGS.enableComments ? 'Enabled' : 'Disabled'}</li>
            <li>Provider: {DEFAULT_AI_SETTINGS.aiProvider}</li>
            <li>API Key: Will be cleared</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}

// Appearance Settings Section
function AppearanceSection() {
  const settings = useAppSettingsStore((state) => state.settings.appearance);
  const updateAppearanceSettings = useAppSettingsStore((state) => state.updateAppearanceSettings);
  const resetToDefaults = useAppSettingsStore((state) => state.resetToDefaults);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = useCallback(() => {
    resetToDefaults('appearance');
    setShowResetConfirm(false);
  }, [resetToDefaults]);

  return (
    <div className="settings-section-content">
      <div className="section-header">
        <h2>Appearance</h2>
        <p>Customize how the app looks</p>
      </div>

      <div className="settings-group">
        <h3>Theme</h3>
        <div className="setting-item">
          <label className="setting-label">
            Color theme
            <span className="setting-description">Choose light, dark, or match your system</span>
          </label>
          <div className="theme-options">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                className={`theme-option ${settings.theme === theme ? 'active' : ''}`}
                onClick={() => updateAppearanceSettings({ theme })}
              >
                <span className={`theme-preview theme-preview-${theme}`} />
                <span className="theme-label">{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3>Accent Color</h3>
        <div className="setting-item">
          <label className="setting-label">
            Primary color
            <span className="setting-description">The main accent color used throughout the app</span>
          </label>
          <div className="color-options">
            {(['blue', 'purple', 'green', 'orange', 'red'] as const).map((color) => (
              <button
                key={color}
                type="button"
                className={`color-option color-${color} ${settings.accentColor === color ? 'active' : ''}`}
                onClick={() => updateAppearanceSettings({ accentColor: color })}
                aria-label={color}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3>Layout</h3>
        <div className="setting-item">
          <Switch
            label="Compact mode"
            description="Use smaller spacing and fonts for more content"
            checked={settings.compactMode}
            onChange={(e) => updateAppearanceSettings({ compactMode: e.target.checked })}
          />
        </div>
        <div className="setting-item">
          <Switch
            label="Show animations"
            description="Enable smooth transitions and animations"
            checked={settings.showAnimations}
            onChange={(e) => updateAppearanceSettings({ showAnimations: e.target.checked })}
          />
        </div>
        <div className="setting-item">
          <Switch
            label="Collapse sidebar by default"
            description="Start with the sidebar in collapsed state"
            checked={settings.sidebarCollapsed}
            onChange={(e) => updateAppearanceSettings({ sidebarCollapsed: e.target.checked })}
          />
        </div>
      </div>

      <div className="settings-group">
        <h3>Reset</h3>
        <div className="reset-section">
          <p>Reset appearance settings to their default values</p>
          <Button variant="secondary" onClick={() => setShowResetConfirm(true)}>
            Reset to Defaults
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset Appearance Settings"
        description="Are you sure you want to reset all appearance settings to their default values?"
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Reset Settings
            </Button>
          </div>
        }
      >
        <div className="reset-preview">
          <h4>Settings will be reset to:</h4>
          <ul>
            <li>Theme: {DEFAULT_APPEARANCE_SETTINGS.theme}</li>
            <li>Accent color: {DEFAULT_APPEARANCE_SETTINGS.accentColor}</li>
            <li>Compact mode: {DEFAULT_APPEARANCE_SETTINGS.compactMode ? 'Enabled' : 'Disabled'}</li>
            <li>Animations: {DEFAULT_APPEARANCE_SETTINGS.showAnimations ? 'Enabled' : 'Disabled'}</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}

// Account Settings Section
function AccountSection() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    user,
    preferences,
    isLoading,
    error,
    fetchUser,
    updateUser,
    updateAvatar,
    requestEmailChange,
    changePassword,
    deleteAccount,
    logout,
  } = useUserStore();

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    bio: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [emailChangeSuccess, setEmailChangeSuccess] = useState(false);

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Image upload hook
  const { uploadImage } = useImageUpload({
    onUploadComplete: async (imageUrl) => {
      try {
        await updateAvatar(imageUrl);
        setIsUploadingAvatar(false);
        setAvatarError(null);
      } catch {
        setAvatarError('Failed to save profile picture');
        setIsUploadingAvatar(false);
      }
    },
    onUploadError: (err) => {
      setAvatarError(err);
      setIsUploadingAvatar(false);
    },
  });

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        bio: user.bio || '',
      });
      setNewEmail(user.email);
    }
  }, [user]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (profileSuccess) {
      const timer = setTimeout(() => setProfileSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [profileSuccess]);

  useEffect(() => {
    if (emailChangeSuccess) {
      const timer = setTimeout(() => setEmailChangeSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [emailChangeSuccess]);

  useEffect(() => {
    if (passwordSuccess) {
      const timer = setTimeout(() => setPasswordSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [passwordSuccess]);

  const handleProfileInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
    setProfileSuccess(false);
    setProfileError(null);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      await updateUser({
        name: profileData.name,
        bio: profileData.bio,
      });
      setProfileSuccess(true);
    } catch {
      setProfileError('Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setAvatarError(null);
    await uploadImage(file);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewEmail(e.target.value);
    setEmailChangeError(null);
    setEmailChangeSuccess(false);
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail || newEmail === user?.email) {
      setEmailChangeError('Please enter a different email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailChangeError('Please enter a valid email address');
      return;
    }

    setIsRequestingEmailChange(true);
    setEmailChangeError(null);
    setEmailChangeSuccess(false);

    try {
      await requestEmailChange(newEmail);
      setEmailChangeSuccess(true);
      setShowEmailChangeModal(false);
    } catch (err) {
      setEmailChangeError(err instanceof Error ? err.message : 'Failed to request email change');
    } finally {
      setIsRequestingEmailChange(false);
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    setPasswordSuccess(false);
    setPasswordError(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setIsSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordSuccess(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }

    if (!deletePassword) {
      setDeleteError('Please enter your password');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount(deletePassword);
      logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && !preferences && !user) {
    return <SettingsFormSkeleton />;
  }

  if (error && !preferences && !user) {
    return (
      <div className="settings-section-content">
        <div className="settings-error">
          <h2>Error</h2>
          <p>{error}</p>
          <Button onClick={() => fetchUser()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-section-content">
      <div className="section-header">
        <h2>Account</h2>
        <p>Manage your profile and security settings</p>
      </div>

      <div className="settings-group">
        <h3>Profile Picture</h3>
        <div className="profile-avatar-section profile-avatar-editable">
          <div className="avatar-container avatar-upload" onClick={handleAvatarClick}>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="avatar-image" />
            ) : (
              <div className="avatar-placeholder">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div className="avatar-overlay">
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            {isUploadingAvatar && (
              <div className="avatar-loading">
                <div className="avatar-spinner" />
              </div>
            )}
          </div>
          <div className="avatar-info">
            <p className="avatar-name">{user?.name || 'User'}</p>
            <p className="avatar-email">{user?.email || ''}</p>
            <button type="button" className="avatar-change-btn" onClick={handleAvatarClick}>
              Change photo
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleAvatarChange}
            className="avatar-input-hidden"
          />
        </div>
        {avatarError && <div className="form-error">{avatarError}</div>}
      </div>

      <div className="settings-group">
        <h3>Profile Information</h3>
        <form onSubmit={handleProfileSubmit} className="account-form">
          <div className="setting-item">
            <label className="setting-label">Display Name</label>
            <input
              type="text"
              name="name"
              value={profileData.name}
              onChange={handleProfileInputChange}
              className="setting-input"
              required
              minLength={1}
              maxLength={100}
            />
            <span className="setting-description">
              Your name as it appears across the application
            </span>
          </div>
          <div className="setting-item">
            <label className="setting-label">Bio</label>
            <textarea
              name="bio"
              value={profileData.bio}
              onChange={handleProfileInputChange}
              className="setting-textarea"
              rows={3}
              maxLength={500}
              placeholder="Tell us a little about yourself..."
            />
            <span className="setting-description">{profileData.bio.length}/500 characters</span>
          </div>
          {profileError && <div className="form-error">{profileError}</div>}
          {profileSuccess && <div className="form-success">Profile saved successfully!</div>}
          <Button type="submit" disabled={isSavingProfile}>
            {isSavingProfile ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </div>

      <div className="settings-group">
        <h3>Email Address</h3>
        <div className="email-section">
          <div className="email-current">
            <span className="setting-label">Current email</span>
            <span className="email-value">{user?.email}</span>
            {user?.pendingEmail && (
              <div className="email-pending">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                Verification sent to {user.pendingEmail}
              </div>
            )}
          </div>
          <Button variant="secondary" onClick={() => setShowEmailChangeModal(true)}>
            Change Email
          </Button>
        </div>
        {emailChangeSuccess && (
          <div className="form-success">
            Verification email sent! Please check your inbox.
          </div>
        )}
      </div>

      <div className="settings-group">
        <h3>Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="account-form">
          <div className="setting-item">
            <label className="setting-label">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordInputChange}
              className="setting-input"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="setting-item">
            <label className="setting-label">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordInputChange}
              className="setting-input"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <span className="setting-description">Must be at least 8 characters</span>
          </div>
          <div className="setting-item">
            <label className="setting-label">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordInputChange}
              className="setting-input"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {passwordError && <div className="form-error">{passwordError}</div>}
          {passwordSuccess && <div className="form-success">Password changed successfully!</div>}
          <Button type="submit" disabled={isSavingPassword}>
            {isSavingPassword ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </div>

      <div className="settings-group danger-zone">
        <h3 className="danger-title">Danger Zone</h3>
        <div className="danger-content">
          <div className="danger-item">
            <div className="danger-item-info">
              <h4>Delete Account</h4>
              <p>
                Permanently delete your account and all associated data. This action cannot be
                undone.
              </p>
            </div>
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Email Change Modal */}
      <Modal
        isOpen={showEmailChangeModal}
        onClose={() => {
          setShowEmailChangeModal(false);
          setNewEmail(user?.email || '');
          setEmailChangeError(null);
        }}
        title="Change Email Address"
        description="We'll send a verification link to your new email address. Your email won't change until you verify it."
        size="sm"
        footer={
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEmailChangeModal(false);
                setNewEmail(user?.email || '');
                setEmailChangeError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestEmailChange}
              disabled={isRequestingEmailChange || newEmail === user?.email}
            >
              {isRequestingEmailChange ? 'Sending...' : 'Send Verification'}
            </Button>
          </div>
        }
      >
        <div className="email-change-content">
          <div className="setting-item">
            <label className="setting-label">New Email Address</label>
            <input
              type="email"
              value={newEmail}
              onChange={handleEmailChange}
              className="setting-input"
              placeholder="Enter your new email"
              autoComplete="email"
            />
          </div>
          {emailChangeError && <div className="form-error">{emailChangeError}</div>}
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteConfirmation('');
          setDeletePassword('');
          setDeleteError(null);
        }}
        title="Delete Account"
        description="This action is permanent and cannot be undone. All your data will be deleted."
        size="sm"
        footer={
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmation('');
                setDeletePassword('');
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmation !== 'DELETE'}
            >
              {isDeleting ? 'Deleting...' : 'Delete My Account'}
            </Button>
          </div>
        }
      >
        <div className="delete-confirm-content">
          <div className="setting-item">
            <label className="setting-label">Type DELETE to confirm</label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => {
                setDeleteConfirmation(e.target.value);
                setDeleteError(null);
              }}
              className="setting-input"
              placeholder="DELETE"
            />
          </div>
          <div className="setting-item">
            <label className="setting-label">Enter your password</label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError(null);
              }}
              className="setting-input"
              placeholder="Your password"
              autoComplete="current-password"
            />
          </div>
          {deleteError && <div className="form-error">{deleteError}</div>}
        </div>
      </Modal>
    </div>
  );
}

// Main Settings Page Component
export function OrganizedSettings() {
  const activeSection = useAppSettingsStore((state) => state.activeSection);
  const setActiveSection = useAppSettingsStore((state) => state.setActiveSection);
  const isSaving = useAppSettingsStore((state) => state.isSaving);
  const lastSaved = useAppSettingsStore((state) => state.lastSaved);
  const shortcutsIsOpen = useKeyboardShortcutsStore((state) => state.isOpen);
  const closeShortcutsModal = useKeyboardShortcutsStore((state) => state.closeModal);

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return <GeneralSection />;
      case 'editor':
        return <EditorSection />;
      case 'ai':
        return <AISection />;
      case 'appearance':
        return <AppearanceSection />;
      case 'goals':
        return <StreakSettings />;
      case 'account':
        return <AccountSection />;
      default:
        return <GeneralSection />;
    }
  };

  return (
    <PageTransition>
      <div className="organized-settings">
        <div className="settings-layout">
          {/* Sidebar Navigation */}
          <aside className="settings-sidebar">
            <div className="sidebar-header">
              <Link to="/" className="back-link">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
              <h1>Settings</h1>
            </div>
            <nav className="settings-nav">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <SectionIcon name={section.icon} />
                  <span>{section.label}</span>
                </button>
              ))}
            </nav>
            <div className="save-status">
              {isSaving ? (
                <span className="saving">Saving...</span>
              ) : lastSaved ? (
                <span className="saved">
                  Saved {new Date(lastSaved).toLocaleTimeString()}
                </span>
              ) : null}
            </div>
          </aside>

          {/* Main Content */}
          <main className="settings-main">{renderSection()}</main>
        </div>
      </div>

      {/* Keyboard Shortcuts Viewer Modal */}
      <KeyboardShortcutsViewer isOpen={shortcutsIsOpen} onClose={closeShortcutsModal} />
    </PageTransition>
  );
}
