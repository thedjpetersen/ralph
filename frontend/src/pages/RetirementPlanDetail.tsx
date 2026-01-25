import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  retirementPlansApi,
  retirementAccountsApi,
  retirementIncomeSourcesApi,
  retirementExpensesApi,
  type RetirementPlanDetail as RetirementPlanDetailType,
  type RetirementPlanStatus,
  type RetirementStrategy,
  type RetirementAccount,
  type RetirementIncomeSource,
  type RetirementExpense,
} from '../api/client';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { SettingsFormSkeleton } from '../components/skeletons';
import { RetirementAccountForm } from '../components/RetirementAccountForm';
import { IncomeSourceForm } from '../components/IncomeSourceForm';
import { ExpenseForm } from '../components/ExpenseForm';
import { toast } from '../stores/toast';
import './RetirementPlanDetail.css';

const STRATEGY_LABELS: Record<RetirementStrategy, string> = {
  traditional: 'Traditional',
  fire: 'FIRE',
  coast_fire: 'Coast FIRE',
  barista_fire: 'Barista FIRE',
  lean_fire: 'Lean FIRE',
  fat_fire: 'Fat FIRE',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  '401k': '401(k)',
  '403b': '403(b)',
  'ira': 'IRA',
  'roth_ira': 'Roth IRA',
  'sep_ira': 'SEP IRA',
  'simple_ira': 'SIMPLE IRA',
  'pension': 'Pension',
  'brokerage': 'Brokerage',
  'hsa': 'HSA',
  'other': 'Other',
};

const INCOME_TYPE_LABELS: Record<string, string> = {
  'social_security': 'Social Security',
  'pension': 'Pension',
  'annuity': 'Annuity',
  'rental': 'Rental Income',
  'part_time': 'Part-Time Work',
  'dividend': 'Dividends',
  'other': 'Other',
};

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  'housing': 'Housing',
  'healthcare': 'Healthcare',
  'transportation': 'Transportation',
  'food': 'Food',
  'utilities': 'Utilities',
  'insurance': 'Insurance',
  'entertainment': 'Entertainment',
  'travel': 'Travel',
  'other': 'Other',
};

const FREQUENCY_LABELS: Record<string, string> = {
  'one_time': 'One Time',
  'monthly': 'Monthly',
  'quarterly': 'Quarterly',
  'annual': 'Annual',
};

export function RetirementPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentAccount } = useAccountStore();

  const [plan, setPlan] = useState<RetirementPlanDetailType | null>(null);
  const [accounts, setAccounts] = useState<RetirementAccount[]>([]);
  const [incomeSources, setIncomeSources] = useState<RetirementIncomeSource[]>([]);
  const [expenses, setExpenses] = useState<RetirementExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<RetirementAccount | null>(null);
  const [editingIncome, setEditingIncome] = useState<RetirementIncomeSource | null>(null);
  const [editingExpense, setEditingExpense] = useState<RetirementExpense | null>(null);

  const fetchPlanDetail = useCallback(async () => {
    if (!id || !currentAccount?.id) return;

    setIsLoading(true);
    setError(null);
    try {
      const [planData, accountsData, incomeData, expensesData] = await Promise.all([
        retirementPlansApi.getDetail(currentAccount.id, id),
        retirementAccountsApi.list(currentAccount.id, { plan_id: id }),
        retirementIncomeSourcesApi.list(currentAccount.id, { plan_id: id }),
        retirementExpensesApi.list(currentAccount.id, { plan_id: id }),
      ]);
      setPlan(planData);
      setAccounts(accountsData.accounts);
      setIncomeSources(incomeData.income_sources);
      setExpenses(expensesData.expenses);
    } catch {
      setError('Failed to load retirement plan');
    } finally {
      setIsLoading(false);
    }
  }, [id, currentAccount?.id]);

  useEffect(() => {
    if (id && currentAccount?.id) {
      fetchPlanDetail();
    }
  }, [id, currentAccount?.id, fetchPlanDetail]);

  const handleDelete = async () => {
    if (!id || !currentAccount?.id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await retirementPlansApi.delete(currentAccount.id, id);
      toast.success('Retirement plan deleted successfully');
      navigate('/retirement-plans');
    } catch {
      setDeleteError('Failed to delete retirement plan');
      toast.error('Failed to delete retirement plan');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleActivate = async () => {
    if (!id || !currentAccount?.id) return;
    try {
      const updated = await retirementPlansApi.activate(currentAccount.id, id);
      toast.success('Plan activated');
      setPlan((prev) => prev ? { ...prev, status: updated.status } : null);
    } catch {
      toast.error('Failed to activate plan');
    }
  };

  const handleArchive = async () => {
    if (!id || !currentAccount?.id) return;
    try {
      const updated = await retirementPlansApi.archive(currentAccount.id, id);
      toast.success('Plan archived');
      setPlan((prev) => prev ? { ...prev, status: updated.status } : null);
    } catch {
      toast.error('Failed to archive plan');
    }
  };

  const handleSetDefault = async () => {
    if (!id || !currentAccount?.id) return;
    try {
      await retirementPlansApi.setDefault(currentAccount.id, id);
      toast.success('Plan set as default');
      setPlan((prev) => prev ? { ...prev, is_default: true } : null);
    } catch {
      toast.error('Failed to set plan as default');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!currentAccount?.id) return;
    try {
      await retirementAccountsApi.delete(currentAccount.id, accountId);
      toast.success('Account deleted');
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch {
      toast.error('Failed to delete account');
    }
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!currentAccount?.id) return;
    try {
      await retirementIncomeSourcesApi.delete(currentAccount.id, incomeId);
      toast.success('Income source deleted');
      setIncomeSources((prev) => prev.filter((i) => i.id !== incomeId));
    } catch {
      toast.error('Failed to delete income source');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!currentAccount?.id) return;
    try {
      await retirementExpensesApi.delete(currentAccount.id, expenseId);
      toast.success('Expense deleted');
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    } catch {
      toast.error('Failed to delete expense');
    }
  };

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
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
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

  const totalAccountBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);
  const totalAnnualIncome = incomeSources
    .filter((i) => i.status === 'active')
    .reduce((sum, i) => sum + i.annual_amount, 0);
  const totalAnnualExpenses = expenses
    .filter((e) => e.status === 'active')
    .reduce((sum, e) => {
      const annualized = e.frequency === 'monthly' ? e.amount * 12 :
                        e.frequency === 'quarterly' ? e.amount * 4 :
                        e.frequency === 'one_time' ? 0 : e.amount;
      return sum + annualized;
    }, 0);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="retirement-plan-detail-page">
          <div className="detail-error">
            <h2>No Account Selected</h2>
            <p>Please select an account to view plan details.</p>
            <button onClick={() => navigate('/accounts')} className="back-button">
              Select an Account
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && !plan) {
    return (
      <PageTransition>
        <div className="retirement-plan-detail-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && !plan) {
    return (
      <PageTransition>
        <div className="retirement-plan-detail-page">
          <div className="detail-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/retirement-plans')} className="back-button">
              Back to Plans
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!plan) {
    return (
      <PageTransition>
        <div className="retirement-plan-detail-page">
          <div className="detail-error">
            <h2>Plan Not Found</h2>
            <p>The retirement plan you're looking for doesn't exist.</p>
            <button onClick={() => navigate('/retirement-plans')} className="back-button">
              Back to Plans
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="retirement-plan-detail-page">
        <div className="detail-header">
          <Link to="/retirement-plans" className="back-link">
            &larr; Back to Plans
          </Link>
          <div className="detail-header-row">
            <div className="detail-header-info">
              <div>
                <h1>{plan.name}</h1>
                <div className="detail-meta">
                  <span className={`plan-status ${getStatusClass(plan.status)}`}>
                    {plan.status}
                  </span>
                  <span className="plan-strategy-badge">
                    {STRATEGY_LABELS[plan.strategy]}
                  </span>
                  {plan.is_default && (
                    <span className="default-badge">Default</span>
                  )}
                </div>
              </div>
            </div>
            <div className="detail-actions">
              <Link to={`/retirement-plans/${plan.id}/edit`} className="edit-button">
                Edit Plan
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
          {/* Plan Overview */}
          <div className="plan-overview-section">
            <div className="overview-stats">
              <div className="stat-item stat-highlight">
                <span className="stat-label">FIRE Number</span>
                <span className="stat-value">
                  {plan.fire_number ? formatAmount(plan.fire_number) : 'N/A'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Current Portfolio</span>
                <span className="stat-value">{formatAmount(totalAccountBalance)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Years to Goal</span>
                <span className="stat-value">
                  {plan.years_to_retirement ?? plan.target_retirement_age - plan.current_age}
                </span>
              </div>
              {plan.success_probability !== undefined && (
                <div className="stat-item">
                  <span className="stat-label">Success Rate</span>
                  <span className="stat-value">{formatPercent(plan.success_probability)}</span>
                </div>
              )}
            </div>
          </div>

          {plan.description && (
            <div className="detail-section">
              <h2>Description</h2>
              <p className="detail-description">{plan.description}</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="detail-section">
            <h2>Quick Actions</h2>
            <div className="quick-actions">
              {plan.status !== 'active' && plan.status !== 'archived' && (
                <button onClick={handleActivate} className="action-button action-activate">
                  Activate Plan
                </button>
              )}
              {plan.status !== 'archived' && (
                <button onClick={handleArchive} className="action-button action-archive">
                  Archive Plan
                </button>
              )}
              {!plan.is_default && (
                <button onClick={handleSetDefault} className="action-button action-default">
                  Set as Default
                </button>
              )}
            </div>
          </div>

          {/* Plan Details */}
          <div className="detail-section">
            <h2>Plan Details</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Current Age</span>
                <span className="detail-value">{plan.current_age}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Target Retirement Age</span>
                <span className="detail-value">{plan.target_retirement_age}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Life Expectancy</span>
                <span className="detail-value">{plan.life_expectancy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Target Annual Spending</span>
                <span className="detail-value">{formatAmount(plan.target_annual_spending)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Safe Withdrawal Rate</span>
                <span className="detail-value">{formatPercent(plan.safe_withdrawal_rate)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Expected Return Rate</span>
                <span className="detail-value">{formatPercent(plan.expected_return_rate)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Inflation Rate</span>
                <span className="detail-value">{formatPercent(plan.inflation_rate)}</span>
              </div>
              {plan.social_security_benefit && (
                <div className="detail-item">
                  <span className="detail-label">Social Security (Age {plan.social_security_age})</span>
                  <span className="detail-value">{formatAmount(plan.social_security_benefit)}/year</span>
                </div>
              )}
              {plan.pension_benefit && (
                <div className="detail-item">
                  <span className="detail-label">Pension (Age {plan.pension_start_age})</span>
                  <span className="detail-value">{formatAmount(plan.pension_benefit)}/year</span>
                </div>
              )}
              {plan.healthcare_cost_estimate && (
                <div className="detail-item">
                  <span className="detail-label">Healthcare Estimate</span>
                  <span className="detail-value">{formatAmount(plan.healthcare_cost_estimate)}/year</span>
                </div>
              )}
            </div>
          </div>

          {/* Retirement Accounts */}
          <div className="detail-section">
            <div className="section-header">
              <h2>Retirement Accounts ({formatAmount(totalAccountBalance)})</h2>
              <button
                onClick={() => { setEditingAccount(null); setShowAccountForm(true); }}
                className="add-item-button"
              >
                Add Account
              </button>
            </div>
            {accounts.length === 0 ? (
              <div className="items-empty">
                <p>No retirement accounts added yet.</p>
                <button
                  onClick={() => { setEditingAccount(null); setShowAccountForm(true); }}
                  className="create-item-link"
                >
                  Add your first account
                </button>
              </div>
            ) : (
              <div className="items-list">
                {accounts.map((account) => (
                  <div key={account.id} className="item-card">
                    <div className="item-info">
                      <div className="item-header">
                        <span className="item-name">{account.name}</span>
                        <span className={`item-status status-${account.status}`}>
                          {account.status}
                        </span>
                      </div>
                      <span className="item-type">{ACCOUNT_TYPE_LABELS[account.type]}</span>
                      {account.notes && (
                        <span className="item-notes">{account.notes}</span>
                      )}
                    </div>
                    <div className="item-details">
                      <div className="item-amount">{formatAmount(account.current_balance)}</div>
                      {account.annual_contribution && (
                        <div className="item-sub">+{formatAmount(account.annual_contribution)}/yr</div>
                      )}
                      {account.employer_match_percent && (
                        <div className="item-badge">{account.employer_match_percent}% match</div>
                      )}
                    </div>
                    <div className="item-actions">
                      <button
                        onClick={() => { setEditingAccount(account); setShowAccountForm(true); }}
                        className="item-action-button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="item-action-button danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Income Sources */}
          <div className="detail-section">
            <div className="section-header">
              <h2>Income Sources ({formatAmount(totalAnnualIncome)}/yr)</h2>
              <button
                onClick={() => { setEditingIncome(null); setShowIncomeForm(true); }}
                className="add-item-button"
              >
                Add Income
              </button>
            </div>
            {incomeSources.length === 0 ? (
              <div className="items-empty">
                <p>No income sources added yet.</p>
                <button
                  onClick={() => { setEditingIncome(null); setShowIncomeForm(true); }}
                  className="create-item-link"
                >
                  Add your first income source
                </button>
              </div>
            ) : (
              <div className="items-list">
                {incomeSources.map((income) => (
                  <div key={income.id} className="item-card">
                    <div className="item-info">
                      <div className="item-header">
                        <span className="item-name">{income.name}</span>
                        <span className={`item-status status-${income.status}`}>
                          {income.status}
                        </span>
                      </div>
                      <span className="item-type">{INCOME_TYPE_LABELS[income.type]}</span>
                      <span className="item-age-range">
                        Age {income.start_age}{income.end_age ? ` - ${income.end_age}` : '+'}
                      </span>
                    </div>
                    <div className="item-details">
                      <div className="item-amount">{formatAmount(income.annual_amount)}/yr</div>
                      {income.inflation_adjusted && (
                        <div className="item-badge">Inflation adjusted</div>
                      )}
                      {income.is_taxable && (
                        <div className="item-badge">Taxable</div>
                      )}
                    </div>
                    <div className="item-actions">
                      <button
                        onClick={() => { setEditingIncome(income); setShowIncomeForm(true); }}
                        className="item-action-button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteIncome(income.id)}
                        className="item-action-button danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expenses */}
          <div className="detail-section">
            <div className="section-header">
              <h2>Expected Expenses ({formatAmount(totalAnnualExpenses)}/yr)</h2>
              <button
                onClick={() => { setEditingExpense(null); setShowExpenseForm(true); }}
                className="add-item-button"
              >
                Add Expense
              </button>
            </div>
            {expenses.length === 0 ? (
              <div className="items-empty">
                <p>No expenses added yet.</p>
                <button
                  onClick={() => { setEditingExpense(null); setShowExpenseForm(true); }}
                  className="create-item-link"
                >
                  Add your first expense
                </button>
              </div>
            ) : (
              <div className="items-list">
                {expenses.map((expense) => (
                  <div key={expense.id} className="item-card">
                    <div className="item-info">
                      <div className="item-header">
                        <span className="item-name">{expense.name}</span>
                        <span className={`item-status status-${expense.status}`}>
                          {expense.status}
                        </span>
                      </div>
                      <span className="item-type">{EXPENSE_TYPE_LABELS[expense.type]}</span>
                      <span className="item-age-range">
                        Age {expense.start_age}{expense.end_age ? ` - ${expense.end_age}` : '+'}
                      </span>
                    </div>
                    <div className="item-details">
                      <div className="item-amount">
                        {formatAmount(expense.amount)}/{FREQUENCY_LABELS[expense.frequency].toLowerCase()}
                      </div>
                      {expense.is_essential && (
                        <div className="item-badge essential">Essential</div>
                      )}
                      {expense.inflation_adjusted && (
                        <div className="item-badge">Inflation adjusted</div>
                      )}
                    </div>
                    <div className="item-actions">
                      <button
                        onClick={() => { setEditingExpense(expense); setShowExpenseForm(true); }}
                        className="item-action-button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="item-action-button danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {plan.notes && (
            <div className="detail-section">
              <h2>Notes</h2>
              <p className="detail-description">{plan.notes}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="detail-section detail-timestamps">
            <div className="timestamp-item">
              <span className="detail-label">Created</span>
              <span className="detail-value">
                {formatDateTime(plan.created_at)}
              </span>
            </div>
            <div className="timestamp-item">
              <span className="detail-label">Updated</span>
              <span className="detail-value">
                {formatDateTime(plan.updated_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="delete-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Retirement Plan</h3>
              <p>
                Are you sure you want to delete <strong>{plan.name}</strong>?
                This will also delete all associated accounts, income sources, and expenses.
                This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="cancel-button"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="confirm-delete-button"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Plan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Account Form Modal */}
        {showAccountForm && (
          <RetirementAccountForm
            accountId={currentAccount.id}
            planId={plan.id}
            existingAccount={editingAccount}
            onClose={() => { setShowAccountForm(false); setEditingAccount(null); }}
            onSuccess={(account) => {
              setShowAccountForm(false);
              setEditingAccount(null);
              if (editingAccount) {
                setAccounts((prev) => prev.map((a) => a.id === account.id ? account : a));
              } else {
                setAccounts((prev) => [...prev, account]);
              }
            }}
          />
        )}

        {/* Income Source Form Modal */}
        {showIncomeForm && (
          <IncomeSourceForm
            accountId={currentAccount.id}
            planId={plan.id}
            existingIncome={editingIncome}
            onClose={() => { setShowIncomeForm(false); setEditingIncome(null); }}
            onSuccess={(income) => {
              setShowIncomeForm(false);
              setEditingIncome(null);
              if (editingIncome) {
                setIncomeSources((prev) => prev.map((i) => i.id === income.id ? income : i));
              } else {
                setIncomeSources((prev) => [...prev, income]);
              }
            }}
          />
        )}

        {/* Expense Form Modal */}
        {showExpenseForm && (
          <ExpenseForm
            accountId={currentAccount.id}
            planId={plan.id}
            existingExpense={editingExpense}
            onClose={() => { setShowExpenseForm(false); setEditingExpense(null); }}
            onSuccess={(expense) => {
              setShowExpenseForm(false);
              setEditingExpense(null);
              if (editingExpense) {
                setExpenses((prev) => prev.map((e) => e.id === expense.id ? expense : e));
              } else {
                setExpenses((prev) => [...prev, expense]);
              }
            }}
          />
        )}
      </div>
    </PageTransition>
  );
}
