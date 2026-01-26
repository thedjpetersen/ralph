import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import './BudgetTrend.css';

interface TrendDataPoint {
  date: string;
  spent: number;
  budget?: number;
  label?: string;
}

interface BudgetTrendProps {
  data: TrendDataPoint[];
  currency?: string;
  isLoading?: boolean;
  title?: string;
  showBudgetLine?: boolean;
  budgetAmount?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
  formatDate: (dateStr: string) => string;
  formatFullAmount: (amount: number) => string;
  budgetAmount?: number;
}

function CustomTooltip({ active, payload, label, formatDate, formatFullAmount, budgetAmount }: CustomTooltipProps) {
  if (active && payload && payload.length && label) {
    const spent = payload.find(p => p.dataKey === 'spent')?.value || 0;
    return (
      <div className="trend-tooltip">
        <div className="tooltip-date">{formatDate(label)}</div>
        <div className="tooltip-spent">
          <span className="tooltip-label">Spent</span>
          <span className="tooltip-value">{formatFullAmount(spent)}</span>
        </div>
        {budgetAmount && (
          <div className="tooltip-budget">
            <span className="tooltip-label">Budget</span>
            <span className="tooltip-value">{formatFullAmount(budgetAmount)}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export function BudgetTrend({
  data,
  currency = 'USD',
  isLoading,
  title = 'Spending Trend',
  showBudgetLine = true,
  budgetAmount,
}: BudgetTrendProps) {
  const formatAmount = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatFullAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="budget-trend">
        <div className="trend-header">
          <h3>{title}</h3>
        </div>
        <div className="trend-content">
          <div className="skeleton-chart-line" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="budget-trend budget-trend-empty">
        <div className="trend-header">
          <h3>{title}</h3>
        </div>
        <div className="trend-empty-content">
          <span className="empty-icon">~</span>
          <p>No trend data available</p>
        </div>
      </div>
    );
  }

  const maxSpent = Math.max(...data.map(d => d.spent));
  const yAxisMax = budgetAmount && showBudgetLine
    ? Math.max(maxSpent, budgetAmount) * 1.1
    : maxSpent * 1.1;

  // Generate accessible description for screen readers
  const latestSpent = data.length > 0 ? data[data.length - 1].spent : 0;
  const earliestSpent = data.length > 0 ? data[0].spent : 0;
  const spentChange = latestSpent - earliestSpent;
  const trendDirection = spentChange > 0 ? 'increased' : spentChange < 0 ? 'decreased' : 'remained stable';

  const chartDescription = `Spending trend from ${data.length > 0 ? formatDate(data[0].date) : ''} to ${data.length > 0 ? formatDate(data[data.length - 1].date) : ''}. Spending has ${trendDirection} from ${formatFullAmount(earliestSpent)} to ${formatFullAmount(latestSpent)}.${budgetAmount ? ` Budget limit: ${formatFullAmount(budgetAmount)}.` : ''}`;

  return (
    <div className="budget-trend">
      <div className="trend-header">
        <h3 id="trend-chart-title">{title}</h3>
        {data.length > 0 && (
          <div className="trend-legend" aria-hidden="true">
            <div className="legend-item">
              <span className="legend-line spending" />
              <span className="legend-label">Spending</span>
            </div>
            {showBudgetLine && budgetAmount && (
              <div className="legend-item">
                <span className="legend-line budget" />
                <span className="legend-label">Budget</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div
        className="trend-content"
        role="img"
        aria-labelledby="trend-chart-title"
        aria-describedby="trend-chart-desc"
      >
        {/* Screen reader accessible description */}
        <span id="trend-chart-desc" className="sr-only">
          {chartDescription}
        </span>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            aria-hidden="true"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.1)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="rgba(255, 255, 255, 0.5)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatAmount}
              stroke="rgba(255, 255, 255, 0.5)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={60}
              domain={[0, yAxisMax]}
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatDate={formatDate}
                  formatFullAmount={formatFullAmount}
                  budgetAmount={budgetAmount}
                />
              }
            />
            {showBudgetLine && budgetAmount && (
              <ReferenceLine
                y={budgetAmount}
                stroke="#f1c40f"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            )}
            <Line
              type="monotone"
              dataKey="spent"
              stroke="#646cff"
              strokeWidth={2}
              dot={{ fill: '#646cff', strokeWidth: 0, r: 4 }}
              activeDot={{ fill: '#646cff', strokeWidth: 2, stroke: '#fff', r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
