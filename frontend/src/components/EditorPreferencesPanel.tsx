import { SlideOutPanel } from './ui/SlideOutPanel';
import { Select } from './ui/Select';
import { Slider } from './ui/Slider';
import { Button } from './ui/Button';
import {
  useAppSettingsStore,
  DEFAULT_EDITOR_SETTINGS,
  type EditorFontFamily,
  type EditorWidth,
} from '../stores/appSettings';
import './EditorPreferencesPanel.css';

interface EditorPreferencesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const FONT_FAMILY_OPTIONS = [
  { value: 'system', label: 'System Default' },
  { value: 'serif', label: 'Serif (Georgia, Times)' },
  { value: 'sans-serif', label: 'Sans Serif (Helvetica, Arial)' },
  { value: 'monospace', label: 'Monospace (Courier)' },
  { value: 'georgia', label: 'Georgia' },
];

const EDITOR_WIDTH_OPTIONS = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'medium', label: 'Medium' },
  { value: 'wide', label: 'Wide' },
  { value: 'full', label: 'Full Width' },
];

export function EditorPreferencesPanel({
  isOpen,
  onClose,
}: EditorPreferencesPanelProps) {
  const settings = useAppSettingsStore((state) => state.settings.editor);
  const updateEditorSettings = useAppSettingsStore(
    (state) => state.updateEditorSettings
  );

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateEditorSettings({ fontFamily: e.target.value as EditorFontFamily });
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateEditorSettings({ fontSize: Number(e.target.value) });
  };

  const handleLineHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateEditorSettings({ lineHeight: Number(e.target.value) });
  };

  const handleEditorWidthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateEditorSettings({ editorWidth: e.target.value as EditorWidth });
  };

  const handleResetToDefaults = () => {
    updateEditorSettings({
      fontFamily: DEFAULT_EDITOR_SETTINGS.fontFamily,
      fontSize: DEFAULT_EDITOR_SETTINGS.fontSize,
      lineHeight: DEFAULT_EDITOR_SETTINGS.lineHeight,
      editorWidth: DEFAULT_EDITOR_SETTINGS.editorWidth,
    });
  };

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Editor Preferences"
      position="right"
      size="sm"
      footer={
        <div className="editor-prefs-footer">
          <Button variant="ghost" size="sm" onClick={handleResetToDefaults}>
            Reset to Defaults
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="editor-prefs-content">
        <div className="editor-prefs-section">
          <h3 className="editor-prefs-section-title">Typography</h3>

          <div className="editor-prefs-field">
            <Select
              label="Font Family"
              options={FONT_FAMILY_OPTIONS}
              value={settings.fontFamily}
              onChange={handleFontFamilyChange}
              fullWidth
            />
          </div>

          <div className="editor-prefs-field">
            <Slider
              label="Font Size"
              min={14}
              max={24}
              step={1}
              value={settings.fontSize}
              onChange={handleFontSizeChange}
              valueFormatter={(v) => `${v}px`}
              fullWidth
            />
          </div>

          <div className="editor-prefs-field">
            <Slider
              label="Line Height"
              min={1.4}
              max={2.0}
              step={0.1}
              value={settings.lineHeight}
              onChange={handleLineHeightChange}
              valueFormatter={(v) => v.toFixed(1)}
              fullWidth
            />
          </div>
        </div>

        <div className="editor-prefs-section">
          <h3 className="editor-prefs-section-title">Layout</h3>

          <div className="editor-prefs-field">
            <Select
              label="Editor Width"
              options={EDITOR_WIDTH_OPTIONS}
              value={settings.editorWidth}
              onChange={handleEditorWidthChange}
              fullWidth
            />
          </div>
        </div>

        <div className="editor-prefs-preview">
          <h3 className="editor-prefs-section-title">Preview</h3>
          <div
            className="editor-prefs-preview-box"
            style={{
              fontFamily: getFontFamilyValue(settings.fontFamily),
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
            }}
          >
            <p>
              The quick brown fox jumps over the lazy dog. This sample text
              shows how your editor will look with the selected typography
              settings.
            </p>
          </div>
        </div>
      </div>
    </SlideOutPanel>
  );
}

function getFontFamilyValue(fontFamily: EditorFontFamily): string {
  switch (fontFamily) {
    case 'system':
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    case 'serif':
      return 'Georgia, "Times New Roman", Times, serif';
    case 'sans-serif':
      return 'Helvetica, Arial, sans-serif';
    case 'monospace':
      return '"SF Mono", "Fira Code", Consolas, "Courier New", monospace';
    case 'georgia':
      return 'Georgia, serif';
    default:
      return 'inherit';
  }
}

EditorPreferencesPanel.displayName = 'EditorPreferencesPanel';
