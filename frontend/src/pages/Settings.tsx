import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '\u20AC' },
  { code: 'GBP', name: 'British Pound', symbol: '\u00A3' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '\u00A5' },
  { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
];

const LOCALES = [
  { code: 'en-US', name: 'English (United States)' },
  { code: 'en-GB', name: 'English (United Kingdom)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'de-DE', name: 'German (Germany)' },
  { code: 'ja-JP', name: 'Japanese (Japan)' },
  { code: 'zh-CN', name: 'Chinese (China)' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'it-IT', name: 'Italian (Italy)' },
];

export function Settings() {
  const navigate = useNavigate();
  const {
    user,
    preferences,
    isLoading,
    error,
    fetchUser,
    updateUser,
    updatePreferences,
    changePassword,
    deleteAccount,
    logout,
  } = useUserStore();

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Preferences form state
  const [formData, setFormData] = useState<UserPreferences>({
    theme: 'system',
    language: 'en',
    notifications: {
      email: true,
      push: false,
    },
    defaultTimezone: '',
    currency: 'USD',
    locale: 'en-US',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        email: user.email,
      });
    }
  }, [user]);

  useEffect(() => {
    if (preferences) {
      setFormData({
        theme: preferences.theme,
        language: preferences.language,
        notifications: { ...preferences.notifications },
        defaultTimezone: preferences.defaultTimezone || '',
        currency: preferences.currency || 'USD',
        locale: preferences.locale || 'en-US',
      });
    }
  }, [preferences]);

  // Profile handlers
  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        email: profileData.email,
      });
      setProfileSuccess(true);
    } catch {
      setProfileError('Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Preferences handlers
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

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
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
        currency: formData.currency,
        locale: formData.locale,
      });
      setSaveSuccess(true);
    } catch {
      setSaveError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Password handlers
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

  // Delete account handlers
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
    return (
      <PageTransition>
        <div className="settings-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && !preferences && !user) {
    return (
      <PageTransition>
        <div className="settings-page">
          <div className="settings-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => fetchUser()} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="settings-page">
        <div className="settings-header">
          <Link to="/" className="back-link">
            &larr; Back to Dashboard
          </Link>
          <h1>Settings</h1>
          <p className="settings-subtitle">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="settings-card">
          <div className="settings-section">
            <h2 className="section-title">Profile</h2>
            <p className="section-description">Your personal information</p>

            <div className="profile-avatar-section">
              <div className="avatar-container">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="avatar-info">
                <p className="avatar-name">{user?.name || 'User'}</p>
                <p className="avatar-email">{user?.email || ''}</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="settings-form-inner">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Display Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileInputChange}
                  className="form-input"
                  required
                  minLength={1}
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileInputChange}
                  className="form-input"
                  required
                />
              </div>

              {profileError && <div className="form-error">{profileError}</div>}
              {profileSuccess && (
                <div className="form-success">Profile saved successfully!</div>
              )}

              <div className="form-actions">
                <button type="submit" className="save-button" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Password Section */}
        <div className="settings-card">
          <div className="settings-section">
            <h2 className="section-title">Change Password</h2>
            <p className="section-description">Update your account password</p>

            <form onSubmit={handlePasswordSubmit} className="settings-form-inner">
              <div className="form-group">
                <label htmlFor="currentPassword" className="form-label">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordInputChange}
                  className="form-input"
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword" className="form-label">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordInputChange}
                  className="form-input"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <p className="form-help">Must be at least 8 characters</p>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordInputChange}
                  className="form-input"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {passwordError && <div className="form-error">{passwordError}</div>}
              {passwordSuccess && (
                <div className="form-success">Password changed successfully!</div>
              )}

              <div className="form-actions">
                <button type="submit" className="save-button" disabled={isSavingPassword}>
                  {isSavingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="settings-card">
          <div className="settings-section">
            <h2 className="section-title">Notifications</h2>
            <p className="section-description">Manage how you receive notifications</p>

            <form onSubmit={handlePreferencesSubmit} className="settings-form-inner">
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

              {saveError && <div className="form-error">{saveError}</div>}
              {saveSuccess && (
                <div className="form-success">Settings saved successfully!</div>
              )}

              <div className="form-actions">
                <button type="submit" className="save-button" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Notifications'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Currency & Locale Section */}
        <div className="settings-card">
          <div className="settings-section">
            <h2 className="section-title">Currency & Locale</h2>
            <p className="section-description">Set your preferred currency and regional settings</p>

            <form onSubmit={handlePreferencesSubmit} className="settings-form-inner">
              <div className="form-group">
                <label htmlFor="currency" className="form-label">
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleSelectChange}
                  className="form-select"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} - {curr.name} ({curr.code})
                    </option>
                  ))}
                </select>
                <p className="form-help">
                  Your preferred currency for displaying amounts
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="locale" className="form-label">
                  Locale
                </label>
                <select
                  id="locale"
                  name="locale"
                  value={formData.locale}
                  onChange={handleSelectChange}
                  className="form-select"
                >
                  {LOCALES.map((loc) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <p className="form-help">
                  Affects date, time, and number formatting
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="defaultTimezone" className="form-label">
                  Timezone
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
                  Set a default timezone for displaying times
                </p>
              </div>

              {saveError && <div className="form-error">{saveError}</div>}
              {saveSuccess && (
                <div className="form-success">Settings saved successfully!</div>
              )}

              <div className="form-actions">
                <button type="submit" className="save-button" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Regional Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="settings-card">
          <div className="settings-section">
            <h2 className="section-title">Appearance</h2>
            <p className="section-description">Customize how the app looks</p>

            <form onSubmit={handlePreferencesSubmit} className="settings-form-inner">
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
                  Choose how the application appears on your device
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
                  Select your preferred language for the interface
                </p>
              </div>

              {saveError && <div className="form-error">{saveError}</div>}
              {saveSuccess && (
                <div className="form-success">Settings saved successfully!</div>
              )}

              <div className="form-actions">
                <button type="submit" className="save-button" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Appearance'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="settings-card danger-zone">
          <div className="settings-section">
            <h2 className="section-title danger-title">Danger Zone</h2>
            <p className="section-description">
              Irreversible actions that affect your account
            </p>

            <div className="danger-content">
              <div className="danger-item">
                <div className="danger-item-info">
                  <h3>Delete Account</h3>
                  <p>
                    Permanently delete your account and all associated data. This action
                    cannot be undone.
                  </p>
                </div>

                <div className="danger-form">
                  <div className="form-group">
                    <label htmlFor="deleteConfirmation" className="form-label">
                      Type DELETE to confirm
                    </label>
                    <input
                      type="text"
                      id="deleteConfirmation"
                      value={deleteConfirmation}
                      onChange={(e) => {
                        setDeleteConfirmation(e.target.value);
                        setDeleteError(null);
                      }}
                      className="form-input"
                      placeholder="DELETE"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="deletePassword" className="form-label">
                      Enter your password
                    </label>
                    <input
                      type="password"
                      id="deletePassword"
                      value={deletePassword}
                      onChange={(e) => {
                        setDeletePassword(e.target.value);
                        setDeleteError(null);
                      }}
                      className="form-input"
                      placeholder="Your password"
                      autoComplete="current-password"
                    />
                  </div>

                  {deleteError && <div className="form-error">{deleteError}</div>}

                  <button
                    type="button"
                    className="delete-button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || deleteConfirmation !== 'DELETE'}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete My Account'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
