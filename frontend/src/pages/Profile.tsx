import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserStore } from '../stores/user';
import './Profile.css';

export function Profile() {
  const { user, isLoading, error, fetchUser, updateUser } = useUserStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateUser({
        name: formData.name,
        email: formData.email,
      });
      setSaveSuccess(true);
    } catch {
      setSaveError('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !user) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="profile-page">
        <div className="profile-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => fetchUser()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Profile</h1>
        <p className="profile-subtitle">Manage your personal information</p>
      </div>

      <div className="profile-content">
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
            <h3>{user?.name || 'User'}</h3>
            <p>{user?.email || ''}</p>
            {user?.createdAt && (
              <p className="member-since">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Display Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="form-input"
              required
              minLength={1}
              maxLength={100}
            />
            <p className="form-help">Your name as it will appear across the application.</p>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              required
            />
            <p className="form-help">Your email address for notifications and login.</p>
          </div>

          {saveError && <div className="form-error">{saveError}</div>}
          {saveSuccess && (
            <div className="form-success">Profile saved successfully!</div>
          )}

          <div className="form-actions">
            <button type="submit" className="save-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        <div className="profile-links">
          <Link to="/settings" className="profile-link">
            User Preferences
          </Link>
          <Link to="/api-keys" className="profile-link">
            API Keys
          </Link>
        </div>
      </div>
    </div>
  );
}
