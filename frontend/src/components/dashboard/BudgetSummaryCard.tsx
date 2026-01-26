import { Link } from 'react-router-dom';
import { useId } from 'react';
import { BudgetProgress } from '../BudgetProgress';
import type { BudgetDetail, BudgetPeriodType } from '../../api/client';
import './BudgetSummaryCard.css';

interface BudgetSummaryCardProps {
  budget: BudgetDetail | null;
  isLoading?: boolean;
}

const PERIOD_TYPE_LABELS: Record<BudgetPeriodType, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

export function BudgetSummaryCard({ budget, isLoading }: BudgetSummaryCardProps) {
  const formatAmount = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusClass = (percentage: number) => {
    if (percentage >= 100) return 'status-over';
    if (percentage >= 80) return 'status-warning';
    if (percentage >= 50) return 'status-moderate';
    return 'status-good';
  };

  const getStatusLabel = (percentage: number) => {
    if (percentage >= 100) return 'over budget';
    if (percentage >= 80) return 'approaching limit';
    if (percentage >= 50) return 'moderate spending';
    return 'on track';
  };

  const headingId = useId();
  const statsId = useId();

  if (isLoading) {
    return (
      <section
        className="budget-summary-card"
        aria-labelledby={headingId}
        aria-busy="true"
      >
        <div className="budget-summary-header">
          <div className="skeleton-title" aria-hidden="true" />
          <div className="skeleton-badge" aria-hidden="true" />
        </div>
        <div className="skeleton-progress" aria-hidden="true" />
        <div className="budget-summary-stats" aria-hidden="true">
          <div className="skeleton-stat" />
          <div className="skeleton-stat" />
          <div className="skeleton-stat" />
        </div>
        <span className="sr-only" role="status">Loading budget summary</span>
      </section>
    );
  }

  if (!budget) {
    return (
      <section
        className="budget-summary-card budget-summary-empty"
        aria-labelledby={headingId}
      >
        <div className="budget-summary-empty-content" role="status">
          <span className="empty-icon" aria-hidden="true">$</span>
          <h3 id={headingId}>No Active Budget</h3>
          <p>Create a budget to start tracking your spending</p>
          <Link to="/budgets/new" className="create-budget-link">
            Create Budget
          </Link>
        </div>
      </section>
    );
  }

  const periodLabel = budget.current_period
    ? `${formatDate(budget.current_period.start_date)} - ${formatDate(budget.current_period.end_date)}`
    : PERIOD_TYPE_LABELS[budget.period_type];

  const statusLabel = getStatusLabel(budget.percentage_used);
  const accessibleSummary = `${budget.name} budget: ${formatAmount(budget.total_spent, budget.currency)} spent of ${formatAmount(budget.total_amount, budget.currency)}, ${budget.percentage_used.toFixed(0)}% used, ${statusLabel}`;

  return (
    <section
      className="budget-summary-card"
      aria-labelledby={headingId}
      aria-describedby={statsId}
    >
      <div className="budget-summary-header">
        <div className="budget-summary-title">
          <h3 id={headingId}>{budget.name}</h3>
          {budget.is_default && (
            <span className="default-badge" aria-label="Default budget">
              Default
            </span>
          )}
        </div>
        <span
          className={`budget-percentage ${getStatusClass(budget.percentage_used)}`}
          role="status"
          aria-label={`${budget.percentage_used.toFixed(0)}% of budget used, ${statusLabel}`}
        >
          {budget.percentage_used.toFixed(0)}% used
        </span>
      </div>

      <div className="budget-summary-period">
        <span className="period-label" aria-label={`Budget period: ${periodLabel}`}>
          {periodLabel}
        </span>
      </div>

      <div className="budget-summary-progress">
        <BudgetProgress
          spent={budget.total_spent}
          total={budget.total_amount}
          currency={budget.currency}
          showLabels={true}
          alertThreshold={budget.alert_threshold || 80}
        />
      </div>

      <div id={statsId} className="budget-summary-stats" role="group" aria-label="Budget statistics">
        <div className="summary-stat">
          <span className="stat-label">Budget</span>
          <span className="stat-value">{formatAmount(budget.total_amount, budget.currency)}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Spent</span>
          <span className="stat-value spent">{formatAmount(budget.total_spent, budget.currency)}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Remaining</span>
          <span className={`stat-value ${budget.total_remaining < 0 ? 'over-budget' : 'remaining'}`}>
            {formatAmount(budget.total_remaining, budget.currency)}
          </span>
        </div>
      </div>

      {/* Screen reader accessible summary */}
      <span className="sr-only">{accessibleSummary}</span>

      <Link
        to={`/budgets/${budget.id}`}
        className="budget-summary-link"
        aria-label={`View details for ${budget.name} budget`}
      >
        View Details
      </Link>
    </section>
  );
}
