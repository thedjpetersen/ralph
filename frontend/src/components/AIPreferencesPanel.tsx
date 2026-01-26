import { SlideOutPanel } from './ui/SlideOutPanel';
import { Select } from './ui/Select';
import { Slider } from './ui/Slider';
import { Switch } from './ui/Switch';
import { Button } from './ui/Button';
import {
  useAppSettingsStore,
  DEFAULT_AI_SETTINGS,
  type FeedbackVerbosity,
  type FeedbackType,
  type AIModel,
} from '../stores/appSettings';
import './AIPreferencesPanel.css';

interface AIPreferencesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEEDBACK_VERBOSITY_OPTIONS = [
  { value: 'brief', label: 'Brief' },
  { value: 'standard', label: 'Standard' },
  { value: 'detailed', label: 'Detailed' },
];

const FEEDBACK_TYPE_OPTIONS = [
  { value: 'inline', label: 'Inline' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'modal', label: 'Modal' },
];

const AI_MODEL_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
];

export function AIPreferencesPanel({
  isOpen,
  onClose,
}: AIPreferencesPanelProps) {
  const settings = useAppSettingsStore((state) => state.settings.ai);
  const updateAISettings = useAppSettingsStore(
    (state) => state.updateAISettings
  );

  const handleEnableSuggestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAISettings({ enableSuggestions: e.target.checked });
  };

  const handleSuggestionDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAISettings({ suggestionDelay: Number(e.target.value) });
  };

  const handleFeedbackVerbosityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateAISettings({ feedbackVerbosity: e.target.value as FeedbackVerbosity });
  };

  const handleDefaultFeedbackTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateAISettings({ defaultFeedbackType: e.target.value as FeedbackType });
  };

  const handleAIModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateAISettings({ aiModel: e.target.value as AIModel });
  };

  const handleResetToDefaults = () => {
    updateAISettings({
      enableSuggestions: DEFAULT_AI_SETTINGS.enableSuggestions,
      suggestionDelay: DEFAULT_AI_SETTINGS.suggestionDelay,
      feedbackVerbosity: DEFAULT_AI_SETTINGS.feedbackVerbosity,
      defaultFeedbackType: DEFAULT_AI_SETTINGS.defaultFeedbackType,
      aiModel: DEFAULT_AI_SETTINGS.aiModel,
    });
  };

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title="AI Preferences"
      position="right"
      size="sm"
      footer={
        <div className="ai-prefs-footer">
          <Button variant="ghost" size="sm" onClick={handleResetToDefaults}>
            Reset to Defaults
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="ai-prefs-content">
        <div className="ai-prefs-section">
          <h3 className="ai-prefs-section-title">Suggestions</h3>

          <div className="ai-prefs-field">
            <Switch
              label="Auto-suggestions"
              description="Enable AI-powered suggestions while writing"
              checked={settings.enableSuggestions}
              onChange={handleEnableSuggestionsChange}
              labelPosition="left"
            />
          </div>

          <div className="ai-prefs-field">
            <Slider
              label="Suggestion Delay"
              min={300}
              max={2000}
              step={100}
              value={settings.suggestionDelay}
              onChange={handleSuggestionDelayChange}
              valueFormatter={(v) => `${v}ms`}
              hint="How long to wait before showing suggestions"
              fullWidth
              disabled={!settings.enableSuggestions}
            />
          </div>
        </div>

        <div className="ai-prefs-section">
          <h3 className="ai-prefs-section-title">Feedback</h3>

          <div className="ai-prefs-field">
            <Select
              label="Feedback Verbosity"
              options={FEEDBACK_VERBOSITY_OPTIONS}
              value={settings.feedbackVerbosity}
              onChange={handleFeedbackVerbosityChange}
              hint="How detailed AI feedback should be"
              fullWidth
            />
          </div>

          <div className="ai-prefs-field">
            <Select
              label="Default Feedback Type"
              options={FEEDBACK_TYPE_OPTIONS}
              value={settings.defaultFeedbackType}
              onChange={handleDefaultFeedbackTypeChange}
              hint="Where AI feedback is displayed"
              fullWidth
            />
          </div>
        </div>

        <div className="ai-prefs-section">
          <h3 className="ai-prefs-section-title">Model</h3>

          <div className="ai-prefs-field">
            <Select
              label="AI Model"
              options={AI_MODEL_OPTIONS}
              value={settings.aiModel}
              onChange={handleAIModelChange}
              hint="Select the AI model to use for suggestions"
              fullWidth
            />
          </div>
        </div>

        <div className="ai-prefs-info">
          <div className="ai-prefs-info-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 14A6 6 0 108 2a6 6 0 000 12z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M8 11V8M8 5.5V5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="ai-prefs-info-text">
            AI features require an active subscription. Changes are saved automatically.
          </p>
        </div>
      </div>
    </SlideOutPanel>
  );
}

AIPreferencesPanel.displayName = 'AIPreferencesPanel';
