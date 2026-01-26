import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAccountStore } from '../stores/account';
import { useBudgetsStore } from '../stores/budgets';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import { Modal } from '../components/ui/Modal';
import { toast } from '../stores/toast';
import { announce } from '../stores/announcer';
import {
  budgetGoalsApi,
  type BudgetGoal,
  type BudgetGoalType,
  type BudgetGoalStatus,
  type CreateBudgetGoalRequest,
  type UpdateBudgetGoalRequest,
} from '../api/client';
import './BudgetGoals.css';

const GOAL_TYPE_OPTIONS: { value: BudgetGoalType; label: string }[] = [
  { value: 'spending_limit', label: 'Spending Limit' },
  { value: 'savings_target', label: 'Savings Target' },
  { value: 'category_limit', label: 'Category Limit' },
  { value: 'merchant_limit', label: 'Merchant Limit' },
];

const GOAL_STATUS_OPTIONS: { value: BudgetGoalStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const GOAL_TYPE_LABELS: Record<BudgetGoalType, string> = {
  spending_limit: 'Spending Limit',
  savings_target: 'Savings Target',
  category_limit: 'Category Limit',
  merchant_limit: 'Merchant Limit',
};

interface GoalFormData {
  name: string;
  description: string;
  type: BudgetGoalType;
  target_amount: string;
  start_date: string;
  end_date: string;
}

const initialFormData: GoalFormData = {
  name: '',
  description: '',
  type: 'savings_target',
  target_amount: '',
  start_date: '',
  end_date: '',
};

export function BudgetGoals() {
  const { id: budgetId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentAccount } = useAccountStore();
  const { currentBudget, fetchBudgetDetail } = useBudgetsStore();

  const [goals, setGoals] = useState<BudgetGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BudgetGoalStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<BudgetGoalType | ''>('');
  const prevGoalCountRef = useRef<number | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<BudgetGoal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<BudgetGoal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<GoalFormData>(initialFormData);

  // Fetch budget details and goals
  useEffect(() => {
    const fetchData = async () => {
      if (!currentAccount?.id || !budgetId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch budget details if not already loaded
        if (!currentBudget || currentBudget.id !== budgetId) {
          await fetchBudgetDetail(currentAccount.id, budgetId);
        }

        // Fetch goals with filters
        const response = await budgetGoalsApi.list(currentAccount.id, budgetId, {
          status: statusFilter || undefined,
          type: typeFilter || undefined,
        });
        setGoals(response.goals);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load goals');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentAccount?.id, budgetId, statusFilter, typeFilter, currentBudget, fetchBudgetDetail]);

  // Announce filter results to screen readers
  useEffect(() => {
    if (prevGoalCountRef.current !== null && prevGoalCountRef.current !== goals.length) {
      const message = goals.length === 0
        ? 'No goals found matching your filters'
        : `Showing ${goals.length} goal${goals.length === 1 ? '' : 's'}`;
      announce(message);
    }
    prevGoalCountRef.current = goals.length;
  }, [goals.length]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as BudgetGoalStatus | '');
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as BudgetGoalType | '');
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setTypeFilter('');
  }, []);

  const formatAmount = useCallback((amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }, []);

  const formatDate = useCallback((dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Calculate projected completion date based on current progress rate
  const calculateProjectedCompletion = useCallback((goal: BudgetGoal) => {
    if (goal.status !== 'active' || !goal.start_date) return null;
    if (goal.progress_percentage >= 100) return 'Completed';
    if (goal.progress_percentage === 0) return 'Not started';

    const startDate = new Date(goal.start_date);
    const now = new Date();
    const daysPassed = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyProgressRate = goal.progress_percentage / daysPassed;

    if (dailyProgressRate <= 0) return 'Unable to project';

    const remainingProgress = 100 - goal.progress_percentage;
    const daysToComplete = Math.ceil(remainingProgress / dailyProgressRate);
    const projectedDate = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);

    // If there's an end date, compare with projected
    if (goal.end_date) {
      const endDate = new Date(goal.end_date);
      if (projectedDate > endDate) {
        return `At risk (${formatDate(projectedDate.toISOString())})`;
      }
    }

    return formatDate(projectedDate.toISOString());
  }, [formatDate]);

  const getStatusClass = useCallback((status: BudgetGoalStatus) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'completed':
        return 'status-completed';
      case 'failed':
        return 'status-failed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }, []);

  const getProgressClass = useCallback((percentage: number, status: BudgetGoalStatus) => {
    if (status === 'completed') return 'progress-completed';
    if (status === 'failed') return 'progress-failed';
    if (percentage >= 80) return 'progress-high';
    if (percentage >= 50) return 'progress-moderate';
    return 'progress-low';
  }, []);

  // Form handlers
  const handleFormChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setIsCreateModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((goal: BudgetGoal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || '',
      type: goal.type,
      target_amount: goal.target_amount.toString(),
      start_date: goal.start_date || '',
      end_date: goal.end_date || '',
    });
    setIsEditModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((goal: BudgetGoal) => {
    setDeletingGoal(goal);
    setIsDeleteModalOpen(true);
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount?.id || !budgetId || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const createData: CreateBudgetGoalRequest = {
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        target_amount: parseFloat(formData.target_amount),
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
      };

      const newGoal = await budgetGoalsApi.create(currentAccount.id, budgetId, createData);
      setGoals(prev => [...prev, newGoal]);
      setIsCreateModalOpen(false);
      resetForm();
      toast.success(`Goal "${newGoal.name}" created successfully`);
      announce(`Goal ${newGoal.name} created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount?.id || !budgetId || !editingGoal || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const updateData: UpdateBudgetGoalRequest = {
        name: formData.name,
        description: formData.description || undefined,
        target_amount: parseFloat(formData.target_amount),
      };

      const updatedGoal = await budgetGoalsApi.update(
        currentAccount.id,
        budgetId,
        editingGoal.id,
        updateData
      );
      setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
      setIsEditModalOpen(false);
      setEditingGoal(null);
      resetForm();
      toast.success(`Goal "${updatedGoal.name}" updated successfully`);
      announce(`Goal ${updatedGoal.name} updated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!currentAccount?.id || !budgetId || !deletingGoal || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await budgetGoalsApi.delete(currentAccount.id, budgetId, deletingGoal.id);
      setGoals(prev => prev.filter(g => g.id !== deletingGoal.id));
      setIsDeleteModalOpen(false);
      toast.success(`Goal "${deletingGoal.name}" deleted successfully`);
      announce(`Goal ${deletingGoal.name} deleted`);
      setDeletingGoal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActiveFilters = statusFilter !== '' || typeFilter !== '';

  // Filtered goals computed
  const filteredGoals = useMemo(() => {
    return goals;
  }, [goals]);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="budget-goals-page">
          <div className="goals-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view budget goals.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!budgetId) {
    return (
      <PageTransition>
        <div className="budget-goals-page">
          <div className="goals-empty">
            <h2>No Budget Selected</h2>
            <p>Please select a budget to view its goals.</p>
            <Link to="/budgets" className="select-budget-link">
              View Budgets
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && goals.length === 0) {
    return (
      <PageTransition>
        <div className="budget-goals-page">
          <div className="goals-header">
            <h1>Budget Goals</h1>
            <p className="goals-subtitle">Track your financial targets</p>
          </div>
          <AccountsListSkeleton count={4} />
        </div>
      </PageTransition>
    );
  }

  if (error && goals.length === 0) {
    return (
      <PageTransition>
        <div className="budget-goals-page">
          <div className="goals-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={() => navigate(0)}
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
      <div className="budget-goals-page">
        <div className="goals-header">
          <div className="goals-header-row">
            <div>
              <div className="goals-breadcrumb">
                <Link to="/budgets" className="breadcrumb-link">Budgets</Link>
                <span className="breadcrumb-separator">/</span>
                <Link to={`/budgets/${budgetId}`} className="breadcrumb-link">
                  {currentBudget?.name || 'Budget'}
                </Link>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-current">Goals</span>
              </div>
              <h1>Budget Goals</h1>
              <p className="goals-subtitle">
                Track and manage goals for {currentBudget?.name || 'this budget'}
              </p>
            </div>
            <button onClick={openCreateModal} className="create-goal-button">
              Create Goal
            </button>
          </div>
        </div>

        <div className="goals-filters" role="search" aria-label="Filter goals">
          <div className="filter-row">
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="filter-select"
              aria-label="Filter by goal status"
            >
              {GOAL_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <label htmlFor="type-filter" className="sr-only">Filter by type</label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={handleTypeChange}
              className="filter-select"
              aria-label="Filter by goal type"
            >
              <option value="">All Types</option>
              {GOAL_TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
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

        {filteredGoals.length === 0 ? (
          <div className="goals-empty">
            <span className="empty-icon" aria-hidden="true">🎯</span>
            <h2>No Goals Found</h2>
            <p>
              {hasActiveFilters
                ? 'No goals match your filter criteria.'
                : "You haven't created any goals for this budget yet."}
            </p>
            {!hasActiveFilters && (
              <button onClick={openCreateModal} className="create-goal-link">
                Create your first goal
              </button>
            )}
          </div>
        ) : (
          <div className="goals-grid" role="list" aria-label={`${filteredGoals.length} goals`}>
            {filteredGoals.map((goal) => {
              const projectedCompletion = calculateProjectedCompletion(goal);
              const accessibleLabel = `${goal.name}, ${GOAL_TYPE_LABELS[goal.type]}, ${formatAmount(goal.current_amount)} of ${formatAmount(goal.target_amount)}, ${goal.progress_percentage.toFixed(0)}% complete, ${goal.status}`;

              return (
                <div
                  key={goal.id}
                  className="goal-card"
                  role="listitem"
                  aria-label={accessibleLabel}
                >
                  <div className="goal-card-header">
                    <div className="goal-card-title">
                      <h3>{goal.name}</h3>
                      <span className={`goal-type-badge ${goal.type}`}>
                        {GOAL_TYPE_LABELS[goal.type]}
                      </span>
                    </div>
                    <span className={`goal-status ${getStatusClass(goal.status)}`}>
                      {goal.status}
                    </span>
                  </div>

                  {goal.description && (
                    <p className="goal-card-description">{goal.description}</p>
                  )}

                  <div className="goal-progress-section">
                    <div className="goal-progress-header">
                      <span className="goal-progress-label">Progress</span>
                      <span className={`goal-progress-percentage ${getProgressClass(goal.progress_percentage, goal.status)}`}>
                        {goal.progress_percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div
                      className="goal-progress-bar-container"
                      role="progressbar"
                      aria-valuenow={Math.round(goal.progress_percentage)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${goal.name} progress`}
                    >
                      <div
                        className={`goal-progress-bar-fill ${getProgressClass(goal.progress_percentage, goal.status)}`}
                        style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                      />
                    </div>
                    <div className="goal-progress-amounts">
                      <span className="goal-current-amount">
                        {formatAmount(goal.current_amount, currentBudget?.currency)}
                      </span>
                      <span className="goal-target-amount">
                        of {formatAmount(goal.target_amount, currentBudget?.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="goal-card-details">
                    {goal.start_date && (
                      <div className="goal-detail-item">
                        <span className="goal-detail-label">Start Date</span>
                        <span className="goal-detail-value">{formatDate(goal.start_date)}</span>
                      </div>
                    )}
                    {goal.end_date && (
                      <div className="goal-detail-item">
                        <span className="goal-detail-label">Deadline</span>
                        <span className="goal-detail-value">{formatDate(goal.end_date)}</span>
                      </div>
                    )}
                    {projectedCompletion && (
                      <div className="goal-detail-item projected">
                        <span className="goal-detail-label">Projected Completion</span>
                        <span className={`goal-detail-value ${projectedCompletion.includes('At risk') ? 'at-risk' : ''}`}>
                          {projectedCompletion}
                        </span>
                      </div>
                    )}
                    {goal.category_name && (
                      <div className="goal-detail-item">
                        <span className="goal-detail-label">Category</span>
                        <span className="goal-detail-value">{goal.category_name}</span>
                      </div>
                    )}
                    {goal.store_name && (
                      <div className="goal-detail-item">
                        <span className="goal-detail-label">Store</span>
                        <span className="goal-detail-value">{goal.store_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="goal-card-actions">
                    <button
                      onClick={() => openEditModal(goal)}
                      className="goal-action-button edit"
                      aria-label={`Edit ${goal.name}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(goal)}
                      className="goal-action-button delete"
                      aria-label={`Delete ${goal.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Goal Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Goal"
          size="md"
        >
          <form onSubmit={handleCreateGoal} className="goal-form">
            <div className="form-group">
              <label htmlFor="create-name">Name</label>
              <input
                id="create-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleFormChange}
                required
                placeholder="e.g., Save for vacation"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="create-description">Description (optional)</label>
              <textarea
                id="create-description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Describe your goal..."
                className="form-textarea"
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="create-type">Type</label>
                <select
                  id="create-type"
                  name="type"
                  value={formData.type}
                  onChange={handleFormChange}
                  required
                  className="form-select"
                >
                  {GOAL_TYPE_OPTIONS.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="create-target">Target Amount</label>
                <input
                  id="create-target"
                  name="target_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.target_amount}
                  onChange={handleFormChange}
                  required
                  placeholder="0.00"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="create-start">Start Date (optional)</label>
                <input
                  id="create-start"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-end">Deadline (optional)</label>
                <input
                  id="create-end"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="form-button cancel"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="form-button submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Goal Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingGoal(null);
          }}
          title="Edit Goal"
          size="md"
        >
          <form onSubmit={handleUpdateGoal} className="goal-form">
            <div className="form-group">
              <label htmlFor="edit-name">Name</label>
              <input
                id="edit-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleFormChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-description">Description (optional)</label>
              <textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                className="form-textarea"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-target">Target Amount</label>
              <input
                id="edit-target"
                name="target_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.target_amount}
                onChange={handleFormChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingGoal(null);
                }}
                className="form-button cancel"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="form-button submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingGoal(null);
          }}
          title="Delete Goal"
          size="sm"
        >
          <div className="delete-confirmation">
            <p>
              Are you sure you want to delete the goal <strong>"{deletingGoal?.name}"</strong>?
              This action cannot be undone.
            </p>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingGoal(null);
                }}
                className="form-button cancel"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteGoal}
                className="form-button delete"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete Goal'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
