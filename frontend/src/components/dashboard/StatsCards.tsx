import { useId } from 'react';
import { Link } from 'react-router-dom';
import './StatsCards.css';

export interface StatsData {
  totalSpentMonth: number;
  receiptsCount: number;
  topStore: { name: string; amount: number } | null;
  budgetStatus: {
    percentage: number;
    remaining: number;
    status: 'on-track' | 'warning' | 'over-budget';
  } | null;
  currency: string;
}

interface StatsCardsProps {
  data: StatsData;
  isLoading?: boolean;
}

export function StatsCards({ data, isLoading }: StatsCardsProps) {
  const headingId = useId();

  const formatAmount = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatAmountDecimal = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'status-good';
      case 'warning':
        return 'status-warning';
      case 'over-budget':
        return 'status-over';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'On Track';
      case 'warning':
        return 'Near Limit';
      case 'over-budget':
        return 'Over Budget';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <section
        className="stats-cards"
        aria-labelledby={headingId}
        aria-busy="true"
      >
        <h3 id={headingId} className="sr-only">Monthly Statistics</h3>
        <div className="stats-cards-grid">
          <div className="stat-card stat-card-skeleton" aria-hidden="true">
            <div className="skeleton-icon" />
            <div className="skeleton-content">
              <div className="skeleton-label" />
              <div className="skeleton-value" />
            </div>
          </div>
          <div className="stat-card stat-card-skeleton" aria-hidden="true">
            <div className="skeleton-icon" />
            <div className="skeleton-content">
              <div className="skeleton-label" />
              <div className="skeleton-value" />
            </div>
          </div>
          <div className="stat-card stat-card-skeleton" aria-hidden="true">
            <div className="skeleton-icon" />
            <div className="skeleton-content">
              <div className="skeleton-label" />
              <div className="skeleton-value" />
            </div>
          </div>
          <div className="stat-card stat-card-skeleton" aria-hidden="true">
            <div className="skeleton-icon" />
            <div className="skeleton-content">
              <div className="skeleton-label" />
              <div className="skeleton-value" />
            </div>
          </div>
        </div>
        <span className="sr-only" role="status">Loading statistics</span>
      </section>
    );
  }

  return (
    <section className="stats-cards" aria-labelledby={headingId}>
      <h3 id={headingId} className="sr-only">Monthly Statistics</h3>
      <div className="stats-cards-grid">
        {/* Total Spent This Month */}
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon-spent" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Spent This Month</span>
            <span className="stat-card-value">{formatAmount(data.totalSpentMonth, data.currency)}</span>
          </div>
          <Link to="/transactions" className="stat-card-link" aria-label="View all transactions">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {/* Receipts Count */}
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon-receipts" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Receipts</span>
            <span className="stat-card-value">{data.receiptsCount}</span>
          </div>
          <Link to="/receipts" className="stat-card-link" aria-label="View all receipts">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {/* Top Store */}
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon-store" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Top Store</span>
            {data.topStore ? (
              <>
                <span className="stat-card-value stat-card-value-text">{data.topStore.name}</span>
                <span className="stat-card-subvalue">{formatAmountDecimal(data.topStore.amount, data.currency)}</span>
              </>
            ) : (
              <span className="stat-card-value stat-card-value-empty">No data</span>
            )}
          </div>
          <Link to="/stores" className="stat-card-link" aria-label="View all stores">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {/* Budget Status */}
        <div className="stat-card">
          <div className={`stat-card-icon stat-card-icon-budget ${data.budgetStatus ? getStatusClass(data.budgetStatus.status) : ''}`} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Budget Status</span>
            {data.budgetStatus ? (
              <>
                <span className={`stat-card-value stat-card-value-status ${getStatusClass(data.budgetStatus.status)}`}>
                  {getStatusLabel(data.budgetStatus.status)}
                </span>
                <span className="stat-card-subvalue">
                  {data.budgetStatus.percentage}% used
                </span>
              </>
            ) : (
              <span className="stat-card-value stat-card-value-empty">No budget</span>
            )}
          </div>
          <Link to="/budgets" className="stat-card-link" aria-label="View budgets">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
