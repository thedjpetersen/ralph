import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  BarChart,
  Bar,
} from 'recharts';
import {
  retirementPlansApi,
  retirementBacktestApi,
  type RetirementPlan,
  type BacktestResult,
  type BacktestScenario,
  type HistoricalPeriod,
  type BacktestYear,
} from '../api/client';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { SettingsFormSkeleton } from '../components/skeletons';
import { ScenarioComparison } from '../components/ScenarioComparison';
import { toast } from '../stores/toast';
import './RetirementBacktest.css';

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
  name: string;
  payload: BacktestYear;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  if (active && payload && payload.length) {
    const data = payload[0].payload as BacktestYear;
    return (
      <div className="backtest-tooltip">
        <div className="tooltip-header">
          <span className="tooltip-year">{label}</span>
        </div>
        <div className="tooltip-content">
          <div className="tooltip-row">
            <span className="tooltip-label">Starting Balance</span>
            <span className="tooltip-value">{formatCurrency(data.starting_balance)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Withdrawal</span>
            <span className="tooltip-value negative">-{formatCurrency(data.withdrawal)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Market Return</span>
            <span className={`tooltip-value ${data.market_return >= 0 ? 'positive' : 'negative'}`}>
              {(data.market_return * 100).toFixed(2)}%
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Inflation</span>
            <span className="tooltip-value">{(data.inflation_rate * 100).toFixed(2)}%</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Ending Balance</span>
            <span className="tooltip-value">{formatCurrency(data.ending_balance)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function RetirementBacktest() {
  const { currentAccount } = useAccountStore();

  const [plans, setPlans] = useState<RetirementPlan[]>([]);
  const [scenarios, setScenarios] = useState<BacktestScenario[]>([]);
  const [historicalPeriods, setHistoricalPeriods] = useState<HistoricalPeriod[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [startYear, setStartYear] = useState(1970);
  const [endYear, setEndYear] = useState(2020);
  const [initialPortfolio, setInitialPortfolio] = useState(1000000);
  const [annualWithdrawal, setAnnualWithdrawal] = useState(40000);
  const [withdrawalStrategy, setWithdrawalStrategy] = useState<'fixed' | 'inflation_adjusted' | 'percentage'>('inflation_adjusted');
  const [stockAllocation, setStockAllocation] = useState(60);
  const [bondAllocation, setBondAllocation] = useState(35);
  const [cashAllocation, setCashAllocation] = useState(5);
  const [isRunning, setIsRunning] = useState(false);

  const [result, setResult] = useState<BacktestResult | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'comparison'>('results');

  useEffect(() => {
    async function fetchData() {
      if (!currentAccount?.id) return;

      setIsLoadingData(true);
      try {
        const [plansResponse, scenariosResponse, periodsResponse] = await Promise.all([
          retirementPlansApi.list(currentAccount.id, { status: 'active' }),
          retirementBacktestApi.scenarios(currentAccount.id).catch(() => []),
          retirementBacktestApi.historicalPeriods(currentAccount.id).catch(() => []),
        ]);
        setPlans(plansResponse.plans);
        setScenarios(scenariosResponse);
        setHistoricalPeriods(periodsResponse);
        if (plansResponse.plans.length > 0) {
          const defaultPlan = plansResponse.plans.find(p => p.is_default) || plansResponse.plans[0];
          setSelectedPlanId(defaultPlan.id);
          setAnnualWithdrawal(defaultPlan.target_annual_spending);
        }
      } catch {
        toast.error('Failed to load data');
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
  }, [currentAccount?.id]);

  const runBacktest = useCallback(async () => {
    if (!currentAccount?.id || !selectedPlanId) return;

    setIsRunning(true);
    setResult(null);

    try {
      const backtestResult = await retirementBacktestApi.runBacktest(currentAccount.id, {
        plan_id: selectedPlanId,
        start_year: startYear,
        end_year: endYear,
        initial_portfolio: initialPortfolio,
        annual_withdrawal: annualWithdrawal,
        withdrawal_strategy: withdrawalStrategy,
        asset_allocation: {
          stocks: stockAllocation / 100,
          bonds: bondAllocation / 100,
          cash: cashAllocation / 100,
        },
      });
      setResult(backtestResult);
      toast.success('Backtest completed');
    } catch {
      toast.error('Failed to run backtest');
    } finally {
      setIsRunning(false);
    }
  }, [currentAccount?.id, selectedPlanId, startYear, endYear, initialPortfolio, annualWithdrawal, withdrawalStrategy, stockAllocation, bondAllocation, cashAllocation]);

  const handlePeriodSelect = (period: HistoricalPeriod) => {
    setStartYear(period.start_year);
    setEndYear(period.end_year);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  // Unused variable removed to fix lint warning
  // const selectedPlan = plans.find(p => p.id === selectedPlanId);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="retirement-backtest-page">
          <div className="backtest-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to run historical backtests.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoadingData) {
    return (
      <PageTransition>
        <div className="retirement-backtest-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="retirement-backtest-page">
        <div className="backtest-header">
          <Link to="/retirement-plans" className="back-link">
            &larr; Back to Retirement Plans
          </Link>
          <div className="backtest-header-row">
            <div>
              <h1>Historical Backtesting</h1>
              <p className="backtest-subtitle">
                Test your retirement strategy against historical market data
              </p>
            </div>
            <div className="header-actions">
              <Link to="/retirement-projections" className="secondary-link">
                View Projections
              </Link>
              <Link to="/withdrawal-strategy" className="secondary-link">
                Withdrawal Strategy
              </Link>
            </div>
          </div>
        </div>

        <div className="backtest-content">
          <div className="backtest-controls-panel">
            <h2>Backtest Settings</h2>

            <div className="form-group">
              <label htmlFor="planSelect">Retirement Plan</label>
              <select
                id="planSelect"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="form-select"
                disabled={plans.length === 0}
              >
                {plans.length === 0 ? (
                  <option value="">No active plans</option>
                ) : (
                  plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} {plan.is_default ? '(Default)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="form-section">
              <h3>Time Period</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startYear">Start Year</label>
                  <input
                    type="number"
                    id="startYear"
                    value={startYear}
                    onChange={(e) => setStartYear(Number(e.target.value))}
                    min={1928}
                    max={2023}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endYear">End Year</label>
                  <input
                    type="number"
                    id="endYear"
                    value={endYear}
                    onChange={(e) => setEndYear(Number(e.target.value))}
                    min={1928}
                    max={2023}
                    className="form-input"
                  />
                </div>
              </div>

              {historicalPeriods.length > 0 && (
                <div className="quick-periods">
                  <span className="periods-label">Quick select:</span>
                  <div className="periods-buttons">
                    {historicalPeriods.slice(0, 4).map(period => (
                      <button
                        key={period.id}
                        onClick={() => handlePeriodSelect(period)}
                        className="period-button"
                        title={period.description}
                      >
                        {period.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="form-section">
              <h3>Portfolio Settings</h3>
              <div className="form-group">
                <label htmlFor="initialPortfolio">Initial Portfolio</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    id="initialPortfolio"
                    value={initialPortfolio}
                    onChange={(e) => setInitialPortfolio(Number(e.target.value))}
                    min={0}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="annualWithdrawal">Annual Withdrawal</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    id="annualWithdrawal"
                    value={annualWithdrawal}
                    onChange={(e) => setAnnualWithdrawal(Number(e.target.value))}
                    min={0}
                    className="form-input"
                  />
                </div>
                <span className="input-hint">
                  Withdrawal rate: {((annualWithdrawal / initialPortfolio) * 100).toFixed(2)}%
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="withdrawalStrategy">Withdrawal Strategy</label>
                <select
                  id="withdrawalStrategy"
                  value={withdrawalStrategy}
                  onChange={(e) => setWithdrawalStrategy(e.target.value as typeof withdrawalStrategy)}
                  className="form-select"
                >
                  <option value="fixed">Fixed (No adjustment)</option>
                  <option value="inflation_adjusted">Inflation Adjusted</option>
                  <option value="percentage">Percentage of Portfolio</option>
                </select>
              </div>
            </div>

            <div className="form-section">
              <h3>Asset Allocation</h3>
              <div className="allocation-inputs">
                <div className="form-group">
                  <label htmlFor="stockAllocation">Stocks</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="stockAllocation"
                      value={stockAllocation}
                      onChange={(e) => setStockAllocation(Number(e.target.value))}
                      min={0}
                      max={100}
                      className="form-input"
                    />
                    <span className="input-suffix">%</span>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="bondAllocation">Bonds</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="bondAllocation"
                      value={bondAllocation}
                      onChange={(e) => setBondAllocation(Number(e.target.value))}
                      min={0}
                      max={100}
                      className="form-input"
                    />
                    <span className="input-suffix">%</span>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="cashAllocation">Cash</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="cashAllocation"
                      value={cashAllocation}
                      onChange={(e) => setCashAllocation(Number(e.target.value))}
                      min={0}
                      max={100}
                      className="form-input"
                    />
                    <span className="input-suffix">%</span>
                  </div>
                </div>
              </div>
              {stockAllocation + bondAllocation + cashAllocation !== 100 && (
                <span className="allocation-warning">
                  Allocation must total 100% (currently {stockAllocation + bondAllocation + cashAllocation}%)
                </span>
              )}
            </div>

            <button
              onClick={runBacktest}
              disabled={isRunning || !selectedPlanId || stockAllocation + bondAllocation + cashAllocation !== 100}
              className="run-button"
            >
              {isRunning ? 'Running Backtest...' : 'Run Backtest'}
            </button>
          </div>

          <div className="backtest-results-panel">
            {result ? (
              <>
                <div className="results-tabs">
                  <button
                    className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
                    onClick={() => setActiveTab('results')}
                  >
                    Backtest Results
                  </button>
                  <button
                    className={`tab-button ${activeTab === 'comparison' ? 'active' : ''}`}
                    onClick={() => setActiveTab('comparison')}
                  >
                    Compare Strategies
                  </button>
                </div>

                {activeTab === 'results' ? (
                  <>
                    <div className="backtest-summary-cards">
                      <div className={`summary-card ${result.success ? 'success' : 'danger'}`}>
                        <span className="summary-label">Result</span>
                        <span className="summary-value">{result.success ? 'Success' : 'Failed'}</span>
                        {!result.success && result.failure_year && (
                          <span className="summary-detail">Depleted in {result.failure_year}</span>
                        )}
                      </div>
                      <div className="summary-card">
                        <span className="summary-label">Initial Portfolio</span>
                        <span className="summary-value">{formatCurrency(result.initial_portfolio)}</span>
                      </div>
                      <div className="summary-card">
                        <span className="summary-label">Final Portfolio</span>
                        <span className={`summary-value ${result.final_portfolio > result.initial_portfolio ? 'positive' : result.final_portfolio > 0 ? '' : 'negative'}`}>
                          {formatCurrency(result.final_portfolio)}
                        </span>
                      </div>
                      <div className="summary-card">
                        <span className="summary-label">Total Withdrawals</span>
                        <span className="summary-value">{formatCurrency(result.total_withdrawals)}</span>
                      </div>
                      <div className="summary-card">
                        <span className="summary-label">Years Tested</span>
                        <span className="summary-value">{result.years_tested}</span>
                        <span className="summary-detail">{result.start_year} - {result.end_year}</span>
                      </div>
                    </div>

                    <div className="backtest-stats-section">
                      <h3>Performance Statistics</h3>
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-label">Average Annual Return</span>
                          <span className={`stat-value ${result.statistics.average_annual_return >= 0 ? 'positive' : 'negative'}`}>
                            {(result.statistics.average_annual_return * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Best Year</span>
                          <span className="stat-value positive">
                            {(result.statistics.best_year_return * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Worst Year</span>
                          <span className="stat-value negative">
                            {(result.statistics.worst_year_return * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Max Drawdown</span>
                          <span className="stat-value negative">
                            {(result.statistics.max_drawdown * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Average Withdrawal</span>
                          <span className="stat-value">
                            {formatCurrency(result.statistics.average_withdrawal)}
                          </span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Total Inflation</span>
                          <span className="stat-value">
                            {(result.statistics.total_inflation_adjustment * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="backtest-chart-section">
                      <h3>Portfolio Value Over Time</h3>
                      <div className="backtest-chart-container">
                        <ResponsiveContainer width="100%" height={350}>
                          <LineChart
                            data={result.yearly_data}
                            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis
                              dataKey="year"
                              stroke="rgba(255, 255, 255, 0.5)"
                              tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                            />
                            <YAxis
                              tickFormatter={formatYAxis}
                              stroke="rgba(255, 255, 255, 0.5)"
                              tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                              width={70}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            <ReferenceLine
                              y={result.initial_portfolio}
                              stroke="#f39c12"
                              strokeDasharray="5 5"
                              label={{
                                value: 'Initial',
                                position: 'right',
                                fill: '#f39c12',
                                fontSize: 10,
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="starting_balance"
                              name="Portfolio Value"
                              stroke="#646cff"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="backtest-returns-section">
                      <h3>Annual Returns</h3>
                      <div className="backtest-chart-container">
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={result.yearly_data}
                            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis
                              dataKey="year"
                              stroke="rgba(255, 255, 255, 0.5)"
                              tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 10 }}
                              interval={Math.floor(result.yearly_data.length / 10)}
                            />
                            <YAxis
                              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                              stroke="rgba(255, 255, 255, 0.5)"
                              tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                              width={50}
                            />
                            <Tooltip
                              formatter={(value) => [`${((value as number) * 100).toFixed(2)}%`, 'Return']}
                              labelFormatter={(label) => `Year: ${label}`}
                              contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #444',
                                borderRadius: '8px',
                              }}
                            />
                            <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.3)" />
                            <Bar
                              dataKey="market_return"
                              name="Market Return"
                              fill="#646cff"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="backtest-table-section">
                      <h3>Year-by-Year Data</h3>
                      <div className="backtest-table-scroll">
                        <table className="backtest-table">
                          <thead>
                            <tr>
                              <th>Year</th>
                              <th>Starting Balance</th>
                              <th>Withdrawal</th>
                              <th>Market Return</th>
                              <th>Inflation</th>
                              <th>Ending Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.yearly_data.map((year) => (
                              <tr key={year.year} className={year.ending_balance <= 0 ? 'depleted' : ''}>
                                <td>{year.year}</td>
                                <td className="amount">{formatCurrency(year.starting_balance)}</td>
                                <td className="amount negative">-{formatCurrency(year.withdrawal)}</td>
                                <td className={`amount ${year.market_return >= 0 ? 'positive' : 'negative'}`}>
                                  {(year.market_return * 100).toFixed(2)}%
                                </td>
                                <td className="amount">{(year.inflation_rate * 100).toFixed(2)}%</td>
                                <td className="amount">{formatCurrency(year.ending_balance)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <ScenarioComparison
                    accountId={currentAccount.id}
                    planId={selectedPlanId}
                    scenarios={scenarios}
                  />
                )}
              </>
            ) : (
              <div className="backtest-empty-results">
                <div className="empty-icon">$</div>
                <h3>Run a Backtest</h3>
                <p>
                  Configure your portfolio settings and select a historical period to see how your
                  retirement strategy would have performed.
                </p>
                {scenarios.length > 0 && (
                  <div className="scenario-suggestions">
                    <h4>Try these historical scenarios:</h4>
                    <div className="scenario-cards">
                      {scenarios.slice(0, 3).map(scenario => (
                        <div key={scenario.id} className="scenario-card">
                          <h5>{scenario.name}</h5>
                          <p>{scenario.description}</p>
                          <span className="scenario-period">{scenario.start_year} - {scenario.end_year}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
