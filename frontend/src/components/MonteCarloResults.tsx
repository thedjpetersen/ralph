import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { type MonteCarloResult } from '../api/client';
import './MonteCarloResults.css';

interface MonteCarloResultsProps {
  result: MonteCarloResult;
  fireNumber: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string; name: string }[];
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
    return (
      <div className="montecarlo-tooltip">
        <div className="tooltip-header">Year {label}</div>
        <div className="tooltip-content">
          <div className="tooltip-row">
            <span className="tooltip-indicator" style={{ backgroundColor: '#e74c3c' }} />
            <span className="tooltip-label">10th Percentile</span>
            <span className="tooltip-value">{formatCurrency(payload.find(p => p.dataKey === 'percentile_10')?.value ?? 0)}</span>
          </div>
          <div className="tooltip-row main">
            <span className="tooltip-indicator" style={{ backgroundColor: '#646cff' }} />
            <span className="tooltip-label">Median</span>
            <span className="tooltip-value">{formatCurrency(payload.find(p => p.dataKey === 'median_balance')?.value ?? 0)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-indicator" style={{ backgroundColor: '#2ecc71' }} />
            <span className="tooltip-label">90th Percentile</span>
            <span className="tooltip-value">{formatCurrency(payload.find(p => p.dataKey === 'percentile_90')?.value ?? 0)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function MonteCarloResults({ result, fireNumber }: MonteCarloResultsProps) {
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

  const successRate = result.success_rate * 100;
  const successRateClass = successRate >= 90 ? 'excellent' : successRate >= 75 ? 'good' : successRate >= 50 ? 'fair' : 'poor';

  // Calculate the circumference for the success gauge
  const circumference = 2 * Math.PI * 45;
  const successOffset = circumference - (successRate / 100) * circumference;

  return (
    <div className="montecarlo-results">
      {/* Success Rate Gauge */}
      <div className="success-rate-section">
        <div className="success-gauge-container">
          <svg viewBox="0 0 100 100" className="success-gauge">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="10"
            />
            {/* Success arc */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={successRate >= 90 ? '#2ecc71' : successRate >= 75 ? '#f39c12' : '#e74c3c'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={successOffset}
              transform="rotate(-90 50 50)"
              className="success-arc"
            />
          </svg>
          <div className="success-gauge-center">
            <span className={`success-percentage ${successRateClass}`}>
              {successRate.toFixed(1)}%
            </span>
            <span className="success-label">Success Rate</span>
          </div>
        </div>

        <div className="success-interpretation">
          <h4 className={`interpretation-title ${successRateClass}`}>
            {successRate >= 90 ? 'Excellent' :
             successRate >= 75 ? 'Good' :
             successRate >= 50 ? 'Fair' : 'Needs Attention'}
          </h4>
          <p className="interpretation-text">
            {successRate >= 90
              ? 'Your retirement plan has a very high probability of success. Your portfolio is likely to last throughout retirement.'
              : successRate >= 75
              ? 'Your retirement plan has a good probability of success. Consider some adjustments to increase certainty.'
              : successRate >= 50
              ? 'Your retirement plan has moderate success probability. Consider increasing savings or reducing spending.'
              : 'Your retirement plan needs attention. Review your spending, savings rate, or retirement timeline.'}
          </p>
        </div>
      </div>

      {/* Simulation Stats */}
      <div className="simulation-stats">
        <div className="stat-card">
          <span className="stat-label">Simulations Run</span>
          <span className="stat-value">{result.simulations_run.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Years Simulated</span>
          <span className="stat-value">{result.years_simulated}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Median Ending Balance</span>
          <span className="stat-value median">{formatCurrency(result.median_ending_balance)}</span>
        </div>
      </div>

      {/* Percentile Distribution */}
      <div className="percentile-section">
        <h4>Ending Balance Distribution</h4>
        <div className="percentile-bars">
          <div className="percentile-item">
            <div className="percentile-header">
              <span className="percentile-label">10th Percentile (Worst 10%)</span>
              <span className="percentile-value pessimistic">{formatCurrency(result.percentile_10_balance)}</span>
            </div>
            <div className="percentile-bar-container">
              <div
                className="percentile-bar pessimistic"
                style={{ width: `${Math.min((result.percentile_10_balance / result.percentile_90_balance) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="percentile-item">
            <div className="percentile-header">
              <span className="percentile-label">25th Percentile</span>
              <span className="percentile-value">{formatCurrency(result.percentile_25_balance)}</span>
            </div>
            <div className="percentile-bar-container">
              <div
                className="percentile-bar"
                style={{ width: `${Math.min((result.percentile_25_balance / result.percentile_90_balance) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="percentile-item highlight">
            <div className="percentile-header">
              <span className="percentile-label">50th Percentile (Median)</span>
              <span className="percentile-value median">{formatCurrency(result.median_ending_balance)}</span>
            </div>
            <div className="percentile-bar-container">
              <div
                className="percentile-bar median"
                style={{ width: `${Math.min((result.median_ending_balance / result.percentile_90_balance) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="percentile-item">
            <div className="percentile-header">
              <span className="percentile-label">75th Percentile</span>
              <span className="percentile-value">{formatCurrency(result.percentile_75_balance)}</span>
            </div>
            <div className="percentile-bar-container">
              <div
                className="percentile-bar"
                style={{ width: `${Math.min((result.percentile_75_balance / result.percentile_90_balance) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="percentile-item">
            <div className="percentile-header">
              <span className="percentile-label">90th Percentile (Best 10%)</span>
              <span className="percentile-value optimistic">{formatCurrency(result.percentile_90_balance)}</span>
            </div>
            <div className="percentile-bar-container">
              <div className="percentile-bar optimistic" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Chart */}
      {result.scenarios && result.scenarios.length > 0 && (
        <div className="scenario-chart-section">
          <h4>Portfolio Trajectory Over Time</h4>
          <p className="chart-description">
            Showing range of possible outcomes (10th to 90th percentile)
          </p>
          <div className="scenario-chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={result.scenarios}
                margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#646cff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#646cff" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis
                  dataKey="year"
                  stroke="rgba(255, 255, 255, 0.5)"
                  tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
                  label={{ value: 'Year', position: 'insideBottom', offset: -5, fill: 'rgba(255, 255, 255, 0.5)' }}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  stroke="rgba(255, 255, 255, 0.5)"
                  tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* FIRE Number reference line */}
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
                {/* Range area (10th to 90th percentile) */}
                <Area
                  type="monotone"
                  dataKey="percentile_90"
                  stroke="none"
                  fillOpacity={1}
                  fill="url(#colorRange)"
                />
                <Area
                  type="monotone"
                  dataKey="percentile_10"
                  stroke="#e74c3c"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  fill="#1a1a1a"
                />
                {/* Median line */}
                <Area
                  type="monotone"
                  dataKey="median_balance"
                  stroke="#646cff"
                  strokeWidth={2}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-line median" />
              <span className="legend-label">Median Outcome</span>
            </div>
            <div className="legend-item">
              <span className="legend-area" />
              <span className="legend-label">10th-90th Percentile Range</span>
            </div>
            <div className="legend-item">
              <span className="legend-line fire" />
              <span className="legend-label">FIRE Number</span>
            </div>
          </div>
        </div>
      )}

      {/* Explanation */}
      <div className="montecarlo-explanation">
        <h4>About Monte Carlo Simulation</h4>
        <p>
          Monte Carlo simulation runs thousands of scenarios using random market returns
          based on historical data. The success rate shows what percentage of scenarios
          result in your portfolio lasting throughout retirement.
        </p>
        <p>
          A 90%+ success rate is generally considered very safe, while 75-90% is acceptable.
          Below 75%, you may want to consider adjusting your plan.
        </p>
      </div>
    </div>
  );
}
