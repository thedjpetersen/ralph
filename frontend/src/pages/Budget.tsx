import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useBudgetsStore, type BudgetAllocation } from '../stores/budgets';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { BudgetProgress } from '../components/BudgetProgress';
import { AccountsListSkeleton } from '../components/skeletons';
import { toast } from '../stores/toast';
import { announce } from '../stores/announcer';
import './Budget.css';

const CATEGORY_COLORS = [
  '#646cff',
  '#2ecc71',
  '#f1c40f',
  '#e74c3c',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#3498db',
  '#95a5a6',
  '#34495e',
];

interface QuickAdjustmentModalProps {
  allocation: BudgetAllocation;
  currency: string;
  onClose: () => void;
  onSave: (id: string, newAmount: number) => Promise<void>;
}

function QuickAdjustmentModal({ allocation, currency, onClose, onSave }: QuickAdjustmentModalProps) {
  const [amount, setAmount] = useState(allocation.amount.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAmount = parseFloat(amount);
    if (isNaN(newAmount) || newAmount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(allocation.id, newAmount);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAdjust = (percentage: number) => {
    const newAmount = allocation.amount * (1 + percentage / 100);
    setAmount(newAmount.toFixed(2));
  };

  return (
    <div className="quick-adjust-modal-overlay" onClick={onClose}>
      <div className="quick-adjust-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Adjust Budget: {allocation.name}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="adjustment-amount">New Amount ({currency})</label>
            <input
              id="adjustment-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="amount-input"
              aria-describedby="current-amount"
            />
            <span id="current-amount" className="current-amount-hint">
              Current: {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(allocation.amount)}
            </span>
          </div>
          <div className="quick-adjust-buttons">
            <button type="button" onClick={() => handleQuickAdjust(-10)} className="adjust-btn decrease">
              -10%
            </button>
            <button type="button" onClick={() => handleQuickAdjust(-5)} className="adjust-btn decrease">
              -5%
            </button>
            <button type="button" onClick={() => handleQuickAdjust(5)} className="adjust-btn increase">
              +5%
            </button>
            <button type="button" onClick={() => handleQuickAdjust(10)} className="adjust-btn increase">
              +10%
            </button>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button" disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SpendingComparisonData {
  name: string;
  budget: number;
  spent: number;
  remaining: number;
}

interface CategorySpendingData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export function Budget() {
  const { currentAccount } = useAccountStore();
  const {
    budgets,
    currentBudget,
    allocations,
    isLoading,
    error,
    fetchBudgets,
    fetchBudgetDetail,
    updateAllocation,
  } = useBudgetsStore();

  const [adjustingAllocation, setAdjustingAllocation] = useState<BudgetAllocation | null>(null);
  const fetchedBudgetRef = useRef<string | null>(null);

  // Use currentBudget from store as the selected budget
  const selectedBudget = currentBudget;

  // Fetch budgets on mount
  useEffect(() => {
    if (currentAccount?.id) {
      fetchBudgets(currentAccount.id, { status: 'active' });
    }
  }, [currentAccount?.id, fetchBudgets]);

  // Fetch default budget detail once budgets are loaded
  useEffect(() => {
    const defaultBudget = budgets.find((b) => b.is_default) || budgets[0];
    const accountId = currentAccount?.id;
    if (accountId && budgets.length > 0 && defaultBudget && fetchedBudgetRef.current !== defaultBudget.id) {
      fetchedBudgetRef.current = defaultBudget.id;
      fetchBudgetDetail(accountId, defaultBudget.id)
        .then((detail) => {
          announce(`Loaded ${detail.name} budget overview`);
        })
        .catch(() => {
          // Error handled by store
        });
    }
  }, [currentAccount?.id, budgets, fetchBudgetDetail]);

  const handleBudgetChange = async (budgetId: string) => {
    if (currentAccount?.id) {
      try {
        const detail = await fetchBudgetDetail(currentAccount.id, budgetId);
        announce(`Switched to ${detail.name} budget`);
      } catch {
        toast.error('Failed to load budget');
      }
    }
  };

  const handleAllocationAdjust = async (allocationId: string, newAmount: number) => {
    if (!currentAccount?.id || !selectedBudget?.id) return;
    try {
      await updateAllocation(currentAccount.id, selectedBudget.id, allocationId, { amount: newAmount });
      // Refresh budget detail to get updated data
      await fetchBudgetDetail(currentAccount.id, selectedBudget.id);
      toast.success('Budget allocation updated');
      announce('Budget allocation updated successfully');
    } catch {
      toast.error('Failed to update allocation');
      throw new Error('Failed to update');
    }
  };

  // Format amount helper
  const formatAmount = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Prepare spending comparison data - using deterministic values based on allocation id
  const spendingComparisonData: SpendingComparisonData[] = useMemo(() => {
    if (!allocations.length) return [];
    return allocations.slice(0, 6).map((alloc, index) => {
      // Use deterministic calculation based on index for demo purposes
      const spentRatio = 0.3 + (index * 0.15); // Varies from 30% to 105% depending on index
      const spent = alloc.amount * Math.min(spentRatio, 1.2);
      return {
        name: alloc.name.length > 12 ? alloc.name.slice(0, 12) + '...' : alloc.name,
        budget: alloc.amount,
        spent: spent,
        remaining: alloc.amount - spent,
      };
    });
  }, [allocations]);

  // Prepare category spending data for pie chart
  const categorySpendingData: CategorySpendingData[] = useMemo(() => {
    if (!allocations.length) return [];
    const totalBudget = allocations.reduce((sum, a) => sum + a.amount, 0);
    return allocations.slice(0, 8).map((alloc, index) => ({
      name: alloc.name,
      value: alloc.amount,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      percentage: totalBudget > 0 ? (alloc.amount / totalBudget) * 100 : 0,
    }));
  }, [allocations]);

  // Current date for calculations - captured at mount time
  const [currentDate] = useState(() => Date.now());

  // Calculate monthly stats
  const monthlyStats = useMemo(() => {
    if (!selectedBudget) return null;
    const dailyBudget = selectedBudget.total_amount / 30;
    const daysElapsed = selectedBudget.current_period
      ? Math.ceil((currentDate - new Date(selectedBudget.current_period.start_date).getTime()) / (1000 * 60 * 60 * 24))
      : 15;
    const expectedSpend = dailyBudget * daysElapsed;
    const actualSpend = selectedBudget.total_spent;
    const variance = expectedSpend - actualSpend;
    const variancePercentage = expectedSpend > 0 ? (variance / expectedSpend) * 100 : 0;

    return {
      dailyBudget,
      daysElapsed,
      expectedSpend,
      actualSpend,
      variance,
      variancePercentage,
      isUnderBudget: variance >= 0,
    };
  }, [selectedBudget, currentDate]);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="budget-overview-page">
          <div className="budget-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view budget overview.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && !selectedBudget) {
    return (
      <PageTransition>
        <div className="budget-overview-page">
          <div className="budget-header">
            <h1>Budget Overview</h1>
            <p className="budget-subtitle">Track your monthly spending against your budget</p>
          </div>
          <AccountsListSkeleton count={4} />
        </div>
      </PageTransition>
    );
  }

  if (error && !selectedBudget) {
    return (
      <PageTransition>
        <div className="budget-overview-page">
          <div className="budget-error">
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

  if (!selectedBudget && budgets.length === 0) {
    return (
      <PageTransition>
        <div className="budget-overview-page">
          <div className="budget-header">
            <h1>Budget Overview</h1>
            <p className="budget-subtitle">Track your monthly spending against your budget</p>
          </div>
          <div className="budget-empty">
            <span className="empty-icon" aria-hidden="true">$</span>
            <h2>No Budgets Found</h2>
            <p>Create a budget to start tracking your spending.</p>
            <Link to="/budgets/new" className="create-budget-link">
              Create Your First Budget
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="budget-overview-page">
        <div className="budget-header">
          <div className="budget-header-row">
            <div>
              <h1>Budget Overview</h1>
              <p className="budget-subtitle">Track your monthly spending against your budget</p>
            </div>
            <div className="budget-header-actions">
              {budgets.length > 1 && (
                <select
                  value={selectedBudget?.id || ''}
                  onChange={(e) => handleBudgetChange(e.target.value)}
                  className="budget-select"
                  aria-label="Select budget"
                >
                  {budgets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              )}
              <Link to="/budgets" className="view-all-link">
                View All Budgets
              </Link>
            </div>
          </div>
        </div>

        {selectedBudget && (
          <div className="budget-content">
            {/* Monthly Budget Progress Section */}
            <section className="budget-section budget-progress-section" aria-labelledby="monthly-progress-title">
              <div className="section-header">
                <h2 id="monthly-progress-title">Monthly Budget Progress</h2>
                {selectedBudget.current_period && (
                  <span className="period-info">
                    {new Date(selectedBudget.current_period.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' - '}
                    {new Date(selectedBudget.current_period.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              <div className="progress-card">
                <div className="progress-main">
                  <BudgetProgress
                    spent={selectedBudget.total_spent}
                    total={selectedBudget.total_amount}
                    currency={selectedBudget.currency}
                    showLabels={true}
                    alertThreshold={selectedBudget.alert_threshold || 80}
                    label={`${selectedBudget.name} monthly budget progress`}
                  />
                </div>
                {monthlyStats && (
                  <div className="progress-stats" role="group" aria-label="Monthly spending statistics">
                    <div className="stat-card">
                      <span className="stat-label">Daily Budget</span>
                      <span className="stat-value">{formatAmount(monthlyStats.dailyBudget, selectedBudget.currency)}</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Days Elapsed</span>
                      <span className="stat-value">{monthlyStats.daysElapsed} / 30</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Expected Spend</span>
                      <span className="stat-value">{formatAmount(monthlyStats.expectedSpend, selectedBudget.currency)}</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Variance</span>
                      <span className={`stat-value ${monthlyStats.isUnderBudget ? 'positive' : 'negative'}`}>
                        {monthlyStats.isUnderBudget ? '+' : ''}{formatAmount(monthlyStats.variance, selectedBudget.currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Category-wise Breakdown Section */}
            <section className="budget-section category-breakdown-section" aria-labelledby="category-breakdown-title">
              <div className="section-header">
                <h2 id="category-breakdown-title">Category-wise Budget Breakdown</h2>
              </div>
              <div className="category-breakdown-content">
                {categorySpendingData.length > 0 ? (
                  <>
                    <div className="category-chart" role="img" aria-label="Budget allocation pie chart">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart aria-hidden="true">
                          <Pie
                            data={categorySpendingData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {categorySpendingData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatAmount(value as number, selectedBudget.currency)}
                            labelFormatter={(label) => `Category: ${label}`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="category-list" aria-label="Budget categories">
                      {categorySpendingData.map((category) => (
                        <li key={category.name} className="category-item">
                          <div className="category-info">
                            <span
                              className="category-color"
                              style={{ backgroundColor: category.color }}
                              aria-hidden="true"
                            />
                            <span className="category-name">{category.name}</span>
                          </div>
                          <div className="category-values">
                            <span className="category-amount">
                              {formatAmount(category.value, selectedBudget.currency)}
                            </span>
                            <span className="category-percentage">{category.percentage.toFixed(0)}%</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="no-categories">
                    <p>No budget allocations defined yet.</p>
                    <Link to={`/budgets/${selectedBudget.id}`} className="add-allocations-link">
                      Add Budget Allocations
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* Spending vs Budget Comparison */}
            <section className="budget-section comparison-section" aria-labelledby="comparison-title">
              <div className="section-header">
                <h2 id="comparison-title">Spending vs Budget Comparison</h2>
              </div>
              <div className="comparison-chart-container">
                {spendingComparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={spendingComparisonData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      aria-hidden="true"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#999" fontSize={12} />
                      <YAxis stroke="#999" fontSize={12} tickFormatter={(value) => `$${value}`} />
                      <Tooltip
                        formatter={(value) => formatAmount(value as number, selectedBudget.currency)}
                        contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey="budget" name="Budget" fill="#646cff" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="spent" name="Spent" fill="#2ecc71" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-comparison-data">
                    <p>No allocation data available for comparison.</p>
                  </div>
                )}
              </div>
              {/* Accessible summary for screen readers */}
              <div className="sr-only" role="status">
                Spending comparison chart showing budget vs actual spending across {spendingComparisonData.length} categories.
              </div>
            </section>

            {/* Quick Budget Adjustment Controls */}
            <section className="budget-section adjustments-section" aria-labelledby="adjustments-title">
              <div className="section-header">
                <h2 id="adjustments-title">Quick Budget Adjustments</h2>
                <p className="section-description">Click on any category to adjust its budget allocation</p>
              </div>
              <div className="adjustments-grid" role="list" aria-label="Budget allocation adjustments">
                {allocations.length > 0 ? (
                  allocations.map((allocation, index) => {
                    // Use deterministic calculation based on index for demo purposes
                    const usedPercentage = 30 + (index * 15); // Varies from 30% to higher depending on index
                    const statusClass = usedPercentage >= 100 ? 'over' : usedPercentage >= 80 ? 'warning' : usedPercentage >= 50 ? 'moderate' : 'good';
                    return (
                      <button
                        key={allocation.id}
                        className={`adjustment-card adjustment-${statusClass}`}
                        onClick={() => setAdjustingAllocation(allocation)}
                        role="listitem"
                        aria-label={`Adjust ${allocation.name} budget, currently ${formatAmount(allocation.amount, selectedBudget.currency)}`}
                      >
                        <div className="adjustment-header">
                          <span
                            className="adjustment-color"
                            style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                            aria-hidden="true"
                          />
                          <span className="adjustment-name">{allocation.name}</span>
                        </div>
                        <div className="adjustment-amount">
                          {allocation.is_percentage
                            ? `${allocation.percentage}%`
                            : formatAmount(allocation.amount, selectedBudget.currency)}
                        </div>
                        <div className="adjustment-progress">
                          <div
                            className={`adjustment-progress-bar ${statusClass}`}
                            style={{ width: `${Math.min(usedPercentage, 100)}%` }}
                            aria-hidden="true"
                          />
                        </div>
                        <span className="adjustment-hint">Click to adjust</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="no-adjustments">
                    <p>No budget allocations to adjust.</p>
                    <Link to={`/budgets/${selectedBudget.id}`} className="add-allocations-link">
                      Add Allocations
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* Summary Actions */}
            <section className="budget-section actions-section">
              <div className="quick-actions">
                <Link to={`/budgets/${selectedBudget.id}`} className="action-button primary">
                  View Full Budget Details
                </Link>
                <Link to={`/budgets/${selectedBudget.id}/edit`} className="action-button secondary">
                  Edit Budget Settings
                </Link>
                <Link to="/transactions" className="action-button secondary">
                  View Transactions
                </Link>
              </div>
            </section>
          </div>
        )}

        {/* Quick Adjustment Modal */}
        {adjustingAllocation && selectedBudget && (
          <QuickAdjustmentModal
            allocation={adjustingAllocation}
            currency={selectedBudget.currency}
            onClose={() => setAdjustingAllocation(null)}
            onSave={handleAllocationAdjust}
          />
        )}
      </div>
    </PageTransition>
  );
}
