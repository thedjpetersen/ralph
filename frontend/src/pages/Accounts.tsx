import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAccountStore } from '../stores/account';
import './Accounts.css';

export function Accounts() {
  const { accounts, isLoading, error, fetchAccounts, switchAccount } =
    useAccountStore();

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  if (isLoading && accounts.length === 0) {
    return (
      <div className="accounts-page">
        <div className="accounts-loading">Loading accounts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="accounts-page">
        <div className="accounts-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => fetchAccounts()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="accounts-page">
      <div className="accounts-header">
        <h1>Accounts</h1>
        <p className="accounts-subtitle">Manage your accounts and settings</p>
      </div>

      {accounts.length === 0 ? (
        <div className="accounts-empty">
          <h2>No Accounts</h2>
          <p>You don't have any accounts yet.</p>
        </div>
      ) : (
        <div className="accounts-grid">
          {accounts.map((account) => (
            <div key={account.id} className="account-card">
              <div className="account-card-header">
                <h3 className="account-card-name">{account.name}</h3>
                <span className="account-card-email">{account.email}</span>
              </div>
              <div className="account-card-details">
                {account.currency && (
                  <div className="account-detail">
                    <span className="detail-label">Currency</span>
                    <span className="detail-value">{account.currency}</span>
                  </div>
                )}
                {account.timezone && (
                  <div className="account-detail">
                    <span className="detail-label">Timezone</span>
                    <span className="detail-value">{account.timezone}</span>
                  </div>
                )}
                <div className="account-detail">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">
                    {new Date(account.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="account-card-actions">
                <button
                  className="action-button primary"
                  onClick={() => switchAccount(account.id)}
                >
                  Switch to Account
                </button>
                <Link
                  to={`/accounts/${account.id}/settings`}
                  className="action-button"
                >
                  Settings
                </Link>
                <Link
                  to={`/accounts/${account.id}/members`}
                  className="action-button"
                >
                  Members
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
