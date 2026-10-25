import { useId, useMemo } from "react";

export interface Series {
  label: string;
  color: string;
  values: number[];
}

const W = 640;
const H = 160;

export function AreaChart({
  series,
  height = 160,
  unit = (value: number) => String(Math.round(value)),
  emptyLabel = "No data",
}: {
  series: Series[];
  height?: number;
  unit?: (value: number) => string;
  emptyLabel?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const max = useMemo(() => {
    const peak = Math.max(
      1,
      ...series.flatMap((item) => item.values.filter((value) => Number.isFinite(value))),
    );
    const magnitude = 10 ** Math.floor(Math.log10(peak));
    return Math.ceil(peak / magnitude) * magnitude;
  }, [series]);

  const hasData = series.some((item) => item.values.length >= 2);

  const line = (values: number[]) => {
    if (values.length < 2) return "";
    const step = W / (values.length - 1);
    return values
      .map((value, index) => {
        const x = index * step;
        const y = H - (Math.max(0, Math.min(max, value)) / max) * H;
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {series.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5 text-[11px] t-secondary">
              <span className="inline-block size-1.5 rounded-full" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
        {hasData && <span className="text-[11px] t-muted num">max {unit(max)}</span>}
      </div>

      {hasData ? (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height, width: "100%" }} aria-hidden="true">
          <defs>
            {series.map((item, index) => (
              <linearGradient key={item.label} id={`${uid}-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={item.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={item.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2={W}
              y1={H * ratio}
              y2={H * ratio}
              stroke="var(--outline-variant)"
              strokeOpacity="0.5"
              strokeWidth="1"
            />
          ))}

          {series.map((item, index) => {
            const d = line(item.values);
            if (!d) return null;
            return (
              <g key={item.label}>
                <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#${uid}-${index})`} />
                <path
                  d={d}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>
      ) : (
        <div
          className="flex items-center justify-center rounded-xl text-xs t-muted"
          style={{ height, background: "var(--surface-high)" }}
        >
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
