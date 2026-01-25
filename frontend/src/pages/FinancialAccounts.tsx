import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  useFinancialStore,
  type FinancialAccountType,
  type FinancialAccountStatus,
} from '../stores/financial';
import { useAccountStore } from '../stores/account';
import { toast } from '../stores/toast';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import './FinancialAccounts.css';

const TYPE_OPTIONS: { value: FinancialAccountType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit' },
  { value: 'loan', label: 'Loan' },
  { value: 'investment', label: 'Investment' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: { value: FinancialAccountStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'closed', label: 'Closed' },
  { value: 'pending', label: 'Pending' },
];

const TYPE_LABELS: Record<FinancialAccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit Card',
  loan: 'Loan',
  investment: 'Investment',
  mortgage: 'Mortgage',
  other: 'Other',
};

const TYPE_ICONS: Record<FinancialAccountType, string> = {
  checking: '🏦',
  savings: '💰',
  credit: '💳',
  loan: '📝',
  investment: '📈',
  mortgage: '🏠',
  other: '🏧',
};

export function FinancialAccounts() {
  const { currentAccount } = useAccountStore();
  const {
    accounts,
    accountsSummary,
    isLoading,
    error,
    fetchAccounts,
    fetchAccountsSummary,
    setAccountActive,
    setAccountHidden,
  } = useFinancialStore();

  const [typeFilter, setTypeFilter] = useState<FinancialAccountType | ''>('');
  const [statusFilter, setStatusFilter] = useState<FinancialAccountStatus | ''>('');
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    if (currentAccount?.id) {
      fetchAccounts(currentAccount.id, {
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        is_hidden: showHidden ? undefined : false,
      });
      fetchAccountsSummary(currentAccount.id);
    }
  }, [currentAccount?.id, typeFilter, statusFilter, showHidden, fetchAccounts, fetchAccountsSummary]);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as FinancialAccountType | '');
  }, []);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as FinancialAccountStatus | '');
  }, []);

  const handleShowHiddenChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShowHidden(e.target.checked);
  }, []);

  const clearFilters = useCallback(() => {
    setTypeFilter('');
    setStatusFilter('');
    setShowHidden(false);
  }, []);

  const handleToggleActive = useCallback(
    async (id: string, currentActive: boolean) => {
      if (!currentAccount) return;
      try {
        await setAccountActive(currentAccount.id, id, !currentActive);
        toast.success(`Account ${currentActive ? 'deactivated' : 'activated'}`);
      } catch {
        toast.error('Failed to update account');
      }
    },
    [currentAccount, setAccountActive]
  );

  const handleToggleHidden = useCallback(
    async (id: string, currentHidden: boolean) => {
      if (!currentAccount) return;
      try {
        await setAccountHidden(currentAccount.id, id, !currentHidden);
        toast.success(`Account ${currentHidden ? 'shown' : 'hidden'}`);
      } catch {
        toast.error('Failed to update account');
      }
    },
    [currentAccount, setAccountHidden]
  );

  const formatAmount = (amount: number | undefined, currency: string = 'USD') => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'closed':
        return 'status-closed';
      case 'pending':
        return 'status-pending';
      default:
        return '';
    }
  };

  const hasActiveFilters = typeFilter !== '' || statusFilter !== '' || showHidden;

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="financial-accounts-page">
          <div className="financial-accounts-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view linked bank accounts.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && accounts.length === 0) {
    return (
      <PageTransition>
        <div className="financial-accounts-page">
          <div className="financial-accounts-header">
            <h1>Linked Accounts</h1>
            <p className="financial-accounts-subtitle">View and manage your linked bank accounts</p>
          </div>
          <AccountsListSkeleton count={4} />
        </div>
      </PageTransition>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <PageTransition>
        <div className="financial-accounts-page">
          <div className="financial-accounts-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={() => fetchAccounts(currentAccount.id)}
              className="retry-button"
            >
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="financial-accounts-page">
        <div className="financial-accounts-header">
          <div className="financial-accounts-header-row">
            <div>
              <h1>Linked Accounts</h1>
              <p className="financial-accounts-subtitle">
                View and manage your linked bank accounts
              </p>
            </div>
            <Link to="/connections" className="manage-connections-button">
              Manage Connections
            </Link>
          </div>
        </div>

        {accountsSummary && (
          <div className="accounts-summary">
            <div className="summary-card">
              <span className="summary-label">Total Balance</span>
              <span className="summary-value">
                {formatAmount(accountsSummary.total_current_balance, accountsSummary.currency)}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Available</span>
              <span className="summary-value">
                {formatAmount(accountsSummary.total_available_balance, accountsSummary.currency)}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Accounts</span>
              <span className="summary-value">{accountsSummary.total_accounts}</span>
            </div>
          </div>
        )}

        <div className="financial-accounts-filters">
          <div className="filter-row">
            <select
              value={typeFilter}
              onChange={handleTypeChange}
              className="filter-select"
            >
              {TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="filter-select"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <label className="checkbox-filter">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={handleShowHiddenChange}
              />
              Show hidden
            </label>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-button">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="financial-accounts-empty">
            <h2>No Accounts Found</h2>
            <p>
              {hasActiveFilters
                ? 'No accounts match your filter criteria.'
                : "You don't have any linked bank accounts yet."}
            </p>
            {!hasActiveFilters && (
              <Link to="/connections" className="connect-link">
                Connect a bank account
              </Link>
            )}
          </div>
        ) : (
          <div className="financial-accounts-list">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`financial-account-card ${account.is_hidden ? 'hidden-account' : ''}`}
              >
                <div className="account-card-main">
                  <div className="account-card-icon">
                    {TYPE_ICONS[account.type]}
                  </div>
                  <div className="account-card-info">
                    <div className="account-card-header">
                      <h3 className="account-name">
                        {account.name}
                        {account.mask && (
                          <span className="account-mask">••••{account.mask}</span>
                        )}
                      </h3>
                      <span className={`account-status ${getStatusClass(account.status)}`}>
                        {account.status}
                      </span>
                    </div>
                    <div className="account-card-meta">
                      <span className="account-type">{TYPE_LABELS[account.type]}</span>
                      {account.official_name && (
                        <span className="account-official-name">{account.official_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="account-card-balance">
                    <div className="balance-item">
                      <span className="balance-label">Current</span>
                      <span className="balance-value">
                        {formatAmount(account.current_balance, account.currency)}
                      </span>
                    </div>
                    {account.available_balance !== undefined && account.available_balance !== account.current_balance && (
                      <div className="balance-item">
                        <span className="balance-label">Available</span>
                        <span className="balance-value available">
                          {formatAmount(account.available_balance, account.currency)}
                        </span>
                      </div>
                    )}
                    {account.type === 'credit' && account.limit_balance !== undefined && (
                      <div className="balance-item">
                        <span className="balance-label">Limit</span>
                        <span className="balance-value limit">
                          {formatAmount(account.limit_balance, account.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="account-card-actions">
                  <button
                    onClick={() => handleToggleActive(account.id, account.is_active)}
                    className={`account-action-button ${account.is_active ? 'deactivate' : 'activate'}`}
                  >
                    {account.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleToggleHidden(account.id, account.is_hidden)}
                    className="account-action-button hide-button"
                  >
                    {account.is_hidden ? 'Show' : 'Hide'}
                  </button>
                </div>
                {account.last_balance_update && (
                  <div className="account-card-footer">
                    <span className="last-updated">
                      Updated {new Date(account.last_balance_update).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
