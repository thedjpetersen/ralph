import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import './NetWorthChart.css';

interface NetWorthDataPoint {
  date: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

interface NetWorthChartProps {
  data: NetWorthDataPoint[];
  currency?: string;
  isLoading?: boolean;
  title?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
  formatAmount: (amount: number) => string;
}

function CustomTooltip({ active, payload, label, formatAmount }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="networth-tooltip">
        <div className="tooltip-date">{label}</div>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="tooltip-row">
            <span
              className="tooltip-indicator"
              style={{ backgroundColor: entry.color }}
            />
            <span className="tooltip-label">
              {entry.dataKey === 'netWorth' ? 'Net Worth' :
               entry.dataKey === 'assets' ? 'Assets' : 'Liabilities'}
            </span>
            <span className="tooltip-value">{formatAmount(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function NetWorthChart({
  data,
  currency = 'USD',
  isLoading,
  title = 'Net Worth Trend',
}: NetWorthChartProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      notation: 'compact',
      maximumFractionDigits: 1,
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

  const formatXAxis = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const currentNetWorth = data.length > 0 ? data[data.length - 1].netWorth : 0;
  const previousNetWorth = data.length > 1 ? data[0].netWorth : currentNetWorth;
  const netWorthChange = currentNetWorth - previousNetWorth;
  const netWorthChangePercent = previousNetWorth !== 0
    ? ((netWorthChange / Math.abs(previousNetWorth)) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="networth-chart">
        <div className="networth-chart-header">
          <div>
            <h3>{title}</h3>
            <div className="skeleton-value" />
          </div>
        </div>
        <div className="networth-chart-container">
          <div className="skeleton-chart" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="networth-chart networth-chart-empty">
        <div className="networth-chart-header">
          <h3>{title}</h3>
        </div>
        <div className="networth-chart-empty-content">
          <span className="empty-icon">~</span>
          <p>No data available</p>
          <span className="empty-hint">Connect accounts to track your net worth</span>
        </div>
      </div>
    );
  }

  return (
    <div className="networth-chart">
      <div className="networth-chart-header">
        <div>
          <h3>{title}</h3>
          <div className="networth-summary">
            <span className="current-networth">
              {formatAmount(currentNetWorth)}
            </span>
            <span className={`networth-change ${netWorthChange >= 0 ? 'positive' : 'negative'}`}>
              {netWorthChange >= 0 ? '+' : ''}{formatAmount(netWorthChange)}
              <span className="change-percent">
                ({netWorthChange >= 0 ? '+' : ''}{netWorthChangePercent.toFixed(1)}%)
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="networth-chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2ecc71" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e74c3c" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#e74c3c" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#646cff" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#646cff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              stroke="rgba(255, 255, 255, 0.5)"
              tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              stroke="rgba(255, 255, 255, 0.5)"
              tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
              width={60}
            />
            <Tooltip content={<CustomTooltip formatAmount={formatAmount} />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              formatter={(value) => (
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {value === 'netWorth' ? 'Net Worth' :
                   value === 'assets' ? 'Assets' : 'Liabilities'}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="assets"
              stroke="#2ecc71"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAssets)"
            />
            <Area
              type="monotone"
              dataKey="liabilities"
              stroke="#e74c3c"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorLiabilities)"
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#646cff"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorNetWorth)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
