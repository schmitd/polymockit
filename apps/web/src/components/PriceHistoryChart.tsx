import type { PolymarketHistoryPoint } from "@polymockit/effect-services";

interface PriceHistoryChartProps {
  points: PolymarketHistoryPoint[];
}

export function PriceHistoryChart({ points }: PriceHistoryChartProps) {
  const width = 560;
  const height = 164;
  const padding = 10;
  const chartHeight = height - padding * 2;
  const toY = (price: number) => {
    const clamped = Math.min(Math.max(price, 0), 1);
    return height - padding - clamped * chartHeight;
  };
  const hasLine = points.length >= 2;
  const path = hasLine
    ? points
        .map((point, index) => {
          const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
          const y = toY(point.price);
          return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ")
    : "";

  return (
    <svg className="history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Outcome price history">
      <line x1={padding} y1={padding} x2={width - padding} y2={padding} className="history-guide" />
      <line
        x1={padding}
        y1={Math.round(height / 2)}
        x2={width - padding}
        y2={Math.round(height / 2)}
        className="history-guide"
      />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="history-guide" />
      {hasLine ? (
        <path d={path} fill="none" stroke="#2ad4b7" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      ) : (
        <text x={width / 2} y={height / 2} textAnchor="middle" className="history-empty-text">
          Not enough history points yet.
        </text>
      )}
    </svg>
  );
}
