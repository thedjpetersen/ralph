import { useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  retirementBacktestApi,
  type BacktestScenario,
  type CompareStrategiesResult,
  type StrategyComparison as StrategyComparisonType,
  type AssetAllocation,
} from '../api/client';
import { toast } from '../stores/toast';
import './ScenarioComparison.css';

interface ScenarioComparisonProps {
  accountId: string;
  planId: string;
  scenarios: BacktestScenario[];
}

interface StrategyInput {
  name: string;
  withdrawalRate: number;
  stocks: number;
  bonds: number;
  cash: number;
  rebalancing: 'monthly' | 'quarterly' | 'annual' | 'never';
}

const DEFAULT_STRATEGIES: StrategyInput[] = [
  { name: 'Conservative', withdrawalRate: 3.5, stocks: 40, bonds: 50, cash: 10, rebalancing: 'annual' },
  { name: 'Balanced', withdrawalRate: 4, stocks: 60, bonds: 35, cash: 5, rebalancing: 'annual' },
  { name: 'Aggressive', withdrawalRate: 4.5, stocks: 80, bonds: 15, cash: 5, rebalancing: 'annual' },
];

export function ScenarioComparison({ accountId, planId, scenarios }: ScenarioComparisonProps) {
  const [strategies, setStrategies] = useState<StrategyInput[]>(DEFAULT_STRATEGIES);
  const [startYear, setStartYear] = useState<number | undefined>(undefined);
  const [endYear, setEndYear] = useState<number | undefined>(undefined);
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState<CompareStrategiesResult | null>(null);

  const handleStrategyChange = (index: number, field: keyof StrategyInput, value: string | number) => {
    setStrategies(prev => prev.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    ));
  };

  const addStrategy = () => {
    if (strategies.length < 5) {
      setStrategies(prev => [
        ...prev,
        { name: `Strategy ${prev.length + 1}`, withdrawalRate: 4, stocks: 60, bonds: 35, cash: 5, rebalancing: 'annual' },
      ]);
    }
  };

  const removeStrategy = (index: number) => {
    if (strategies.length > 2) {
      setStrategies(prev => prev.filter((_, i) => i !== index));
    }
  };

  const compareStrategies = useCallback(async () => {
    if (!accountId || !planId) return;

    setIsComparing(true);
    setResult(null);

    try {
      const strategyInputs = strategies.map(s => ({
        name: s.name,
        withdrawal_rate: s.withdrawalRate / 100,
        asset_allocation: {
          stocks: s.stocks / 100,
          bonds: s.bonds / 100,
          cash: s.cash / 100,
        } as AssetAllocation,
        rebalancing_frequency: s.rebalancing,
      }));

      const comparisonResult = await retirementBacktestApi.compareStrategies(accountId, {
        plan_id: planId,
        strategies: strategyInputs,
        start_year: startYear,
        end_year: endYear,
      });
      setResult(comparisonResult);
      toast.success('Strategy comparison completed');
    } catch {
      toast.error('Failed to compare strategies');
    } finally {
      setIsComparing(false);
    }
  }, [accountId, planId, strategies, startYear, endYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const getBarChartData = () => {
    if (!result) return [];
    return result.strategies.map(s => ({
      name: s.name,
      successRate: s.success_rate * 100,
      avgEnding: s.average_ending_balance,
      maxDrawdown: Math.abs(s.max_drawdown * 100),
    }));
  };

  const getRadarData = () => {
    if (!result) return [];

    const maxSuccessRate = Math.max(...result.strategies.map(s => s.success_rate));
    const maxEndingBalance = Math.max(...result.strategies.map(s => s.average_ending_balance));
    const maxRiskAdjusted = Math.max(...result.strategies.map(s => s.risk_adjusted_return));
    const minDrawdown = Math.min(...result.strategies.map(s => Math.abs(s.max_drawdown)));

    return [
      { metric: 'Success Rate', ...Object.fromEntries(result.strategies.map(s => [s.name, (s.success_rate / maxSuccessRate) * 100])) },
      { metric: 'Ending Balance', ...Object.fromEntries(result.strategies.map(s => [s.name, (s.average_ending_balance / maxEndingBalance) * 100])) },
      { metric: 'Risk-Adjusted', ...Object.fromEntries(result.strategies.map(s => [s.name, (s.risk_adjusted_return / maxRiskAdjusted) * 100])) },
      { metric: 'Low Drawdown', ...Object.fromEntries(result.strategies.map(s => [s.name, (minDrawdown / Math.abs(s.max_drawdown)) * 100])) },
    ];
  };

  const COLORS = ['#646cff', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6'];

  return (
    <div className="scenario-comparison">
      <div className="comparison-header">
        <h3>Strategy Comparison</h3>
        <p className="comparison-description">
          Compare different withdrawal strategies and asset allocations to find the best approach for your retirement.
        </p>
      </div>

      <div className="comparison-setup">
        <div className="strategies-editor">
          <div className="strategies-header">
            <h4>Strategies to Compare</h4>
            {strategies.length < 5 && (
              <button onClick={addStrategy} className="add-strategy-button">
                + Add Strategy
              </button>
            )}
          </div>

          <div className="strategies-grid">
            {strategies.map((strategy, index) => (
              <div key={index} className="strategy-card">
                <div className="strategy-card-header">
                  <input
                    type="text"
                    value={strategy.name}
                    onChange={(e) => handleStrategyChange(index, 'name', e.target.value)}
                    className="strategy-name-input"
                    placeholder="Strategy name"
                  />
                  {strategies.length > 2 && (
                    <button
                      onClick={() => removeStrategy(index)}
                      className="remove-strategy-button"
                      title="Remove strategy"
                    >
                      &times;
                    </button>
                  )}
                </div>
                <div className="strategy-fields">
                  <div className="strategy-field">
                    <label>Withdrawal Rate</label>
                    <div className="input-with-suffix compact">
                      <input
                        type="number"
                        value={strategy.withdrawalRate}
                        onChange={(e) => handleStrategyChange(index, 'withdrawalRate', Number(e.target.value))}
                        min={1}
                        max={10}
                        step={0.1}
                        className="form-input"
                      />
                      <span className="input-suffix">%</span>
                    </div>
                  </div>
                  <div className="allocation-fields">
                    <div className="strategy-field">
                      <label>Stocks</label>
                      <div className="input-with-suffix compact">
                        <input
                          type="number"
                          value={strategy.stocks}
                          onChange={(e) => handleStrategyChange(index, 'stocks', Number(e.target.value))}
                          min={0}
                          max={100}
                          className="form-input"
                        />
                        <span className="input-suffix">%</span>
                      </div>
                    </div>
                    <div className="strategy-field">
                      <label>Bonds</label>
                      <div className="input-with-suffix compact">
                        <input
                          type="number"
                          value={strategy.bonds}
                          onChange={(e) => handleStrategyChange(index, 'bonds', Number(e.target.value))}
                          min={0}
                          max={100}
                          className="form-input"
                        />
                        <span className="input-suffix">%</span>
                      </div>
                    </div>
                    <div className="strategy-field">
                      <label>Cash</label>
                      <div className="input-with-suffix compact">
                        <input
                          type="number"
                          value={strategy.cash}
                          onChange={(e) => handleStrategyChange(index, 'cash', Number(e.target.value))}
                          min={0}
                          max={100}
                          className="form-input"
                        />
                        <span className="input-suffix">%</span>
                      </div>
                    </div>
                  </div>
                  <div className="strategy-field">
                    <label>Rebalancing</label>
                    <select
                      value={strategy.rebalancing}
                      onChange={(e) => handleStrategyChange(index, 'rebalancing', e.target.value)}
                      className="form-select compact"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="period-selector">
          <h4>Test Period (Optional)</h4>
          <div className="period-inputs">
            <div className="form-group">
              <label>Start Year</label>
              <input
                type="number"
                value={startYear || ''}
                onChange={(e) => setStartYear(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Auto"
                min={1928}
                max={2023}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>End Year</label>
              <input
                type="number"
                value={endYear || ''}
                onChange={(e) => setEndYear(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Auto"
                min={1928}
                max={2023}
                className="form-input"
              />
            </div>
          </div>
          {scenarios.length > 0 && (
            <div className="scenario-buttons">
              {scenarios.slice(0, 4).map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => {
                    setStartYear(scenario.start_year);
                    setEndYear(scenario.end_year);
                  }}
                  className="scenario-button"
                  title={scenario.description}
                >
                  {scenario.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={compareStrategies}
          disabled={isComparing || strategies.length < 2}
          className="compare-button"
        >
          {isComparing ? 'Comparing...' : 'Compare Strategies'}
        </button>
      </div>

      {result && (
        <div className="comparison-results">
          <div className="best-strategy-banner">
            <span className="best-label">Best Strategy:</span>
            <span className="best-name">{result.best_strategy}</span>
            <span className="test-period">Tested: {result.period_tested}</span>
          </div>

          <div className="comparison-charts">
            <div className="chart-section">
              <h4>Success Rate Comparison</h4>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={getBarChartData()} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.5)" tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${v}%`} stroke="rgba(255, 255, 255, 0.5)" tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => [`${(value as number).toFixed(1)}%`, 'Success Rate']}
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #444', borderRadius: '8px' }}
                    />
                    <Bar dataKey="successRate" fill="#646cff" name="Success Rate" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-section">
              <h4>Multi-Factor Analysis</h4>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={getRadarData()} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                    <PolarGrid stroke="rgba(255, 255, 255, 0.2)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 11 }} />
                    <PolarRadiusAxis tick={false} axisLine={false} />
                    {result.strategies.map((strategy, index) => (
                      <Radar
                        key={strategy.name}
                        name={strategy.name}
                        dataKey={strategy.name}
                        stroke={COLORS[index % COLORS.length]}
                        fill={COLORS[index % COLORS.length]}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="comparison-table-section">
            <h4>Detailed Comparison</h4>
            <div className="comparison-table-scroll">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Strategy</th>
                    <th>Success Rate</th>
                    <th>Avg Ending Balance</th>
                    <th>Best Case</th>
                    <th>Worst Case</th>
                    <th>Max Drawdown</th>
                    <th>Risk-Adjusted Return</th>
                  </tr>
                </thead>
                <tbody>
                  {result.strategies.map((strategy: StrategyComparisonType) => (
                    <tr key={strategy.name} className={strategy.name === result.best_strategy ? 'best-row' : ''}>
                      <td className="strategy-name">
                        {strategy.name}
                        {strategy.name === result.best_strategy && <span className="best-badge">Best</span>}
                      </td>
                      <td className={`amount ${strategy.success_rate >= 0.9 ? 'success' : strategy.success_rate >= 0.75 ? 'warning' : 'danger'}`}>
                        {(strategy.success_rate * 100).toFixed(1)}%
                      </td>
                      <td className="amount">{formatCurrency(strategy.average_ending_balance)}</td>
                      <td className="amount positive">{formatCurrency(strategy.best_case_balance)}</td>
                      <td className="amount negative">{formatCurrency(strategy.worst_case_balance)}</td>
                      <td className="amount negative">{(strategy.max_drawdown * 100).toFixed(1)}%</td>
                      <td className="amount">{(strategy.risk_adjusted_return * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
