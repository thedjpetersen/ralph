import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useBudgetsStore,
  type BudgetDetail as BudgetDetailType,
  type BudgetStatus,
  type BudgetPeriodType,
  type BudgetPeriodStatus,
} from '../stores/budgets';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { BudgetProgress } from '../components/BudgetProgress';
import { AllocationForm } from '../components/AllocationForm';
import { SettingsFormSkeleton } from '../components/skeletons';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { toast } from '../stores/toast';
import './BudgetDetail.css';

const PERIOD_TYPE_LABELS: Record<BudgetPeriodType, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

export function BudgetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentAccount } = useAccountStore();
  const {
    currentBudget,
    periods,
    allocations,
    isLoading,
    error,
    fetchBudgetDetail,
    fetchPeriods,
    deleteBudget,
    activateBudget,
    deactivateBudget,
    setDefaultBudget,
  } = useBudgetsStore();

  const [budget, setBudget] = useState<BudgetDetailType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAllocationForm, setShowAllocationForm] = useState(false);

  useEffect(() => {
    if (id && currentAccount?.id) {
      fetchBudgetDetail(currentAccount.id, id)
        .then((fetched) => {
          setBudget(fetched);
        })
        .catch(() => {
          // Error handled by store
        });
      fetchPeriods(currentAccount.id, id);
    }
  }, [id, currentAccount?.id, fetchBudgetDetail, fetchPeriods]);

  useEffect(() => {
    if (currentBudget && currentBudget.id === id) {
      setBudget(currentBudget);
    }
  }, [currentBudget, id]);

  const handleDelete = async () => {
    if (!id || !currentAccount?.id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteBudget(currentAccount.id, id);
      toast.success('Budget deleted successfully');
      navigate('/budgets');
    } catch {
      setDeleteError('Failed to delete budget');
      toast.error('Failed to delete budget');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleActivate = async () => {
    if (!id || !currentAccount?.id) return;
    try {
      await activateBudget(currentAccount.id, id);
      toast.success('Budget activated');
      if (budget) {
        setBudget({ ...budget, status: 'active' });
      }
    } catch {
      toast.error('Failed to activate budget');
    }
  };

  const handleDeactivate = async () => {
    if (!id || !currentAccount?.id) return;
    try {
      await deactivateBudget(currentAccount.id, id);
      toast.success('Budget deactivated');
      if (budget) {
        setBudget({ ...budget, status: 'inactive' });
      }
    } catch {
      toast.error('Failed to deactivate budget');
    }
  };

  const handleSetDefault = async () => {
    if (!id || !currentAccount?.id) return;
    try {
      await setDefaultBudget(currentAccount.id, id);
      toast.success('Budget set as default');
      if (budget) {
        setBudget({ ...budget, is_default: true });
      }
    } catch {
      toast.error('Failed to set budget as default');
    }
  };

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

  const getPeriodStatusClass = (status: BudgetPeriodStatus) => {
    switch (status) {
      case 'active':
        return 'period-status-active';
      case 'upcoming':
        return 'period-status-upcoming';
      case 'closed':
        return 'period-status-closed';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="budget-detail-page">
          <div className="detail-error">
            <h2>No Account Selected</h2>
            <p>Please select an account to view budget details.</p>
            <button onClick={() => navigate('/accounts')} className="back-button">
              Select an Account
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && !budget) {
    return (
      <PageTransition>
        <div className="budget-detail-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && !budget) {
    return (
      <PageTransition>
        <div className="budget-detail-page">
          <div className="detail-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/budgets')} className="back-button">
              Back to Budgets
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!budget) {
    return (
      <PageTransition>
        <div className="budget-detail-page">
          <div className="detail-error">
            <h2>Budget Not Found</h2>
            <p>The budget you're looking for doesn't exist.</p>
            <button onClick={() => navigate('/budgets')} className="back-button">
              Back to Budgets
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="budget-detail-page">
        <div className="detail-header">
          <Link to="/budgets" className="back-link">
            &larr; Back to Budgets
          </Link>
          <div className="detail-header-row">
            <div className="detail-header-info">
              <div>
                <h1>{budget.name}</h1>
                <div className="detail-meta">
                  <span className={`budget-status ${getStatusClass(budget.status)}`}>
                    {budget.status}
                  </span>
                  <span className="budget-period-type">
                    {PERIOD_TYPE_LABELS[budget.period_type]}
                  </span>
                  {budget.is_default && (
                    <span className="default-badge">Default</span>
                  )}
                </div>
              </div>
            </div>
            <div className="detail-actions">
              <Link to={`/budgets/${budget.id}/edit`} className="edit-button">
                Edit Budget
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="delete-button"
                disabled={isDeleting}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {deleteError && <div className="detail-error-message">{deleteError}</div>}

        <div className="detail-content">
          {/* Budget Overview */}
          <div className="budget-overview-section">
            <div className="budget-progress-container">
              <BudgetProgress
                spent={budget.total_spent}
                total={budget.total_amount}
                currency={budget.currency}
              />
            </div>
            <div className="budget-overview-stats">
              <div className="stat-item">
                <span className="stat-label">Total Budget</span>
                <span className="stat-value">
                  {formatAmount(budget.total_amount, budget.currency)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Spent</span>
                <span className="stat-value spent">
                  {formatAmount(budget.total_spent, budget.currency)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Remaining</span>
                <span className={`stat-value ${budget.total_remaining < 0 ? 'over-budget' : 'remaining'}`}>
                  {formatAmount(budget.total_remaining, budget.currency)}
                </span>
              </div>
            </div>
          </div>

          {budget.description && (
            <div className="detail-section">
              <h2>Description</h2>
              <p className="detail-description">{budget.description}</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="detail-section">
            <h2>Quick Actions</h2>
            <div className="quick-actions">
              {budget.status === 'inactive' && (
                <button onClick={handleActivate} className="action-button action-activate">
                  Activate Budget
                </button>
              )}
              {budget.status === 'active' && (
                <button onClick={handleDeactivate} className="action-button action-deactivate">
                  Deactivate Budget
                </button>
              )}
              {!budget.is_default && (
                <button onClick={handleSetDefault} className="action-button action-default">
                  Set as Default
                </button>
              )}
            </div>
          </div>

          {/* Budget Details */}
          <div className="detail-section">
            <h2>Budget Details</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Period Type</span>
                <span className="detail-value">{PERIOD_TYPE_LABELS[budget.period_type]}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Currency</span>
                <span className="detail-value">{budget.currency}</span>
              </div>
              {budget.start_date && (
                <div className="detail-item">
                  <span className="detail-label">Start Date</span>
                  <span className="detail-value">{formatDate(budget.start_date)}</span>
                </div>
              )}
              {budget.end_date && (
                <div className="detail-item">
                  <span className="detail-label">End Date</span>
                  <span className="detail-value">{formatDate(budget.end_date)}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Rollover Enabled</span>
                <span className="detail-value">{budget.rollover_enabled ? 'Yes' : 'No'}</span>
              </div>
              {budget.alert_threshold && (
                <div className="detail-item">
                  <span className="detail-label">Alert Threshold</span>
                  <span className="detail-value">{budget.alert_threshold}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Current Period */}
          {budget.current_period && (
            <div className="detail-section">
              <h2>Current Period</h2>
              <div className="current-period-card">
                <div className="period-header">
                  <span className={`period-status ${getPeriodStatusClass(budget.current_period.status)}`}>
                    {budget.current_period.status}
                  </span>
                  <span className="period-dates">
                    {formatDate(budget.current_period.start_date)} - {formatDate(budget.current_period.end_date)}
                  </span>
                </div>
                <BudgetProgress
                  spent={budget.current_period.spent_amount}
                  total={budget.current_period.total_amount}
                  currency={budget.currency}
                />
                <div className="period-stats">
                  <div className="period-stat">
                    <span className="period-stat-label">Budget</span>
                    <span className="period-stat-value">
                      {formatAmount(budget.current_period.total_amount, budget.currency)}
                    </span>
                  </div>
                  <div className="period-stat">
                    <span className="period-stat-label">Spent</span>
                    <span className="period-stat-value">
                      {formatAmount(budget.current_period.spent_amount, budget.currency)}
                    </span>
                  </div>
                  <div className="period-stat">
                    <span className="period-stat-label">Remaining</span>
                    <span className="period-stat-value">
                      {formatAmount(budget.current_period.remaining_amount, budget.currency)}
                    </span>
                  </div>
                  {budget.current_period.rollover_amount > 0 && (
                    <div className="period-stat">
                      <span className="period-stat-label">Rollover</span>
                      <span className="period-stat-value">
                        {formatAmount(budget.current_period.rollover_amount, budget.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Allocations */}
          <div className="detail-section">
            <div className="section-header">
              <h2>Allocations</h2>
              <button
                onClick={() => setShowAllocationForm(true)}
                className="add-allocation-button"
              >
                Add Allocation
              </button>
            </div>
            {allocations.length === 0 ? (
              <div className="allocations-empty">
                <p>No allocations defined yet.</p>
                <button
                  onClick={() => setShowAllocationForm(true)}
                  className="create-allocation-link"
                >
                  Create your first allocation
                </button>
              </div>
            ) : (
              <div className="allocations-list">
                {allocations.map((allocation) => (
                  <div key={allocation.id} className="allocation-item">
                    <div className="allocation-info">
                      <span className="allocation-name">{allocation.name}</span>
                      {allocation.category_name && (
                        <span className="allocation-category">{allocation.category_name}</span>
                      )}
                      {allocation.description && (
                        <span className="allocation-description">{allocation.description}</span>
                      )}
                    </div>
                    <div className="allocation-amount">
                      {allocation.is_percentage
                        ? `${allocation.percentage}%`
                        : formatAmount(allocation.amount, budget.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Budget Periods */}
          {periods.length > 0 && (
            <div className="detail-section">
              <h2>Period History</h2>
              <div className="periods-list">
                {periods.map((period) => (
                  <div key={period.id} className="period-item">
                    <div className="period-item-header">
                      <span className={`period-status ${getPeriodStatusClass(period.status)}`}>
                        {period.status}
                      </span>
                      <span className="period-number">Period #{period.period_number}</span>
                    </div>
                    <div className="period-item-dates">
                      {formatDate(period.start_date)} - {formatDate(period.end_date)}
                    </div>
                    <BudgetProgress
                      spent={period.spent_amount}
                      total={period.total_amount}
                      showLabels={false}
                    />
                    <div className="period-item-amounts">
                      <span>
                        {formatAmount(period.spent_amount, budget.currency)} of{' '}
                        {formatAmount(period.total_amount, budget.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goals */}
          {budget.goals && budget.goals.length > 0 && (
            <div className="detail-section">
              <h2>Goals</h2>
              <div className="goals-list">
                {budget.goals.map((goal) => (
                  <div key={goal.id} className="goal-item">
                    <div className="goal-header">
                      <span className="goal-name">{goal.name}</span>
                      <span className={`goal-status goal-status-${goal.status}`}>
                        {goal.status}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="goal-description">{goal.description}</p>
                    )}
                    <BudgetProgress
                      spent={goal.current_amount}
                      total={goal.target_amount}
                      currency={budget.currency}
                      showLabels={false}
                    />
                    <div className="goal-progress-text">
                      {formatAmount(goal.current_amount, budget.currency)} of{' '}
                      {formatAmount(goal.target_amount, budget.currency)} ({goal.progress_percentage.toFixed(0)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="detail-section detail-timestamps">
            <div className="timestamp-item">
              <span className="detail-label">Created</span>
              <span className="detail-value">
                {formatDateTime(budget.created_at)}
              </span>
            </div>
            <div className="timestamp-item">
              <span className="detail-label">Updated</span>
              <span className="detail-value">
                {formatDateTime(budget.updated_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete Budget"
          description={`Are you sure you want to delete "${budget.name}"?`}
          confirmLabel="Delete Budget"
          cancelLabel="Cancel"
          variant="danger"
          isLoading={isDeleting}
        >
          <p>This action cannot be undone. All budget periods, allocations, and associated data will be permanently removed.</p>
        </ConfirmDialog>

        {/* Allocation Form Modal */}
        {showAllocationForm && (
          <AllocationForm
            accountId={currentAccount.id}
            budgetId={budget.id}
            currency={budget.currency}
            onClose={() => setShowAllocationForm(false)}
            onSuccess={() => {
              setShowAllocationForm(false);
              // Refresh budget detail to get updated allocations
              if (currentAccount?.id && id) {
                fetchBudgetDetail(currentAccount.id, id);
              }
            }}
          />
        )}
      </div>
    </PageTransition>
  );
}
