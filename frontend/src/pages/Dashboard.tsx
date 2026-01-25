import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBudgetsStore, type BudgetDetail } from '../stores/budgets';
import { useAccountStore } from '../stores/account';
import { useTransactionsStore } from '../stores/transactions';
import { useReceiptsStore } from '../stores/receipts';
import { useFinancialStore } from '../stores/financial';
import { PageTransition } from '../components/PageTransition';
import {
  BudgetSummaryCard,
  SpendingByCategory,
  BudgetTrend,
  RecentTransactions,
  RecentReceipts,
  AccountBalances,
  QuickActions,
  NetWorthChart,
} from '../components/dashboard';
import './Dashboard.css';

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
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p className="dashboard-subtitle">
              Overview of your finances, budget, and spending
            </p>
          </div>
        </div>

        <div className="dashboard-grid">
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

          <div className="dashboard-widget widget-category">
            <SpendingByCategory
              data={categorySpending}
              currency={currentBudget?.currency}
              isLoading={budgetsLoading && !currentBudget}
              title="Budget Allocations"
            />
          </div>

          <div className="dashboard-widget widget-networth">
            <NetWorthChart
              data={netWorthData}
              currency={currentBudget?.currency || 'USD'}
              isLoading={financialLoading}
              title="Net Worth Trend"
            />
          </div>

          <div className="dashboard-widget widget-trend">
            <BudgetTrend
              data={trendData}
              currency={currentBudget?.currency}
              isLoading={budgetsLoading && !currentBudget}
              title="Spending Trend"
              showBudgetLine={true}
              budgetAmount={currentBudget?.total_amount}
            />
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
