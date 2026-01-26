import { Link } from 'react-router-dom';
import { useId } from 'react';
import type { FinancialAccount, FinancialAccountsSummary } from '../../api/client';
import './AccountBalances.css';

interface AccountBalancesProps {
  accounts: FinancialAccount[];
  summary?: FinancialAccountsSummary | null;
  currency?: string;
  isLoading?: boolean;
  limit?: number;
}

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  checking: 'C',
  savings: 'S',
  credit: 'CC',
  loan: 'L',
  investment: 'I',
  mortgage: 'M',
  other: 'O',
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  checking: '#3498db',
  savings: '#2ecc71',
  credit: '#e74c3c',
  loan: '#f1c40f',
  investment: '#9b59b6',
  mortgage: '#e67e22',
  other: '#95a5a6',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Checking account',
  savings: 'Savings account',
  credit: 'Credit card',
  loan: 'Loan',
  investment: 'Investment account',
  mortgage: 'Mortgage',
  other: 'Account',
};

export function AccountBalances({
  accounts,
  summary,
  currency = 'USD',
  isLoading,
  limit = 5,
}: AccountBalancesProps) {
  const formatAmount = (amount?: number) => {
    if (amount === undefined || amount === null) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const visibleAccounts = accounts.filter((a) => !a.is_hidden && a.is_active);
  const displayAccounts = visibleAccounts.slice(0, limit);
  const headingId = useId();
  const listId = useId();

  const totalBalance = summary?.total_current_balance ??
    visibleAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

  if (isLoading) {
    return (
      <section
        className="account-balances"
        aria-labelledby={headingId}
        aria-busy="true"
      >
        <div className="account-balances-header">
          <h3 id={headingId}>Account Balances</h3>
          <div className="skeleton-total" aria-hidden="true" />
        </div>
        <div
          className="accounts-list"
          role="list"
          aria-label="Loading accounts"
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="account-item skeleton"
              role="listitem"
              aria-hidden="true"
            >
              <div className="skeleton-icon" />
              <div className="skeleton-content">
                <div className="skeleton-title" />
                <div className="skeleton-subtitle" />
              </div>
              <div className="skeleton-amount" />
            </div>
          ))}
        </div>
        <span className="sr-only" role="status">Loading account balances</span>
      </section>
    );
  }

  if (accounts.length === 0) {
    return (
      <section
        className="account-balances account-balances-empty"
        aria-labelledby={headingId}
      >
        <div className="account-balances-header">
          <h3 id={headingId}>Account Balances</h3>
        </div>
        <div className="account-balances-empty-content" role="status">
          <span className="empty-icon" aria-hidden="true">B</span>
          <p>No accounts connected</p>
          <Link to="/accounts/connect" className="connect-account-link">
            Connect Account
          </Link>
        </div>
      </section>
    );
  }

  const getAccessibleLabel = (account: FinancialAccount) => {
    const typeLabel = ACCOUNT_TYPE_LABELS[account.type] || 'Account';
    const balance = formatAmount(account.current_balance);
    const mask = account.mask ? ` ending in ${account.mask}` : '';
    return `${account.name}, ${typeLabel}${mask}, balance ${balance}`;
  };

  return (
    <section
      className="account-balances"
      aria-labelledby={headingId}
    >
      <div className="account-balances-header">
        <h3 id={headingId}>Account Balances</h3>
        <span className="total-balance" aria-label={`Total balance: ${formatAmount(totalBalance)}`}>
          {formatAmount(totalBalance)}
        </span>
      </div>
      <ul
        id={listId}
        className="accounts-list"
        role="list"
        aria-label={`${displayAccounts.length} accounts`}
      >
        {displayAccounts.map((account) => (
          <li key={account.id} role="listitem">
            <Link
              to={`/accounts/${account.id}`}
              className="account-item"
              aria-label={getAccessibleLabel(account)}
            >
              <div
                className="account-icon"
                style={{ backgroundColor: `${ACCOUNT_TYPE_COLORS[account.type]}20`, color: ACCOUNT_TYPE_COLORS[account.type] }}
                aria-hidden="true"
              >
                <span>{ACCOUNT_TYPE_ICONS[account.type] || 'O'}</span>
              </div>
              <div className="account-content">
                <span className="account-name">{account.name}</span>
                <span className="account-meta">
                  {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                  {account.mask && ` ••${account.mask}`}
                </span>
              </div>
              <span
                className={`account-balance ${(account.current_balance || 0) < 0 ? 'balance-negative' : ''}`}
                aria-hidden="true"
              >
                {formatAmount(account.current_balance)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {visibleAccounts.length > limit && (
        <Link to="/accounts" className="view-all-accounts">
          View all {visibleAccounts.length} accounts
        </Link>
      )}
    </section>
  );
}
