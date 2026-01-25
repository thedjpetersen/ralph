import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  retirementPlansApi,
  type RetirementPlan,
  type RetirementPlanStatus,
  type RetirementStrategy,
} from '../api/client';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import './RetirementPlans.css';

const STATUS_OPTIONS: { value: RetirementPlanStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const STRATEGY_OPTIONS: { value: RetirementStrategy | ''; label: string }[] = [
  { value: '', label: 'All Strategies' },
  { value: 'traditional', label: 'Traditional' },
  { value: 'fire', label: 'FIRE' },
  { value: 'coast_fire', label: 'Coast FIRE' },
  { value: 'barista_fire', label: 'Barista FIRE' },
  { value: 'lean_fire', label: 'Lean FIRE' },
  { value: 'fat_fire', label: 'Fat FIRE' },
];

const STRATEGY_LABELS: Record<RetirementStrategy, string> = {
  traditional: 'Traditional',
  fire: 'FIRE',
  coast_fire: 'Coast FIRE',
  barista_fire: 'Barista FIRE',
  lean_fire: 'Lean FIRE',
  fat_fire: 'Fat FIRE',
};

export function RetirementPlans() {
  const { currentAccount } = useAccountStore();

  const [plans, setPlans] = useState<RetirementPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RetirementPlanStatus | ''>('');
  const [strategyFilter, setStrategyFilter] = useState<RetirementStrategy | ''>('');

  const fetchPlans = useCallback(async () => {
    if (!currentAccount?.id) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await retirementPlansApi.list(currentAccount.id, {
        status: statusFilter || undefined,
        strategy: strategyFilter || undefined,
      });
      setPlans(response.plans);
    } catch {
      setError('Failed to load retirement plans');
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount?.id, statusFilter, strategyFilter]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as RetirementPlanStatus | '');
  }, []);

  const handleStrategyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStrategyFilter(e.target.value as RetirementStrategy | '');
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setStrategyFilter('');
  }, []);

  const getStatusClass = (status: RetirementPlanStatus) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'draft':
        return 'status-draft';
      case 'archived':
        return 'status-archived';
      default:
        return '';
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hasActiveFilters = statusFilter !== '' || strategyFilter !== '';

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="retirement-plans-page">
          <div className="retirement-plans-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view retirement plans.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && plans.length === 0) {
    return (
      <PageTransition>
        <div className="retirement-plans-page">
          <div className="retirement-plans-header">
            <h1>Retirement Plans</h1>
            <p className="retirement-plans-subtitle">Plan your path to financial independence</p>
          </div>
          <AccountsListSkeleton count={4} />
        </div>
      </PageTransition>
    );
  }

  if (error && plans.length === 0) {
    return (
      <PageTransition>
        <div className="retirement-plans-page">
          <div className="retirement-plans-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={fetchPlans} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="retirement-plans-page">
        <div className="retirement-plans-header">
          <div className="retirement-plans-header-row">
            <div>
              <h1>Retirement Plans</h1>
              <p className="retirement-plans-subtitle">Plan your path to financial independence</p>
            </div>
            <Link to="/retirement-plans/new" className="create-plan-button">
              Create Plan
            </Link>
          </div>
        </div>

        <div className="retirement-plans-filters">
          <div className="filter-row">
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
            <select
              value={strategyFilter}
              onChange={handleStrategyChange}
              className="filter-select"
            >
              {STRATEGY_OPTIONS.map((strategy) => (
                <option key={strategy.value} value={strategy.value}>
                  {strategy.label}
                </option>
              ))}
            </select>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-button">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="retirement-plans-empty">
            <h2>No Retirement Plans Found</h2>
            <p>
              {hasActiveFilters
                ? 'No plans match your filter criteria.'
                : "You don't have any retirement plans yet."}
            </p>
            {!hasActiveFilters && (
              <Link to="/retirement-plans/new" className="create-plan-link">
                Create your first retirement plan
              </Link>
            )}
          </div>
        ) : (
          <div className="retirement-plans-grid">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                to={`/retirement-plans/${plan.id}`}
                className="plan-card"
              >
                <div className="plan-card-header">
                  <div className="plan-card-title">
                    <h3>{plan.name}</h3>
                    {plan.is_default && (
                      <span className="default-badge">Default</span>
                    )}
                  </div>
                  <span className={`plan-status ${getStatusClass(plan.status)}`}>
                    {plan.status}
                  </span>
                </div>

                {plan.description && (
                  <p className="plan-card-description">{plan.description}</p>
                )}

                <div className="plan-card-details">
                  <div className="plan-detail-item">
                    <span className="plan-detail-label">Strategy</span>
                    <span className="plan-detail-value plan-strategy">
                      {STRATEGY_LABELS[plan.strategy]}
                    </span>
                  </div>
                  <div className="plan-detail-item">
                    <span className="plan-detail-label">Target Age</span>
                    <span className="plan-detail-value">
                      {plan.target_retirement_age}
                    </span>
                  </div>
                  <div className="plan-detail-item">
                    <span className="plan-detail-label">Current Age</span>
                    <span className="plan-detail-value">
                      {plan.current_age}
                    </span>
                  </div>
                </div>

                <div className="plan-card-financials">
                  <div className="plan-detail-item">
                    <span className="plan-detail-label">Annual Spending</span>
                    <span className="plan-detail-value plan-amount">
                      {formatAmount(plan.target_annual_spending)}
                    </span>
                  </div>
                </div>

                <div className="plan-card-footer">
                  <span className="plan-feature">
                    {plan.target_retirement_age - plan.current_age} years to go
                  </span>
                  <span className="plan-feature">
                    SWR: {(plan.safe_withdrawal_rate * 100).toFixed(1)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
