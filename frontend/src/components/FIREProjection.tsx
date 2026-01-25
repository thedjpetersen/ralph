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
import { type YearlyProjection, type ProjectionSummary } from '../api/client';
import './FIREProjection.css';

interface FIREProjectionProps {
  projections: YearlyProjection[];
  summary: ProjectionSummary;
  fireNumber: number;
}

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
            <span className="tooltip-indicator" style={{ backgroundColor: '#2ecc71' }} />
            <span className="tooltip-label">Contributions</span>
            <span className="tooltip-value positive">+{formatCurrency(data.contributions)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-indicator" style={{ backgroundColor: '#3498db' }} />
            <span className="tooltip-label">Returns</span>
            <span className="tooltip-value positive">+{formatCurrency(data.investment_returns)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-indicator" style={{ backgroundColor: '#9b59b6' }} />
            <span className="tooltip-label">Income</span>
            <span className="tooltip-value positive">+{formatCurrency(data.income_sources)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-indicator" style={{ backgroundColor: '#e74c3c' }} />
            <span className="tooltip-label">Withdrawals</span>
            <span className="tooltip-value negative">-{formatCurrency(data.withdrawals)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-indicator" style={{ backgroundColor: '#f39c12' }} />
            <span className="tooltip-label">Expenses</span>
            <span className="tooltip-value negative">-{formatCurrency(data.expenses)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function FIREProjection({ projections, summary, fireNumber }: FIREProjectionProps) {
  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Find the year when FIRE is reached (portfolio >= fireNumber)
  const fireReachedYear = projections.find(p => p.portfolio_value >= fireNumber);

  // Prepare chart data with cumulative values
  const chartData = projections.map(p => ({
    ...p,
    contributions_area: p.cumulative_contributions,
    returns_area: p.portfolio_value - p.cumulative_contributions + p.cumulative_withdrawals,
  }));

  const maxPortfolio = Math.max(...projections.map(p => p.portfolio_value));
  const yAxisMax = Math.max(maxPortfolio, fireNumber) * 1.1;

  return (
    <div className="fire-projection">
      {/* Summary Cards */}
      <div className="projection-summary">
        <div className="projection-summary-card">
          <span className="summary-label">Starting Portfolio</span>
          <span className="summary-value">{formatCurrency(summary.starting_portfolio)}</span>
        </div>
        <div className="projection-summary-card">
          <span className="summary-label">Ending Portfolio</span>
          <span className="summary-value ending">{formatCurrency(summary.ending_portfolio)}</span>
        </div>
        <div className="projection-summary-card">
          <span className="summary-label">Total Contributions</span>
          <span className="summary-value contributions">{formatCurrency(summary.total_contributions)}</span>
        </div>
        <div className="projection-summary-card">
          <span className="summary-label">Total Returns</span>
          <span className="summary-value returns">{formatCurrency(summary.total_investment_returns)}</span>
        </div>
        <div className={`projection-summary-card ${summary.portfolio_survives ? 'success' : 'warning'}`}>
          <span className="summary-label">Portfolio Survives</span>
          <span className="summary-value">{summary.portfolio_survives ? 'Yes' : 'No'}</span>
          {!summary.portfolio_survives && summary.depletion_age && (
            <span className="summary-detail">Depletes at age {summary.depletion_age}</span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="projection-chart-container">
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#646cff" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#646cff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorContributions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2ecc71" stopOpacity={0} />
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
              domain={[0, yAxisMax]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              formatter={(value) => (
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {value === 'portfolio_value' ? 'Portfolio Value' :
                   value === 'cumulative_contributions' ? 'Contributions' : value}
                </span>
              )}
            />
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
            {/* FIRE reached marker */}
            {fireReachedYear && (
              <ReferenceLine
                x={fireReachedYear.year}
                stroke="#2ecc71"
                strokeDasharray="3 3"
                label={{
                  value: `FIRE Reached (Age ${fireReachedYear.age})`,
                  position: 'top',
                  fill: '#2ecc71',
                  fontSize: 10,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="cumulative_contributions"
              name="cumulative_contributions"
              stroke="#2ecc71"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorContributions)"
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="portfolio_value"
              name="portfolio_value"
              stroke="#646cff"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPortfolio)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Projection Table */}
      <div className="projection-table-container">
        <h4>Yearly Breakdown</h4>
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
                <th>Net Flow</th>
              </tr>
            </thead>
            <tbody>
              {projections.slice(0, 10).map((p) => (
                <tr key={p.year} className={p.portfolio_value >= fireNumber ? 'fire-reached' : ''}>
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
        {projections.length > 10 && (
          <span className="table-hint">Showing first 10 years of {projections.length} total</span>
        )}
      </div>
    </div>
  );
}
