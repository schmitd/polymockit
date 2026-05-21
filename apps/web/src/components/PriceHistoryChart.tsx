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
    <svg className="h-full w-full rounded-[var(--radius-md)] bg-[var(--surface)]" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Outcome price history">
      <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--line)" />
      <line
        x1={padding}
        y1={Math.round(height / 2)}
        x2={width - padding}
        y2={Math.round(height / 2)}
        stroke="var(--line)"
      />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--line)" />
      {hasLine ? (
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      ) : (
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="var(--muted)">
          Not enough history points yet.
        </text>
      )}
    </svg>
  );
}
