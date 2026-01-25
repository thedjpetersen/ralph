import './BudgetProgress.css';

interface BudgetProgressProps {
  spent: number;
  total: number;
  currency?: string;
  showLabels?: boolean;
  alertThreshold?: number;
}

export function BudgetProgress({
  spent,
  total,
  currency = 'USD',
  showLabels = true,
  alertThreshold = 80,
}: BudgetProgressProps) {
  const percentage = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
  const remaining = total - spent;
  const isOverBudget = spent > total;
  const isNearThreshold = percentage >= alertThreshold && !isOverBudget;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getProgressClass = () => {
    if (isOverBudget) return 'progress-over';
    if (isNearThreshold) return 'progress-warning';
    if (percentage >= 50) return 'progress-moderate';
    return 'progress-good';
  };

  return (
    <div className="budget-progress">
      <div className="progress-bar-container">
        <div
          className={`progress-bar-fill ${getProgressClass()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        {isOverBudget && (
          <div
            className="progress-bar-overflow"
            style={{ width: `${Math.min(((spent - total) / total) * 100, 100)}%` }}
          />
        )}
      </div>

      {showLabels && (
        <div className="progress-labels">
          <div className="progress-spent">
            <span className="progress-label">Spent</span>
            <span className={`progress-value ${isOverBudget ? 'over-budget' : ''}`}>
              {formatAmount(spent)}
            </span>
          </div>
          <div className="progress-percentage">
            <span className={`percentage-value ${getProgressClass()}`}>
              {percentage.toFixed(0)}%
            </span>
          </div>
          <div className="progress-remaining">
            <span className="progress-label">Remaining</span>
            <span className={`progress-value ${remaining < 0 ? 'over-budget' : ''}`}>
              {formatAmount(remaining)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
