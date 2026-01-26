import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Account, AccountMember } from '../stores/account';
import { useAccountStore } from '../stores/account';
import { useUserStore } from '../stores/user';
import { PageTransition } from '../components/PageTransition';
import { SettingsFormSkeleton } from '../components/skeletons';
import './AccountSettings.css';

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
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
];

export function AccountSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    accounts,
    members,
    isLoading,
    error,
    fetchAccount,
    updateAccount,
    fetchMembers,
    inviteMember,
    removeMember,
    leaveAccount,
  } = useAccountStore();
  const { user } = useUserStore();

  const [account, setAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    currency: '',
    timezone: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Invite member state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AccountMember['role']>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Remove member state
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  // Leave account state
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Find current user's membership
  const currentUserMember = members.find((m) => m.userId === user?.id);
  const isOwner = currentUserMember?.role === 'owner';

  useEffect(() => {
    if (id) {
      const existingAccount = accounts.find((a) => a.id === id);
      if (existingAccount) {
        setAccount(existingAccount);
        setFormData({
          name: existingAccount.name,
          currency: existingAccount.currency || '',
          timezone: existingAccount.timezone || '',
        });
      } else {
        fetchAccount(id)
          .then((fetched) => {
            setAccount(fetched);
            setFormData({
              name: fetched.name,
              currency: fetched.currency || '',
              timezone: fetched.timezone || '',
            });
          })
          .catch(() => {
            // Error is handled by the store
          });
      }
      fetchMembers(id);
    }
  }, [id, accounts, fetchAccount, fetchMembers]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !account) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateAccount(id, {
        name: formData.name,
        currency: formData.currency || undefined,
        timezone: formData.timezone || undefined,
      });
      setSaveSuccess(true);
    } catch {
      setSaveError('Failed to save account settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      await inviteMember(id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch {
      setInviteError('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!id) return;

    const confirmed = window.confirm(
      'Are you sure you want to remove this member from the account?'
    );
    if (!confirmed) return;

    setRemovingMemberId(memberId);
    try {
      await removeMember(id, memberId);
    } catch {
      // Error is handled by the store
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleLeaveAccount = async () => {
    if (!id) return;

    setIsLeaving(true);
    setLeaveError(null);

    try {
      await leaveAccount(id);
      navigate('/accounts');
    } catch {
      setLeaveError('Failed to leave account');
    } finally {
      setIsLeaving(false);
    }
  };

  const getRoleBadgeClass = (role: AccountMember['role']) => {
    switch (role) {
      case 'owner':
        return 'role-badge owner';
      case 'admin':
        return 'role-badge admin';
      default:
        return 'role-badge member';
    }
  };

  if (isLoading && !account) {
    return (
      <PageTransition>
        <div className="account-settings-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && !account) {
    return (
      <PageTransition>
        <div className="account-settings-page">
          <div className="settings-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/accounts')} className="back-button">
              Back to Accounts
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!account) {
    return (
      <PageTransition>
        <div className="account-settings-page">
          <div className="settings-error">
            <h2>Account Not Found</h2>
            <p>The account you're looking for doesn't exist.</p>
            <button onClick={() => navigate('/accounts')} className="back-button">
              Back to Accounts
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="account-settings-page">
        <div className="settings-header">
          <Link to="/accounts" className="back-link">
            &larr; Back to Accounts
          </Link>
          <h1>Account Settings</h1>
          <p className="settings-subtitle">
            Manage settings for <strong>{account.name}</strong>
          </p>
        </div>

        {/* Account Settings Form */}
        <section className="settings-section">
          <h2 className="section-title">General Settings</h2>
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Account Name
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
              <p className="form-help">
                The display name for this account.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="currency" className="form-label">
                Default Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="">Select a currency</option>
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
              <p className="form-help">
                The default currency for this account's transactions.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="timezone" className="form-label">
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="">Select a timezone</option>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="form-help">
                The timezone used for displaying dates and times.
              </p>
            </div>

            {saveError && <div className="form-error">{saveError}</div>}
            {saveSuccess && (
              <div className="form-success">Settings saved successfully!</div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/accounts')}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="save-button"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>

        {/* Members Section */}
        <section className="settings-section">
          <div className="section-header">
            <h2 className="section-title">Account Members</h2>
            <button
              className="invite-button"
              onClick={() => setShowInviteForm(true)}
            >
              Invite Member
            </button>
          </div>

          {inviteSuccess && (
            <div className="form-success">Invitation sent successfully!</div>
          )}

          {showInviteForm && (
            <div className="invite-form-container">
              <form onSubmit={handleInvite} className="invite-form">
                <h3>Invite New Member</h3>
                <div className="invite-form-row">
                  <div className="form-group">
                    <label htmlFor="inviteEmail" className="form-label">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="inviteEmail"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="form-input"
                      placeholder="member@example.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="inviteRole" className="form-label">
                      Role
                    </label>
                    <select
                      id="inviteRole"
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as AccountMember['role'])
                      }
                      className="form-select"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                {inviteError && <div className="form-error">{inviteError}</div>}
                <div className="invite-form-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteEmail('');
                      setInviteRole('member');
                      setInviteError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={isInviting}
                  >
                    {isInviting ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="members-list">
            {members.length === 0 ? (
              <div className="members-empty">
                <p>No members found.</p>
                <p className="members-empty-hint">
                  Invite team members to collaborate on this account.
                </p>
              </div>
            ) : (
              <table className="members-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className="member-info">
                          <span className="member-name">{member.name}</span>
                          <span className="member-email">{member.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={getRoleBadgeClass(member.role)}>
                          {member.role}
                        </span>
                      </td>
                      <td className="joined-date">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </td>
                      <td>
                        {member.role !== 'owner' && member.userId !== user?.id && (
                          <button
                            className="remove-button"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={removingMemberId === member.id}
                          >
                            {removingMemberId === member.id
                              ? 'Removing...'
                              : 'Remove'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Leave Account Section */}
        {!isOwner && (
          <section className="settings-section danger-section">
            <h2 className="section-title danger-title">Leave Account</h2>
            <p className="danger-description">
              Once you leave this account, you will no longer have access to its data.
              You will need to be re-invited to regain access.
            </p>

            {!showLeaveConfirm ? (
              <button
                className="leave-button"
                onClick={() => setShowLeaveConfirm(true)}
              >
                Leave Account
              </button>
            ) : (
              <div className="leave-confirm">
                <p className="leave-confirm-message">
                  Are you sure you want to leave <strong>{account.name}</strong>?
                </p>
                {leaveError && <div className="form-error">{leaveError}</div>}
                <div className="leave-confirm-actions">
                  <button
                    className="cancel-button"
                    onClick={() => {
                      setShowLeaveConfirm(false);
                      setLeaveError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="confirm-leave-button"
                    onClick={handleLeaveAccount}
                    disabled={isLeaving}
                  >
                    {isLeaving ? 'Leaving...' : 'Yes, Leave Account'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </PageTransition>
  );
}
