import './BudgetProgress.css';

interface BudgetProgressProps {
  spent: number;
  total: number;
  currency?: string;
  showLabels?: boolean;
  alertThreshold?: number;
  /** Accessible label for the progress bar */
  label?: string;
}

export function BudgetProgress({
  spent,
  total,
  currency = 'USD',
  showLabels = true,
  alertThreshold = 80,
  label = 'Budget progress',
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

  const getStatusText = () => {
    if (isOverBudget) return 'over budget';
    if (isNearThreshold) return 'near budget limit';
    return 'within budget';
  };

  // Create accessible value text for screen readers
  const valueText = `${formatAmount(spent)} spent of ${formatAmount(total)}, ${percentage.toFixed(0)}% used, ${getStatusText()}`;

  return (
    <div className="budget-progress">
      <div
        className="progress-bar-container"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={valueText}
      >
        <div
          className={`progress-bar-fill ${getProgressClass()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
          aria-hidden="true"
        />
        {isOverBudget && (
          <div
            className="progress-bar-overflow"
            style={{ width: `${Math.min(((spent - total) / total) * 100, 100)}%` }}
            aria-hidden="true"
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
