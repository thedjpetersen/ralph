import { Link } from 'react-router-dom';
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

  const totalBalance = summary?.total_current_balance ??
    visibleAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

  if (isLoading) {
    return (
      <div className="account-balances">
        <div className="account-balances-header">
          <h3>Account Balances</h3>
          <div className="skeleton-total" />
        </div>
        <div className="accounts-list">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="account-item skeleton">
              <div className="skeleton-icon" />
              <div className="skeleton-content">
                <div className="skeleton-title" />
                <div className="skeleton-subtitle" />
              </div>
              <div className="skeleton-amount" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="account-balances account-balances-empty">
        <div className="account-balances-header">
          <h3>Account Balances</h3>
        </div>
        <div className="account-balances-empty-content">
          <span className="empty-icon">B</span>
          <p>No accounts connected</p>
          <Link to="/accounts/connect" className="connect-account-link">
            Connect Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="account-balances">
      <div className="account-balances-header">
        <h3>Account Balances</h3>
        <span className="total-balance">{formatAmount(totalBalance)}</span>
      </div>
      <div className="accounts-list">
        {displayAccounts.map((account) => (
          <Link
            key={account.id}
            to={`/accounts/${account.id}`}
            className="account-item"
          >
            <div
              className="account-icon"
              style={{ backgroundColor: `${ACCOUNT_TYPE_COLORS[account.type]}20`, color: ACCOUNT_TYPE_COLORS[account.type] }}
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
            <span className={`account-balance ${(account.current_balance || 0) < 0 ? 'balance-negative' : ''}`}>
              {formatAmount(account.current_balance)}
            </span>
          </Link>
        ))}
      </div>
      {visibleAccounts.length > limit && (
        <Link to="/accounts" className="view-all-accounts">
          View all {visibleAccounts.length} accounts
        </Link>
      )}
    </div>
  );
}
