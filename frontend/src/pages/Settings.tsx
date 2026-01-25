import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { UserPreferences } from '../stores/user';
import { useUserStore } from '../stores/user';
import { PageTransition } from '../components/PageTransition';
import { SettingsFormSkeleton } from '../components/skeletons';
import './Settings.css';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
];

export function Settings() {
  const { preferences, isLoading, error, updatePreferences } = useUserStore();
  const [formData, setFormData] = useState<UserPreferences>({
    theme: 'system',
    language: 'en',
    notifications: {
      email: true,
      push: false,
    },
    defaultTimezone: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (preferences) {
      setFormData({
        theme: preferences.theme,
        language: preferences.language,
        notifications: { ...preferences.notifications },
        defaultTimezone: preferences.defaultTimezone || '',
      });
    }
  }, [preferences]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [name]: checked },
    }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updatePreferences({
        theme: formData.theme,
        language: formData.language,
        notifications: formData.notifications,
        defaultTimezone: formData.defaultTimezone || undefined,
      });
      setSaveSuccess(true);
    } catch {
      setSaveError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !preferences) {
    return (
      <PageTransition>
        <div className="settings-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && !preferences) {
    return (
      <PageTransition>
        <div className="settings-page">
          <div className="settings-error">
            <h2>Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="settings-page">
        <div className="settings-header">
          <Link to="/profile" className="back-link">
            &larr; Back to Profile
          </Link>
          <h1>User Preferences</h1>
          <p className="settings-subtitle">Customize your experience</p>
        </div>

        <form onSubmit={handleSubmit} className="settings-form">
          <div className="settings-section">
            <h2 className="section-title">Appearance</h2>

            <div className="form-group">
              <label htmlFor="theme" className="form-label">
                Theme
              </label>
              <select
                id="theme"
                name="theme"
                value={formData.theme}
                onChange={handleSelectChange}
                className="form-select"
              >
                <option value="system">System Default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <p className="form-help">
                Choose how the application appears on your device.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="language" className="form-label">
                Language
              </label>
              <select
                id="language"
                name="language"
                value={formData.language}
                onChange={handleSelectChange}
                className="form-select"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <p className="form-help">
                Select your preferred language for the interface.
              </p>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="section-title">Date & Time</h2>

            <div className="form-group">
              <label htmlFor="defaultTimezone" className="form-label">
                Default Timezone
              </label>
              <select
                id="defaultTimezone"
                name="defaultTimezone"
                value={formData.defaultTimezone}
                onChange={handleSelectChange}
                className="form-select"
              >
                <option value="">Use system timezone</option>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="form-help">
                Set a default timezone for displaying times.
              </p>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="section-title">Notifications</h2>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="email"
                  checked={formData.notifications.email}
                  onChange={handleCheckboxChange}
                  className="form-checkbox"
                />
                <span className="checkbox-text">
                  <span className="checkbox-title">Email Notifications</span>
                  <span className="checkbox-description">
                    Receive important updates via email
                  </span>
                </span>
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="push"
                  checked={formData.notifications.push}
                  onChange={handleCheckboxChange}
                  className="form-checkbox"
                />
                <span className="checkbox-text">
                  <span className="checkbox-title">Push Notifications</span>
                  <span className="checkbox-description">
                    Get real-time alerts in your browser
                  </span>
                </span>
              </label>
            </div>
          </div>

          {saveError && <div className="form-error">{saveError}</div>}
          {saveSuccess && (
            <div className="form-success">Settings saved successfully!</div>
          )}

          <div className="form-actions">
            <button type="submit" className="save-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
