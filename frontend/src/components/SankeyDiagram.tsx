import { useMemo } from 'react';
import {
  Sankey,
  Tooltip,
  Layer,
  Rectangle,
} from 'recharts';
import type { SankeyResult, SankeyNode, SankeyLink } from '../api/client';
import './SankeyDiagram.css';

interface SankeyDiagramProps {
  data: SankeyResult;
  width?: number;
  height?: number;
}

interface TooltipPayload {
  payload?: {
    name?: string;
    value?: number;
    source?: { name: string };
    target?: { name: string };
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (active && payload && payload.length > 0 && payload[0].payload) {
    const data = payload[0].payload;

    if (data.source && data.target) {
      return (
        <div className="sankey-tooltip">
          <div className="tooltip-flow">
            <span className="tooltip-source">{data.source.name}</span>
            <span className="tooltip-arrow">&rarr;</span>
            <span className="tooltip-target">{data.target.name}</span>
          </div>
          <div className="tooltip-value">{formatCurrency(data.value || 0)}</div>
        </div>
      );
    }

    return (
      <div className="sankey-tooltip">
        <div className="tooltip-name">{data.name}</div>
        <div className="tooltip-value">{formatCurrency(data.value || 0)}</div>
      </div>
    );
  }
  return null;
}

interface NodePayload {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  value: number;
  payload?: SankeyNode;
}

interface CustomNodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: NodePayload;
  containerWidth: number;
}

function CustomNode({ x, y, width, height, payload, containerWidth }: CustomNodeProps) {
  const nodeData = payload.payload;
  const nodeType = nodeData?.type || 'transfer';

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'income':
        return '#2ecc71';
      case 'expense':
        return '#e74c3c';
      case 'savings':
        return '#3498db';
      case 'transfer':
      default:
        return '#646cff';
    }
  };

  const formatCurrency = (amount: number) => {
    if (Math.abs(amount) >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`;
    }
    return `$${amount}`;
  };

  const isRightSide = x > containerWidth / 2;
  const labelX = isRightSide ? x - 8 : x + width + 8;
  const textAnchor = isRightSide ? 'end' : 'start';

  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={getNodeColor(nodeType)}
        fillOpacity={0.9}
        rx={2}
        ry={2}
      />
      <text
        x={labelX}
        y={y + height / 2}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        style={{
          fontSize: 11,
          fill: 'rgba(255, 255, 255, 0.87)',
          fontWeight: 500,
        }}
      >
        {payload.name}
      </text>
      <text
        x={labelX}
        y={y + height / 2 + 14}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        style={{
          fontSize: 10,
          fill: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        {formatCurrency(payload.value)}
      </text>
    </Layer>
  );
}

export function SankeyDiagram({ data, width = 800, height = 400 }: SankeyDiagramProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const chartData = useMemo(() => {
    const nodeMap = new Map<string, number>();
    const nodes: Array<{ name: string; id: string; type: string; value: number }> = [];

    data.nodes.forEach((node: SankeyNode, index: number) => {
      nodeMap.set(node.id, index);
      nodes.push({ name: node.name, id: node.id, type: node.type, value: node.value });
    });

    const links = data.links.map((link: SankeyLink) => ({
      source: nodeMap.get(link.source) ?? 0,
      target: nodeMap.get(link.target) ?? 0,
      value: link.value,
    }));

    return { nodes, links };
  }, [data]);

  const hasValidData = chartData.nodes.length > 0 && chartData.links.length > 0;

  return (
    <div className="sankey-diagram">
      <div className="sankey-summary">
        <div className="summary-item income">
          <span className="summary-label">Total Income</span>
          <span className="summary-value">{formatCurrency(data.total_income)}</span>
        </div>
        <div className="summary-item expenses">
          <span className="summary-label">Total Expenses</span>
          <span className="summary-value">{formatCurrency(data.total_expenses)}</span>
        </div>
        <div className={`summary-item net-flow ${data.net_cash_flow >= 0 ? 'positive' : 'negative'}`}>
          <span className="summary-label">Net Cash Flow</span>
          <span className="summary-value">
            {data.net_cash_flow >= 0 ? '+' : ''}{formatCurrency(data.net_cash_flow)}
          </span>
        </div>
      </div>

      {hasValidData ? (
        <div className="sankey-chart-container">
          <Sankey
            width={width}
            height={height}
            data={chartData}
            node={<CustomNode containerWidth={width} x={0} y={0} width={0} height={0} index={0} payload={{ x: 0, y: 0, width: 0, height: 0, name: '', value: 0 }} />}
            nodePadding={30}
            nodeWidth={12}
            linkCurvature={0.5}
            margin={{ top: 20, right: 120, bottom: 20, left: 120 }}
            link={{
              stroke: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <Tooltip content={<CustomTooltip />} />
          </Sankey>
        </div>
      ) : (
        <div className="sankey-empty">
          <p>No cash flow data available for this period.</p>
        </div>
      )}

      <div className="sankey-legend">
        <div className="legend-item">
          <span className="legend-color income" />
          <span className="legend-label">Income Sources</span>
        </div>
        <div className="legend-item">
          <span className="legend-color expense" />
          <span className="legend-label">Expenses</span>
        </div>
        <div className="legend-item">
          <span className="legend-color transfer" />
          <span className="legend-label">Transfers</span>
        </div>
        <div className="legend-item">
          <span className="legend-color savings" />
          <span className="legend-label">Savings</span>
        </div>
      </div>
    </div>
  );
}
