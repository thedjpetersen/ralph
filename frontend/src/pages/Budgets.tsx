import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useBudgetsStore, type BudgetStatus, type BudgetPeriodType } from '../stores/budgets';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { BudgetProgress } from '../components/BudgetProgress';
import { AccountsListSkeleton } from '../components/skeletons';
import { announce } from '../stores/announcer';
import './Budgets.css';

const STATUS_OPTIONS: { value: BudgetStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

const PERIOD_TYPE_LABELS: Record<BudgetPeriodType, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

export function Budgets() {
  const { currentAccount } = useAccountStore();
  const {
    budgets,
    isLoading,
    error,
    fetchBudgets,
  } = useBudgetsStore();

  const [statusFilter, setStatusFilter] = useState<BudgetStatus | ''>('');
  const prevBudgetCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentAccount?.id) {
      fetchBudgets(currentAccount.id, {
        status: statusFilter || undefined,
      });
    }
  }, [currentAccount?.id, statusFilter, fetchBudgets]);

  // Announce filter results to screen readers
  useEffect(() => {
    if (prevBudgetCountRef.current !== null && prevBudgetCountRef.current !== budgets.length) {
      const message = budgets.length === 0
        ? 'No budgets found matching your filters'
        : `Showing ${budgets.length} budget${budgets.length === 1 ? '' : 's'}`;
      announce(message);
    }
    prevBudgetCountRef.current = budgets.length;
  }, [budgets.length]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as BudgetStatus | '');
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('');
  }, []);

  const getStatusClass = (status: BudgetStatus) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'archived':
        return 'status-archived';
      default:
        return '';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const hasActiveFilters = statusFilter !== '';

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="budgets-page">
          <div className="budgets-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view budgets.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && budgets.length === 0) {
    return (
      <PageTransition>
        <div className="budgets-page">
          <div className="budgets-header">
            <h1>Budgets</h1>
            <p className="budgets-subtitle">Manage your spending budgets</p>
          </div>
          <AccountsListSkeleton count={4} />
        </div>
      </PageTransition>
    );
  }

  if (error && budgets.length === 0) {
    return (
      <PageTransition>
        <div className="budgets-page">
          <div className="budgets-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={() => fetchBudgets(currentAccount.id)}
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
      <div className="budgets-page">
        <div className="budgets-header">
          <div className="budgets-header-row">
            <div>
              <h1>Budgets</h1>
              <p className="budgets-subtitle">Manage your spending budgets</p>
            </div>
            <Link to="/budgets/new" className="create-budget-button">
              Create Budget
            </Link>
          </div>
        </div>

        <div className="budgets-filters" role="search" aria-label="Filter budgets">
          <div className="filter-row">
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="filter-select"
              aria-label="Filter by budget status"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-button" aria-label="Clear all filters">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {budgets.length === 0 ? (
          <div className="budgets-empty">
            <h2>No Budgets Found</h2>
            <p>
              {hasActiveFilters
                ? 'No budgets match your filter criteria.'
                : "You don't have any budgets yet."}
            </p>
            {!hasActiveFilters && (
              <Link to="/budgets/new" className="create-budget-link">
                Create your first budget
              </Link>
            )}
          </div>
        ) : (
          <div className="budgets-grid" role="list" aria-label={`${budgets.length} budgets`}>
            {budgets.map((budget) => {
              const accessibleLabel = `${budget.name}, ${PERIOD_TYPE_LABELS[budget.period_type]}, ${formatAmount(budget.total_amount, budget.currency)}, ${budget.status}${budget.is_default ? ', default budget' : ''}`;
              return (
              <Link
                key={budget.id}
                to={`/budgets/${budget.id}`}
                className="budget-card"
                role="listitem"
                aria-label={accessibleLabel}
              >
                <div className="budget-card-header">
                  <div className="budget-card-title">
                    <h3>{budget.name}</h3>
                    {budget.is_default && (
                      <span className="default-badge">Default</span>
                    )}
                  </div>
                  <span className={`budget-status ${getStatusClass(budget.status)}`}>
                    {budget.status}
                  </span>
                </div>

                {budget.description && (
                  <p className="budget-card-description">{budget.description}</p>
                )}

                <div className="budget-card-details">
                  <div className="budget-detail-item">
                    <span className="budget-detail-label">Period</span>
                    <span className="budget-detail-value">
                      {PERIOD_TYPE_LABELS[budget.period_type]}
                    </span>
                  </div>
                  <div className="budget-detail-item">
                    <span className="budget-detail-label">Amount</span>
                    <span className="budget-detail-value budget-amount">
                      {formatAmount(budget.total_amount, budget.currency)}
                    </span>
                  </div>
                </div>

                <div className="budget-card-progress">
                  <BudgetProgress
                    spent={0}
                    total={budget.total_amount}
                    showLabels={false}
                  />
                </div>

                <div className="budget-card-footer" aria-hidden="true">
                  {budget.rollover_enabled && (
                    <span className="budget-feature">Rollover</span>
                  )}
                  {budget.alert_threshold && (
                    <span className="budget-feature">
                      Alert at {budget.alert_threshold}%
                    </span>
                  )}
                </div>
              </Link>
            );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
