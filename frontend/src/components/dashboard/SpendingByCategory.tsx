import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import './SpendingByCategory.css';

interface CategorySpending {
  category_id: string;
  category_name: string;
  amount: number;
  percentage: number;
  color?: string;
}

interface SpendingByCategoryProps {
  data: CategorySpending[];
  currency?: string;
  isLoading?: boolean;
  title?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: CategorySpending & { color: string } }[];
  formatAmount: (amount: number) => string;
}

const DEFAULT_COLORS = [
  '#646cff',
  '#2ecc71',
  '#f1c40f',
  '#e74c3c',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#3498db',
  '#95a5a6',
  '#34495e',
];

function CustomTooltip({ active, payload, formatAmount }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="spending-tooltip">
        <div className="tooltip-category">{item.category_name}</div>
        <div className="tooltip-amount">{formatAmount(item.amount)}</div>
        <div className="tooltip-percentage">{item.percentage.toFixed(1)}%</div>
      </div>
    );
  }
  return null;
}

export function SpendingByCategory({
  data,
  currency = 'USD',
  isLoading,
  title = 'Spending by Category',
}: SpendingByCategoryProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));

  const totalSpent = data.reduce((sum, item) => sum + item.amount, 0);

  if (isLoading) {
    return (
      <div className="spending-by-category">
        <div className="spending-header">
          <h3>{title}</h3>
        </div>
        <div className="spending-content">
          <div className="chart-container">
            <div className="skeleton-chart" />
          </div>
          <div className="category-list">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-category" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="spending-by-category spending-empty">
        <div className="spending-header">
          <h3>{title}</h3>
        </div>
        <div className="spending-empty-content">
          <span className="empty-icon">%</span>
          <p>No spending data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="spending-by-category">
      <div className="spending-header">
        <h3>{title}</h3>
        <span className="total-spent">{formatAmount(totalSpent)}</span>
      </div>
      <div className="spending-content">
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="amount"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip formatAmount={formatAmount} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="category-list">
          {chartData.slice(0, 6).map((item) => (
            <div key={item.category_id} className="category-item">
              <div className="category-info">
                <span
                  className="category-color"
                  style={{ backgroundColor: item.color }}
                />
                <span className="category-name">{item.category_name}</span>
              </div>
              <div className="category-values">
                <span className="category-amount">{formatAmount(item.amount)}</span>
                <span className="category-percentage">{item.percentage.toFixed(0)}%</span>
              </div>
            </div>
          ))}
          {data.length > 6 && (
            <div className="category-more">
              +{data.length - 6} more categories
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
