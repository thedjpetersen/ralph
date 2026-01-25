import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Account, AccountMember } from '../stores/account';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { MembersPageSkeleton } from '../components/skeletons';
import './AccountMembers.css';

export function AccountMembers() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    accounts,
    members,
    isLoading,
    error,
    fetchAccount,
    fetchMembers,
    inviteMember,
    removeMember,
  } = useAccountStore();

  const [account, setAccount] = useState<Account | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AccountMember['role']>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const existingAccount = accounts.find((a) => a.id === id);
      if (existingAccount) {
        setAccount(existingAccount);
      } else {
        fetchAccount(id)
          .then((fetched) => {
            setAccount(fetched);
          })
          .catch(() => {
            // Error is handled by the store
          });
      }
      fetchMembers(id);
    }
  }, [id, accounts, fetchAccount, fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteError(null);

    try {
      await inviteMember(id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
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
        <div className="account-members-page">
          <MembersPageSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && !account) {
    return (
      <PageTransition>
        <div className="account-members-page">
          <div className="members-error">
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
        <div className="account-members-page">
          <div className="members-error">
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
      <div className="account-members-page">
        <div className="members-header">
          <Link to="/accounts" className="back-link">
            &larr; Back to Accounts
          </Link>
          <div className="members-header-content">
            <div>
              <h1>Account Members</h1>
              <p className="members-subtitle">
                Manage members for <strong>{account.name}</strong>
              </p>
            </div>
            <button
              className="invite-button"
              onClick={() => setShowInviteForm(true)}
            >
              Invite Member
            </button>
          </div>
        </div>

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
                      {member.role !== 'owner' && (
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
      </div>
    </PageTransition>
  );
}
