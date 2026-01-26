import { useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useBudgetsStore, type BudgetDetail } from '../stores/budgets';
import { useAccountStore } from '../stores/account';
import { useTransactionsStore } from '../stores/transactions';
import { useReceiptsStore } from '../stores/receipts';
import { useFinancialStore } from '../stores/financial';
import { PageTransition } from '../components/PageTransition';
import { announce } from '../stores/announcer';
import type { StatsData } from '../components/dashboard';
// Eagerly load lightweight components for fast initial paint
import {
  BudgetSummaryCard,
  RecentTransactions,
  RecentReceipts,
  AccountBalances,
  QuickActions,
  StatsCards,
} from '../components/dashboard';
// Lazy-load chart components (heavy recharts dependency) to improve FCP and TTI
const SpendingByCategory = lazy(() => import('../components/dashboard/SpendingByCategory').then(m => ({ default: m.SpendingByCategory })));
const BudgetTrend = lazy(() => import('../components/dashboard/BudgetTrend').then(m => ({ default: m.BudgetTrend })));
const NetWorthChart = lazy(() => import('../components/dashboard/NetWorthChart').then(m => ({ default: m.NetWorthChart })));
import './Dashboard.css';

// Chart loading fallback for smooth UX
function ChartLoadingFallback() {
  return (
    <div className="chart-loading-skeleton">
      <div className="skeleton-chart" />
    </div>
  );
}

// Generate mock spending by category data from budget allocations
function generateCategorySpending(budget: BudgetDetail | null) {
  if (!budget || !budget.allocations || budget.allocations.length === 0) {
    return [];
  }

  const totalAllocated = budget.allocations.reduce((sum, a) => sum + a.amount, 0);

  return budget.allocations.map((allocation) => ({
    category_id: allocation.category_id || allocation.id,
    category_name: allocation.name,
    amount: allocation.amount,
    percentage: totalAllocated > 0 ? (allocation.amount / totalAllocated) * 100 : 0,
  }));
}

// Generate mock trend data for the past periods
function generateTrendData(budget: BudgetDetail | null) {
  if (!budget) {
    return [];
  }

  const today = new Date();
  const dataPoints = [];

  // Generate last 7 days of data
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Simulate cumulative spending that builds up over time
    const dayIndex = 6 - i;
    const baseSpent = (budget.total_spent / 7) * (dayIndex + 1);
    const variance = baseSpent * (Math.random() * 0.2 - 0.1);

    dataPoints.push({
      date: date.toISOString().split('T')[0],
      spent: Math.max(0, baseSpent + variance),
      budget: budget.total_amount,
    });
  }

  return dataPoints;
}

// Generate net worth trend data from financial accounts
function generateNetWorthData(
  accounts: { current_balance?: number; type: string }[]
) {
  const today = new Date();
  const dataPoints = [];

  // Calculate current totals
  const assets = accounts
    .filter((a) => !['credit', 'loan', 'mortgage'].includes(a.type))
    .reduce((sum, a) => sum + (a.current_balance || 0), 0);

  const liabilities = Math.abs(
    accounts
      .filter((a) => ['credit', 'loan', 'mortgage'].includes(a.type))
      .reduce((sum, a) => sum + (a.current_balance || 0), 0)
  );

  const netWorth = assets - liabilities;

  // Generate last 30 days of data with simulated historical values
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Simulate slight historical variation
    const factor = 1 - (i * 0.003) + (Math.random() * 0.01 - 0.005);

    dataPoints.push({
      date: date.toISOString().split('T')[0],
      assets: Math.round(assets * factor),
      liabilities: Math.round(liabilities * (1 + (i * 0.002))),
      netWorth: Math.round(netWorth * factor),
    });
  }

  return dataPoints;
}

export function Dashboard() {
  const { currentAccount } = useAccountStore();
  const {
    budgets,
    currentBudget,
    isLoading: budgetsLoading,
    error,
    fetchBudgets,
    fetchBudgetDetail,
  } = useBudgetsStore();
  const hasAnnouncedRef = useRef(false);

  const {
    transactions,
    isLoading: transactionsLoading,
    fetchTransactions,
  } = useTransactionsStore();

  const {
    receipts,
    isLoading: receiptsLoading,
    fetchReceipts,
  } = useReceiptsStore();

  const {
    accounts: financialAccounts,
    accountsSummary,
    isLoading: financialLoading,
    fetchAccounts: fetchFinancialAccounts,
    fetchAccountsSummary,
  } = useFinancialStore();

  // Fetch all data on account change
  useEffect(() => {
    if (currentAccount?.id) {
      fetchBudgets(currentAccount.id, { status: 'active' });
      fetchTransactions(currentAccount.id, { limit: 5 });
      fetchReceipts(currentAccount.id, { limit: 5 });
      fetchFinancialAccounts(currentAccount.id, { is_active: true, is_hidden: false });
      fetchAccountsSummary(currentAccount.id);
    }
  }, [
    currentAccount?.id,
    fetchBudgets,
    fetchTransactions,
    fetchReceipts,
    fetchFinancialAccounts,
    fetchAccountsSummary,
  ]);

  // Fetch detail for default or first active budget
  useEffect(() => {
    if (currentAccount?.id && budgets.length > 0 && !currentBudget) {
      const defaultBudget = budgets.find((b) => b.is_default) || budgets[0];
      if (defaultBudget) {
        fetchBudgetDetail(currentAccount.id, defaultBudget.id);
      }
    }
  }, [currentAccount?.id, budgets, currentBudget, fetchBudgetDetail]);

  const categorySpending = useMemo(
    () => generateCategorySpending(currentBudget),
    [currentBudget]
  );

  const trendData = useMemo(
    () => generateTrendData(currentBudget),
    [currentBudget]
  );

  const netWorthData = useMemo(
    () => generateNetWorthData(financialAccounts),
    [financialAccounts]
  );

  // Calculate stats data for StatsCards
  const statsData: StatsData = useMemo(() => {
    // Calculate total spent this month from transactions
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.transaction_date || t.created_at);
      return transactionDate >= startOfMonth && t.type === 'purchase';
    });
    const totalSpentMonth = monthlyTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );

    // Receipts count this month
    const monthlyReceipts = receipts.filter((r) => {
      const receiptDate = new Date(r.receipt_date || r.created_at);
      return receiptDate >= startOfMonth;
    });
    const receiptsCount = monthlyReceipts.length;

    // Find top store by spending
    const storeSpending: Record<string, { name: string; amount: number }> = {};
    monthlyReceipts.forEach((r) => {
      const storeName = r.store_name || r.merchant_name || 'Unknown';
      const amount = r.total_amount || 0;
      if (!storeSpending[storeName]) {
        storeSpending[storeName] = { name: storeName, amount: 0 };
      }
      storeSpending[storeName].amount += amount;
    });
    const topStore = Object.values(storeSpending).reduce<{
      name: string;
      amount: number;
    } | null>((max, store) => {
      if (!max || store.amount > max.amount) return store;
      return max;
    }, null);

    // Budget status
    let budgetStatus: StatsData['budgetStatus'] = null;
    if (currentBudget) {
      const percentage = Math.round(currentBudget.percentage_used);
      let status: 'on-track' | 'warning' | 'over-budget' = 'on-track';
      if (percentage >= 100) {
        status = 'over-budget';
      } else if (percentage >= 80) {
        status = 'warning';
      }
      budgetStatus = {
        percentage,
        remaining: currentBudget.total_remaining,
        status,
      };
    }

    return {
      totalSpentMonth,
      receiptsCount,
      topStore,
      budgetStatus,
      currency: currentBudget?.currency || 'USD',
    };
  }, [transactions, receipts, currentBudget]);

  // Announce when dashboard data has loaded
  useEffect(() => {
    if (!hasAnnouncedRef.current && currentBudget && !budgetsLoading) {
      const formatAmount = (amount: number) =>
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currentBudget.currency || 'USD',
        }).format(amount);

      const spentPercent = currentBudget.total_amount > 0
        ? Math.round((currentBudget.total_spent / currentBudget.total_amount) * 100)
        : 0;

      announce(
        `Dashboard loaded. ${currentBudget.name}: ${formatAmount(currentBudget.total_spent)} spent of ${formatAmount(currentBudget.total_amount)}, ${spentPercent}% of budget used.`
      );
      hasAnnouncedRef.current = true;
    }
  }, [currentBudget, budgetsLoading]);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="dashboard-page">
          <div className="dashboard-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view your dashboard.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error && budgets.length === 0) {
    return (
      <PageTransition>
        <div className="dashboard-page">
          <div className="dashboard-error">
            <h2>Error Loading Dashboard</h2>
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
      <div className="dashboard-page" role="region" aria-labelledby="dashboard-title">
        <div className="dashboard-header">
          <div>
            <h1 id="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">
              Overview of your finances, budget, and spending
            </p>
          </div>
        </div>

        <div className="dashboard-grid" role="region" aria-label="Financial overview widgets">
          <div className="dashboard-widget widget-stats">
            <StatsCards
              data={statsData}
              isLoading={budgetsLoading || transactionsLoading || receiptsLoading}
            />
          </div>

          <div className="dashboard-widget widget-summary">
            <BudgetSummaryCard
              budget={currentBudget}
              isLoading={budgetsLoading && !currentBudget}
            />
          </div>

          <div className="dashboard-widget widget-actions">
            <QuickActions isLoading={false} />
          </div>

          <div className="dashboard-widget widget-accounts">
            <AccountBalances
              accounts={financialAccounts}
              summary={accountsSummary}
              currency={currentBudget?.currency || 'USD'}
              isLoading={financialLoading}
              limit={4}
            />
          </div>

          <div className="dashboard-widget widget-transactions">
            <RecentTransactions
              transactions={transactions}
              currency={currentBudget?.currency || 'USD'}
              isLoading={transactionsLoading}
              limit={5}
            />
          </div>

          <div className="dashboard-widget widget-receipts">
            <RecentReceipts
              receipts={receipts}
              currency={currentBudget?.currency || 'USD'}
              isLoading={receiptsLoading}
              limit={5}
            />
          </div>

          {/* Lazy-loaded chart components for improved initial load time */}
          <div className="dashboard-widget widget-category">
            <Suspense fallback={<ChartLoadingFallback />}>
              <SpendingByCategory
                data={categorySpending}
                currency={currentBudget?.currency}
                isLoading={budgetsLoading && !currentBudget}
                title="Budget Allocations"
              />
            </Suspense>
          </div>

          <div className="dashboard-widget widget-networth">
            <Suspense fallback={<ChartLoadingFallback />}>
              <NetWorthChart
                data={netWorthData}
                currency={currentBudget?.currency || 'USD'}
                isLoading={financialLoading}
                title="Net Worth Trend"
              />
            </Suspense>
          </div>

          <div className="dashboard-widget widget-trend">
            <Suspense fallback={<ChartLoadingFallback />}>
              <BudgetTrend
                data={trendData}
                currency={currentBudget?.currency}
                isLoading={budgetsLoading && !currentBudget}
                title="Spending Trend"
                showBudgetLine={true}
                budgetAmount={currentBudget?.total_amount}
              />
            </Suspense>
          </div>
        </div>

        {budgets.length > 1 && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Other Budgets</h2>
              <Link to="/budgets" className="view-all-link">
                View All
              </Link>
            </div>
            <div className="other-budgets-list">
              {budgets
                .filter((b) => b.id !== currentBudget?.id)
                .slice(0, 3)
                .map((budget) => (
                  <Link
                    key={budget.id}
                    to={`/budgets/${budget.id}`}
                    className="other-budget-card"
                  >
                    <div className="other-budget-info">
                      <span className="other-budget-name">{budget.name}</span>
                      <span className="other-budget-amount">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: budget.currency || 'USD',
                        }).format(budget.total_amount)}
                      </span>
                    </div>
                    <span
                      className={`other-budget-status status-${budget.status}`}
                    >
                      {budget.status}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
