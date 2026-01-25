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
} from 'recharts';
import {
  retirementPlansApi,
  retirementProjectionsApi,
  type RetirementPlan,
  type WithdrawalStrategyResult,
  type WithdrawalYear,
} from '../api/client';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { SettingsFormSkeleton } from '../components/skeletons';
import { toast } from '../stores/toast';
import './WithdrawalStrategy.css';

type StrategyType = 'fixed' | 'variable' | 'guardrails' | 'bucket';

const STRATEGY_LABELS: Record<StrategyType, string> = {
  fixed: 'Fixed Percentage',
  variable: 'Variable Percentage',
  guardrails: 'Guardrails Strategy',
  bucket: 'Bucket Strategy',
};

const STRATEGY_DESCRIPTIONS: Record<StrategyType, string> = {
  fixed: 'Withdraw a fixed percentage of your initial portfolio each year, adjusted for inflation.',
  variable: 'Withdraw a fixed percentage of the current portfolio value each year.',
  guardrails: 'Adjust withdrawals based on portfolio performance with upper and lower limits.',
  bucket: 'Segment your portfolio into short, medium, and long-term buckets for withdrawals.',
};

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
  name: string;
  payload: WithdrawalYear;
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
    const data = payload[0].payload as WithdrawalYear;
    return (
      <div className="withdrawal-tooltip">
        <div className="tooltip-header">
          <span className="tooltip-year">Year {label}</span>
          <span className="tooltip-age">Age {data.age}</span>
        </div>
        <div className="tooltip-content">
          <div className="tooltip-row">
            <span className="tooltip-label">Portfolio Before</span>
            <span className="tooltip-value">{formatCurrency(data.portfolio_before)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Withdrawal</span>
            <span className="tooltip-value negative">-{formatCurrency(data.withdrawal_amount)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Withdrawal Rate</span>
            <span className="tooltip-value">{(data.withdrawal_rate * 100).toFixed(2)}%</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Portfolio After</span>
            <span className="tooltip-value">{formatCurrency(data.portfolio_after)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function WithdrawalStrategy() {
  const { currentAccount } = useAccountStore();

  const [plans, setPlans] = useState<RetirementPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('fixed');
  const [initialWithdrawalRate, setInitialWithdrawalRate] = useState(4);
  const [floorRate, setFloorRate] = useState(3);
  const [ceilingRate, setCeilingRate] = useState(5);
  const [isCalculating, setIsCalculating] = useState(false);

  const [result, setResult] = useState<WithdrawalStrategyResult | null>(null);
  const [comparisonResults, setComparisonResults] = useState<Record<StrategyType, WithdrawalStrategyResult | null>>({
    fixed: null,
    variable: null,
    guardrails: null,
    bucket: null,
  });
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    async function fetchPlans() {
      if (!currentAccount?.id) return;

      setIsLoadingPlans(true);
      try {
        const response = await retirementPlansApi.list(currentAccount.id, { status: 'active' });
        setPlans(response.plans);
        if (response.plans.length > 0) {
          const defaultPlan = response.plans.find(p => p.is_default) || response.plans[0];
          setSelectedPlanId(defaultPlan.id);
          setInitialWithdrawalRate(defaultPlan.safe_withdrawal_rate * 100);
        }
      } catch {
        toast.error('Failed to load retirement plans');
      } finally {
        setIsLoadingPlans(false);
      }
    }
    fetchPlans();
  }, [currentAccount?.id]);

  const calculateStrategy = useCallback(async () => {
    if (!currentAccount?.id || !selectedPlanId) return;

    setIsCalculating(true);
    setResult(null);

    try {
      if (showComparison) {
        const strategies: StrategyType[] = ['fixed', 'variable', 'guardrails', 'bucket'];
        const results = await Promise.all(
          strategies.map(strategy =>
            retirementProjectionsApi.withdrawalStrategy(currentAccount.id, {
              plan_id: selectedPlanId,
              strategy,
              initial_withdrawal_rate: initialWithdrawalRate / 100,
              floor_rate: floorRate / 100,
              ceiling_rate: ceilingRate / 100,
            }).catch(() => null)
          )
        );
        setComparisonResults({
          fixed: results[0],
          variable: results[1],
          guardrails: results[2],
          bucket: results[3],
        });
        setResult(results.find(r => r !== null) || null);
      } else {
        const strategyResult = await retirementProjectionsApi.withdrawalStrategy(currentAccount.id, {
          plan_id: selectedPlanId,
          strategy: selectedStrategy,
          initial_withdrawal_rate: initialWithdrawalRate / 100,
          floor_rate: floorRate / 100,
          ceiling_rate: ceilingRate / 100,
        });
        setResult(strategyResult);
      }
      toast.success('Withdrawal strategy calculated');
    } catch {
      toast.error('Failed to calculate withdrawal strategy');
    } finally {
      setIsCalculating(false);
    }
  }, [currentAccount?.id, selectedPlanId, selectedStrategy, initialWithdrawalRate, floorRate, ceilingRate, showComparison]);

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

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="withdrawal-strategy-page">
          <div className="strategy-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to plan your withdrawal strategy.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoadingPlans) {
    return (
      <PageTransition>
        <div className="withdrawal-strategy-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="withdrawal-strategy-page">
        <div className="strategy-header">
          <Link to="/retirement-plans" className="back-link">
            &larr; Back to Retirement Plans
          </Link>
          <div className="strategy-header-row">
            <div>
              <h1>Withdrawal Strategy Planner</h1>
              <p className="strategy-subtitle">
                Plan how to withdraw from your retirement portfolio sustainably
              </p>
            </div>
            <div className="header-actions">
              <Link to="/retirement-projections" className="secondary-link">
                View Projections
              </Link>
              <Link to="/retirement-backtest" className="secondary-link">
                Historical Backtest
              </Link>
            </div>
          </div>
        </div>

        <div className="strategy-content">
          <div className="strategy-controls-panel">
            <h2>Strategy Settings</h2>

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

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showComparison}
                  onChange={(e) => setShowComparison(e.target.checked)}
                />
                <span>Compare all strategies</span>
              </label>
            </div>

            {!showComparison && (
              <div className="form-group">
                <label htmlFor="strategySelect">Withdrawal Strategy</label>
                <select
                  id="strategySelect"
                  value={selectedStrategy}
                  onChange={(e) => setSelectedStrategy(e.target.value as StrategyType)}
                  className="form-select"
                >
                  {(Object.keys(STRATEGY_LABELS) as StrategyType[]).map(strategy => (
                    <option key={strategy} value={strategy}>
                      {STRATEGY_LABELS[strategy]}
                    </option>
                  ))}
                </select>
                <span className="input-hint">{STRATEGY_DESCRIPTIONS[selectedStrategy]}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="withdrawalRate">Initial Withdrawal Rate (%)</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  id="withdrawalRate"
                  value={initialWithdrawalRate}
                  onChange={(e) => setInitialWithdrawalRate(Number(e.target.value))}
                  min={1}
                  max={10}
                  step={0.1}
                  className="form-input"
                />
                <span className="input-suffix">%</span>
              </div>
              <span className="input-hint">Traditional rule is 4% (Trinity Study)</span>
            </div>

            {(selectedStrategy === 'guardrails' || showComparison) && (
              <>
                <div className="form-group">
                  <label htmlFor="floorRate">Floor Rate (%)</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="floorRate"
                      value={floorRate}
                      onChange={(e) => setFloorRate(Number(e.target.value))}
                      min={1}
                      max={10}
                      step={0.1}
                      className="form-input"
                    />
                    <span className="input-suffix">%</span>
                  </div>
                  <span className="input-hint">Minimum withdrawal rate</span>
                </div>

                <div className="form-group">
                  <label htmlFor="ceilingRate">Ceiling Rate (%)</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="ceilingRate"
                      value={ceilingRate}
                      onChange={(e) => setCeilingRate(Number(e.target.value))}
                      min={1}
                      max={15}
                      step={0.1}
                      className="form-input"
                    />
                    <span className="input-suffix">%</span>
                  </div>
                  <span className="input-hint">Maximum withdrawal rate</span>
                </div>
              </>
            )}

            <button
              onClick={calculateStrategy}
              disabled={isCalculating || !selectedPlanId}
              className="calculate-button"
            >
              {isCalculating ? 'Calculating...' : 'Calculate Strategy'}
            </button>

            {selectedPlan && (
              <div className="plan-summary">
                <h3>Plan Summary</h3>
                <div className="plan-stat">
                  <span className="stat-label">Target Spending</span>
                  <span className="stat-value">{formatCurrency(selectedPlan.target_annual_spending)}</span>
                </div>
                <div className="plan-stat">
                  <span className="stat-label">Current Age</span>
                  <span className="stat-value">{selectedPlan.current_age}</span>
                </div>
                <div className="plan-stat">
                  <span className="stat-label">Retirement Age</span>
                  <span className="stat-value">{selectedPlan.target_retirement_age}</span>
                </div>
                <div className="plan-stat">
                  <span className="stat-label">Life Expectancy</span>
                  <span className="stat-value">{selectedPlan.life_expectancy}</span>
                </div>
              </div>
            )}
          </div>

          <div className="strategy-results-panel">
            {result ? (
              <>
                <div className="strategy-summary-cards">
                  <div className="summary-card highlight">
                    <span className="summary-label">Recommended Annual Withdrawal</span>
                    <span className="summary-value">{formatCurrency(result.recommended_withdrawal)}</span>
                    <span className="summary-detail">
                      {formatCurrency(result.recommended_withdrawal / 12)}/month
                    </span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">First Year Withdrawal</span>
                    <span className="summary-value">{formatCurrency(result.first_year_withdrawal)}</span>
                  </div>
                  <div className={`summary-card ${result.success_probability >= 0.9 ? 'success' : result.success_probability >= 0.75 ? 'warning' : 'danger'}`}>
                    <span className="summary-label">Success Probability</span>
                    <span className="summary-value">{(result.success_probability * 100).toFixed(1)}%</span>
                    <span className="summary-detail">
                      {result.success_probability >= 0.9 ? 'Excellent' : result.success_probability >= 0.75 ? 'Good' : 'Needs adjustment'}
                    </span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">Strategy Type</span>
                    <span className="summary-value strategy-badge">{STRATEGY_LABELS[result.strategy as StrategyType]}</span>
                  </div>
                </div>

                {showComparison && (
                  <div className="strategy-comparison-section">
                    <h3>Strategy Comparison</h3>
                    <div className="comparison-grid">
                      {(Object.keys(STRATEGY_LABELS) as StrategyType[]).map(strategy => {
                        const strategyResult = comparisonResults[strategy];
                        if (!strategyResult) return null;
                        return (
                          <div key={strategy} className="comparison-card">
                            <h4>{STRATEGY_LABELS[strategy]}</h4>
                            <div className="comparison-stats">
                              <div className="comparison-stat">
                                <span className="stat-label">Annual Withdrawal</span>
                                <span className="stat-value">{formatCurrency(strategyResult.recommended_withdrawal)}</span>
                              </div>
                              <div className="comparison-stat">
                                <span className="stat-label">Success Rate</span>
                                <span className={`stat-value ${strategyResult.success_probability >= 0.9 ? 'success' : strategyResult.success_probability >= 0.75 ? 'warning' : 'danger'}`}>
                                  {(strategyResult.success_probability * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="strategy-chart-section">
                  <h3>Withdrawal Schedule</h3>
                  <div className="strategy-chart-container">
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart
                        data={result.withdrawal_schedule}
                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis
                          dataKey="age"
                          stroke="rgba(255, 255, 255, 0.5)"
                          tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                          label={{ value: 'Age', position: 'insideBottom', offset: -5, fill: 'rgba(255, 255, 255, 0.5)' }}
                        />
                        <YAxis
                          yAxisId="left"
                          tickFormatter={formatYAxis}
                          stroke="rgba(255, 255, 255, 0.5)"
                          tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                          width={70}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                          stroke="rgba(255, 255, 255, 0.5)"
                          tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                          width={50}
                          domain={[0, 0.1]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <ReferenceLine
                          yAxisId="right"
                          y={initialWithdrawalRate / 100}
                          stroke="#f39c12"
                          strokeDasharray="5 5"
                          label={{
                            value: `Target: ${initialWithdrawalRate}%`,
                            position: 'right',
                            fill: '#f39c12',
                            fontSize: 10,
                          }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="portfolio_before"
                          name="Portfolio Value"
                          stroke="#646cff"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="withdrawal_amount"
                          name="Annual Withdrawal"
                          stroke="#2ecc71"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="withdrawal_rate"
                          name="Withdrawal Rate"
                          stroke="#e74c3c"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="strategy-table-section">
                  <h3>Year-by-Year Schedule</h3>
                  <div className="strategy-table-scroll">
                    <table className="strategy-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Age</th>
                          <th>Portfolio Before</th>
                          <th>Withdrawal</th>
                          <th>Rate</th>
                          <th>Portfolio After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.withdrawal_schedule.map((year) => (
                          <tr key={year.year} className={year.portfolio_after <= 0 ? 'depleted' : ''}>
                            <td>{year.year}</td>
                            <td>{year.age}</td>
                            <td className="amount">{formatCurrency(year.portfolio_before)}</td>
                            <td className="amount negative">-{formatCurrency(year.withdrawal_amount)}</td>
                            <td className="amount">{(year.withdrawal_rate * 100).toFixed(2)}%</td>
                            <td className="amount">{formatCurrency(year.portfolio_after)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="strategy-empty-results">
                <div className="empty-icon">$</div>
                <h3>Plan Your Withdrawals</h3>
                <p>
                  Select a retirement plan and withdrawal strategy to see recommended withdrawal amounts
                  and a year-by-year schedule.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
