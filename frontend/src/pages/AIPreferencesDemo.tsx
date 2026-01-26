/**
 * AI Preferences Demo
 *
 * Demo page showcasing the AI preferences panel.
 * Allows users to customize AI behavior including suggestions, feedback, and model selection.
 */

import { useState } from 'react';
import { PageTransition } from '../components/PageTransition';
import { AIPreferencesPanel } from '../components/AIPreferencesPanel';
import { Button } from '../components/ui/Button';
import { useAppSettingsStore } from '../stores/appSettings';
import './AIPreferencesDemo.css';

const AIIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M10 2L2 6v8l8 4 8-4V6l-8-4z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 10l8-4M10 10v8M10 10L2 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function AIPreferencesDemo() {
  const [showPreferences, setShowPreferences] = useState(false);
  const settings = useAppSettingsStore((state) => state.settings.ai);

  const getVerbosityLabel = (verbosity: string) => {
    switch (verbosity) {
      case 'brief':
        return 'Brief';
      case 'standard':
        return 'Standard';
      case 'detailed':
        return 'Detailed';
      default:
        return verbosity;
    }
  };

  const getFeedbackTypeLabel = (type: string) => {
    switch (type) {
      case 'inline':
        return 'Inline';
      case 'sidebar':
        return 'Sidebar';
      case 'modal':
        return 'Modal';
      default:
        return type;
    }
  };

  const getModelLabel = (model: string) => {
    switch (model) {
      case 'default':
        return 'Default';
      case 'gpt-4':
        return 'GPT-4';
      case 'gpt-3.5-turbo':
        return 'GPT-3.5 Turbo';
      case 'claude-3-opus':
        return 'Claude 3 Opus';
      case 'claude-3-sonnet':
        return 'Claude 3 Sonnet';
      default:
        return model;
    }
  };

  return (
    <PageTransition>
      <div className="ai-prefs-demo">
        <header className="demo-header">
          <h1>AI Preferences</h1>
          <p>Customize AI behavior, suggestions, and feedback settings</p>
        </header>

        <section className="demo-controls">
          <Button
            variant="primary"
            onClick={() => setShowPreferences(true)}
            className="open-prefs-btn"
          >
            <AIIcon />
            Open AI Preferences Panel
          </Button>

          <div className="current-settings">
            <h3>Current Settings</h3>
            <div className="settings-display">
              <div className="setting-chip">
                <span className="chip-label">Suggestions</span>
                <span className="chip-value">
                  {settings.enableSuggestions ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="setting-chip">
                <span className="chip-label">Delay</span>
                <span className="chip-value">{settings.suggestionDelay}ms</span>
              </div>
              <div className="setting-chip">
                <span className="chip-label">Verbosity</span>
                <span className="chip-value">
                  {getVerbosityLabel(settings.feedbackVerbosity)}
                </span>
              </div>
              <div className="setting-chip">
                <span className="chip-label">Feedback</span>
                <span className="chip-value">
                  {getFeedbackTypeLabel(settings.defaultFeedbackType)}
                </span>
              </div>
              <div className="setting-chip">
                <span className="chip-label">Model</span>
                <span className="chip-value">{getModelLabel(settings.aiModel)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="demo-preview">
          <h2>AI Feedback Preview</h2>
          <div className="preview-container">
            <div className="ai-preview-content">
              <div className="ai-preview-input">
                <p className="preview-text">
                  The quick brown fox jumps over the lazy dog. This sentence contains
                  every letter of the alphabet and is often used for typing practice.
                </p>
              </div>
              <div className="ai-preview-feedback">
                <div className="feedback-header">
                  <span className="feedback-icon">
                    <AIIcon />
                  </span>
                  <span className="feedback-label">AI Feedback</span>
                  <span className="feedback-badge">{getVerbosityLabel(settings.feedbackVerbosity)}</span>
                </div>
                <div className="feedback-content">
                  {settings.feedbackVerbosity === 'brief' && (
                    <p>Good sentence structure. Consider adding more descriptive language.</p>
                  )}
                  {settings.feedbackVerbosity === 'standard' && (
                    <>
                      <p>
                        <strong>Clarity:</strong> The sentence is clear and easy to understand.
                      </p>
                      <p>
                        <strong>Suggestion:</strong> Consider adding more descriptive adjectives
                        to create a more vivid image.
                      </p>
                    </>
                  )}
                  {settings.feedbackVerbosity === 'detailed' && (
                    <>
                      <p>
                        <strong>Clarity Score:</strong> 9/10 - The sentence is highly readable
                        and grammatically correct.
                      </p>
                      <p>
                        <strong>Vocabulary:</strong> Uses common words effectively. The pangram
                        structure is a classic choice.
                      </p>
                      <p>
                        <strong>Suggestions:</strong>
                      </p>
                      <ul>
                        <li>Add descriptive adjectives for more vivid imagery</li>
                        <li>Consider varying sentence length for better rhythm</li>
                        <li>The second sentence could be condensed</li>
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="demo-features">
          <h2>Available Settings</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Auto-Suggestions</h3>
              <p>Enable or disable AI-powered writing suggestions as you type</p>
            </div>
            <div className="feature-card">
              <h3>Suggestion Delay</h3>
              <p>Control how long to wait before showing suggestions (300ms - 2s)</p>
            </div>
            <div className="feature-card">
              <h3>Feedback Verbosity</h3>
              <p>Choose between Brief, Standard, or Detailed AI feedback</p>
            </div>
            <div className="feature-card">
              <h3>Feedback Type</h3>
              <p>Display feedback inline, in a sidebar, or in a modal dialog</p>
            </div>
            <div className="feature-card">
              <h3>AI Model</h3>
              <p>Select from GPT-4, GPT-3.5 Turbo, Claude 3 Opus, or Claude 3 Sonnet</p>
            </div>
          </div>
        </section>
      </div>

      <AIPreferencesPanel
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
    </PageTransition>
  );
}

AIPreferencesDemo.displayName = 'AIPreferencesDemo';
