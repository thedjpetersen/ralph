import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  retirementPlansApi,
  retirementProjectionsApi,
  type RetirementPlan,
  type ProjectionResult,
  type YearlyProjection,
} from '../api/client';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { SettingsFormSkeleton } from '../components/skeletons';
import { toast } from '../stores/toast';
import './RetirementProjections.css';

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
  name: string;
  payload: YearlyProjection;
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
    const data = payload[0].payload as YearlyProjection;
    return (
      <div className="projection-tooltip">
        <div className="tooltip-header">
          <span className="tooltip-year">Year {label}</span>
          <span className="tooltip-age">Age {data.age}</span>
        </div>
        <div className="tooltip-content">
          <div className="tooltip-row main">
            <span className="tooltip-indicator" style={{ backgroundColor: '#646cff' }} />
            <span className="tooltip-label">Portfolio</span>
            <span className="tooltip-value">{formatCurrency(data.portfolio_value)}</span>
          </div>
          <div className="tooltip-divider" />
          <div className="tooltip-row">
            <span className="tooltip-label">Contributions</span>
            <span className="tooltip-value positive">+{formatCurrency(data.contributions)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Returns</span>
            <span className="tooltip-value positive">+{formatCurrency(data.investment_returns)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Withdrawals</span>
            <span className="tooltip-value negative">-{formatCurrency(data.withdrawals)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Net Cash Flow</span>
            <span className={`tooltip-value ${data.net_cash_flow >= 0 ? 'positive' : 'negative'}`}>
              {data.net_cash_flow >= 0 ? '+' : ''}{formatCurrency(data.net_cash_flow)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function RetirementProjections() {
  const { currentAccount } = useAccountStore();

  const [plans, setPlans] = useState<RetirementPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedScenario, setSelectedScenario] = useState<'optimistic' | 'baseline' | 'pessimistic'>('baseline');
  const [projectionYears, setProjectionYears] = useState(40);
  const [isGenerating, setIsGenerating] = useState(false);

  const [baselineProjection, setBaselineProjection] = useState<ProjectionResult | null>(null);
  const [optimisticProjection, setOptimisticProjection] = useState<ProjectionResult | null>(null);
  const [pessimisticProjection, setPessimisticProjection] = useState<ProjectionResult | null>(null);
  const [showAllScenarios, setShowAllScenarios] = useState(false);

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
        }
      } catch {
        toast.error('Failed to load retirement plans');
      } finally {
        setIsLoadingPlans(false);
      }
    }
    fetchPlans();
  }, [currentAccount?.id]);

  const generateProjections = useCallback(async () => {
    if (!currentAccount?.id || !selectedPlanId) return;

    setIsGenerating(true);
    setBaselineProjection(null);
    setOptimisticProjection(null);
    setPessimisticProjection(null);

    try {
      if (showAllScenarios) {
        const [baseline, optimistic, pessimistic] = await Promise.all([
          retirementProjectionsApi.generate(currentAccount.id, {
            plan_id: selectedPlanId,
            years: projectionYears,
            scenario: 'baseline',
          }),
          retirementProjectionsApi.generate(currentAccount.id, {
            plan_id: selectedPlanId,
            years: projectionYears,
            scenario: 'optimistic',
          }),
          retirementProjectionsApi.generate(currentAccount.id, {
            plan_id: selectedPlanId,
            years: projectionYears,
            scenario: 'pessimistic',
          }),
        ]);
        setBaselineProjection(baseline);
        setOptimisticProjection(optimistic);
        setPessimisticProjection(pessimistic);
      } else {
        const result = await retirementProjectionsApi.generate(currentAccount.id, {
          plan_id: selectedPlanId,
          years: projectionYears,
          scenario: selectedScenario,
        });
        if (selectedScenario === 'baseline') setBaselineProjection(result);
        else if (selectedScenario === 'optimistic') setOptimisticProjection(result);
        else setPessimisticProjection(result);
      }
      toast.success('Projections generated successfully');
    } catch {
      toast.error('Failed to generate projections');
    } finally {
      setIsGenerating(false);
    }
  }, [currentAccount?.id, selectedPlanId, projectionYears, selectedScenario, showAllScenarios]);

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

  const currentProjection = showAllScenarios
    ? baselineProjection
    : selectedScenario === 'baseline'
    ? baselineProjection
    : selectedScenario === 'optimistic'
    ? optimisticProjection
    : pessimisticProjection;

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const fireNumber = selectedPlan
    ? selectedPlan.target_annual_spending / selectedPlan.safe_withdrawal_rate
    : 0;

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="retirement-projections-page">
          <div className="projections-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view retirement projections.</p>
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
        <div className="retirement-projections-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="retirement-projections-page">
        <div className="projections-header">
          <Link to="/retirement-plans" className="back-link">
            &larr; Back to Retirement Plans
          </Link>
          <div className="projections-header-row">
            <div>
              <h1>Retirement Projections</h1>
              <p className="projections-subtitle">
                Long-term portfolio projections based on your retirement plan assumptions
              </p>
            </div>
            <div className="header-actions">
              <Link to="/retirement-backtest" className="secondary-link">
                Historical Backtest
              </Link>
              <Link to="/withdrawal-strategy" className="secondary-link">
                Withdrawal Strategy
              </Link>
            </div>
          </div>
        </div>

        <div className="projections-content">
          <div className="projections-controls-panel">
            <h2>Projection Settings</h2>

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

            <div className="form-group">
              <label htmlFor="projectionYears">Projection Years</label>
              <input
                type="number"
                id="projectionYears"
                value={projectionYears}
                onChange={(e) => setProjectionYears(Number(e.target.value))}
                min={10}
                max={60}
                className="form-input"
              />
              <span className="input-hint">How many years to project (10-60)</span>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showAllScenarios}
                  onChange={(e) => setShowAllScenarios(e.target.checked)}
                />
                <span>Compare all scenarios</span>
              </label>
            </div>

            {!showAllScenarios && (
              <div className="form-group">
                <label htmlFor="scenarioSelect">Scenario</label>
                <select
                  id="scenarioSelect"
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value as typeof selectedScenario)}
                  className="form-select"
                >
                  <option value="optimistic">Optimistic (Higher returns)</option>
                  <option value="baseline">Baseline (Expected)</option>
                  <option value="pessimistic">Pessimistic (Lower returns)</option>
                </select>
              </div>
            )}

            <button
              onClick={generateProjections}
              disabled={isGenerating || !selectedPlanId}
              className="generate-button"
            >
              {isGenerating ? 'Generating...' : 'Generate Projections'}
            </button>

            {selectedPlan && (
              <div className="plan-summary">
                <h3>Plan Assumptions</h3>
                <div className="plan-stat">
                  <span className="stat-label">Target Annual Spending</span>
                  <span className="stat-value">{formatCurrency(selectedPlan.target_annual_spending)}</span>
                </div>
                <div className="plan-stat">
                  <span className="stat-label">Safe Withdrawal Rate</span>
                  <span className="stat-value">{(selectedPlan.safe_withdrawal_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="plan-stat">
                  <span className="stat-label">Expected Return</span>
                  <span className="stat-value">{(selectedPlan.expected_return_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="plan-stat">
                  <span className="stat-label">Inflation Rate</span>
                  <span className="stat-value">{(selectedPlan.inflation_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="plan-stat highlight">
                  <span className="stat-label">FIRE Number</span>
                  <span className="stat-value">{formatCurrency(fireNumber)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="projections-results-panel">
            {currentProjection ? (
              <>
                <div className="projection-summary-cards">
                  <div className="summary-card">
                    <span className="summary-label">Starting Portfolio</span>
                    <span className="summary-value">
                      {formatCurrency(currentProjection.summary.starting_portfolio)}
                    </span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">Ending Portfolio</span>
                    <span className={`summary-value ${currentProjection.summary.ending_portfolio > 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(currentProjection.summary.ending_portfolio)}
                    </span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">Total Contributions</span>
                    <span className="summary-value contributions">
                      {formatCurrency(currentProjection.summary.total_contributions)}
                    </span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">Total Returns</span>
                    <span className="summary-value returns">
                      {formatCurrency(currentProjection.summary.total_investment_returns)}
                    </span>
                  </div>
                  <div className={`summary-card ${currentProjection.summary.portfolio_survives ? 'success' : 'warning'}`}>
                    <span className="summary-label">Portfolio Status</span>
                    <span className="summary-value">
                      {currentProjection.summary.portfolio_survives ? 'Survives' : 'Depleted'}
                    </span>
                    {!currentProjection.summary.portfolio_survives && currentProjection.summary.depletion_age && (
                      <span className="summary-detail">at age {currentProjection.summary.depletion_age}</span>
                    )}
                  </div>
                </div>

                <div className="projection-chart-section">
                  <h3>Portfolio Value Over Time</h3>
                  <div className="projection-chart-container">
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart
                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#646cff" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#646cff" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorOptimistic" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2ecc71" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorPessimistic" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e74c3c" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#e74c3c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis
                          dataKey="age"
                          stroke="rgba(255, 255, 255, 0.5)"
                          tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                          label={{ value: 'Age', position: 'insideBottom', offset: -5, fill: 'rgba(255, 255, 255, 0.5)' }}
                          type="number"
                          domain={['dataMin', 'dataMax']}
                          allowDuplicatedCategory={false}
                        />
                        <YAxis
                          tickFormatter={formatYAxis}
                          stroke="rgba(255, 255, 255, 0.5)"
                          tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                          width={70}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        />
                        <ReferenceLine
                          y={fireNumber}
                          stroke="#f39c12"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          label={{
                            value: `FIRE: ${formatYAxis(fireNumber)}`,
                            position: 'right',
                            fill: '#f39c12',
                            fontSize: 11,
                          }}
                        />
                        {showAllScenarios && optimisticProjection && (
                          <Area
                            data={optimisticProjection.projections}
                            type="monotone"
                            dataKey="portfolio_value"
                            name="Optimistic"
                            stroke="#2ecc71"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorOptimistic)"
                          />
                        )}
                        {(showAllScenarios ? baselineProjection : currentProjection) && (
                          <Area
                            data={(showAllScenarios ? baselineProjection : currentProjection)?.projections}
                            type="monotone"
                            dataKey="portfolio_value"
                            name={showAllScenarios ? 'Baseline' : currentProjection?.scenario || 'Portfolio'}
                            stroke="#646cff"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorBaseline)"
                          />
                        )}
                        {showAllScenarios && pessimisticProjection && (
                          <Area
                            data={pessimisticProjection.projections}
                            type="monotone"
                            dataKey="portfolio_value"
                            name="Pessimistic"
                            stroke="#e74c3c"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorPessimistic)"
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="projection-table-section">
                  <h3>Yearly Breakdown</h3>
                  <div className="projection-table-scroll">
                    <table className="projection-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Age</th>
                          <th>Portfolio</th>
                          <th>Contributions</th>
                          <th>Returns</th>
                          <th>Withdrawals</th>
                          <th>Net Cash Flow</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentProjection.projections.map((p) => (
                          <tr
                            key={p.year}
                            className={p.portfolio_value >= fireNumber ? 'fire-reached' : p.portfolio_value <= 0 ? 'depleted' : ''}
                          >
                            <td>{p.year}</td>
                            <td>{p.age}</td>
                            <td className="amount">{formatCurrency(p.portfolio_value)}</td>
                            <td className="amount positive">+{formatCurrency(p.contributions)}</td>
                            <td className={`amount ${p.investment_returns >= 0 ? 'positive' : 'negative'}`}>
                              {p.investment_returns >= 0 ? '+' : ''}{formatCurrency(p.investment_returns)}
                            </td>
                            <td className="amount negative">-{formatCurrency(p.withdrawals)}</td>
                            <td className={`amount ${p.net_cash_flow >= 0 ? 'positive' : 'negative'}`}>
                              {p.net_cash_flow >= 0 ? '+' : ''}{formatCurrency(p.net_cash_flow)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="projections-empty-results">
                <div className="empty-icon">$</div>
                <h3>Generate Projections</h3>
                <p>
                  Select a retirement plan and click "Generate Projections" to see your long-term
                  portfolio projections under different scenarios.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
