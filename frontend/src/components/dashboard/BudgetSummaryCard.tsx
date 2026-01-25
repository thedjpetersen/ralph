import { Link } from 'react-router-dom';
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

  if (isLoading) {
    return (
      <div className="budget-summary-card">
        <div className="budget-summary-header">
          <div className="skeleton-title" />
          <div className="skeleton-badge" />
        </div>
        <div className="skeleton-progress" />
        <div className="budget-summary-stats">
          <div className="skeleton-stat" />
          <div className="skeleton-stat" />
          <div className="skeleton-stat" />
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="budget-summary-card budget-summary-empty">
        <div className="budget-summary-empty-content">
          <span className="empty-icon">$</span>
          <h3>No Active Budget</h3>
          <p>Create a budget to start tracking your spending</p>
          <Link to="/budgets/new" className="create-budget-link">
            Create Budget
          </Link>
        </div>
      </div>
    );
  }

  const periodLabel = budget.current_period
    ? `${formatDate(budget.current_period.start_date)} - ${formatDate(budget.current_period.end_date)}`
    : PERIOD_TYPE_LABELS[budget.period_type];

  return (
    <div className="budget-summary-card">
      <div className="budget-summary-header">
        <div className="budget-summary-title">
          <h3>{budget.name}</h3>
          {budget.is_default && <span className="default-badge">Default</span>}
        </div>
        <span className={`budget-percentage ${getStatusClass(budget.percentage_used)}`}>
          {budget.percentage_used.toFixed(0)}% used
        </span>
      </div>

      <div className="budget-summary-period">
        <span className="period-label">{periodLabel}</span>
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

      <div className="budget-summary-stats">
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

      <Link to={`/budgets/${budget.id}`} className="budget-summary-link">
        View Details
      </Link>
    </div>
  );
}
