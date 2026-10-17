import { z } from "zod";

/**
 * ```chart 代码块：在服务端渲染成 SVG，样式参照 OpenAI 评测图
 */

const pointSchema = z.union([
  z.tuple([z.number(), z.number()]),
  z.tuple([z.number(), z.number(), z.string()]),
]);

const seriesSchema = z.object({
  name: z.string(),
  values: z.array(z.number()).optional(),
  points: z.array(pointSchema).optional(),
});

export const chartSpecSchema = z.object({
  type: z.enum(["bar", "line"]).default("bar"),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  caption: z.string().optional(),
  unit: z.string().default(""),
  yLabel: z.string().optional(),
  xLabel: z.string().optional(),
  yMin: z.number().optional(),
  yMax: z.number().optional(),
  labels: z.array(z.string()).default([]),
  highlight: z.array(z.string()).optional(),
  /** 柱状图是否在柱顶标数值；缺省时放得下才标 */
  showValues: z.boolean().optional(),
  series: z.array(seriesSchema).min(1),
});

export type ChartSpec = z.infer<typeof chartSpecSchema>;

// 颜色只引用 globals.css 里的变量，SVG 随亮暗主题切换；用 style 而不是属性，属性里的 var() 不可靠
const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
const STROKE = "var(--chart-stroke)";

const WIDTH = 676;
const HEIGHT = 340;

function niceStep(range: number, count: number): number {
  const raw = range / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function scaleDomain(values: number[], min?: number, max?: number) {
  const dataMax = Math.max(...values, 0);
  const dataMin = Math.min(...values, 0);
  const step = niceStep((max ?? dataMax) - (min ?? dataMin) || 1, 5);
  const lo = min ?? Math.floor(dataMin / step) * step;
  const hi = max ?? Math.ceil(dataMax / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 1000; v += step) {
    ticks.push(Number(v.toFixed(6)));
  }
  return { lo, hi: hi === lo ? lo + 1 : hi, ticks };
}

/** 小数位随量级变化：<1 最多 3 位，<10 最多 2 位，其余 1 位，去掉末尾的 0 */
export function formatValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const abs = Math.abs(value);
  const digits = abs < 1 ? 3 : abs < 10 ? 2 : 1;
  return String(Number(value.toFixed(digits)));
}

const PREFIX_UNITS = new Set(["$", "¥", "￥", "€", "£"]);

/** 货币符号放在数字前（$0.5），其他单位放在后面（74.9%） */
export function withUnit(value: number, unit: string): string {
  const text = formatValue(value);
  if (!unit) return text;
  return PREFIX_UNITS.has(unit) ? `${value < 0 ? "-" : ""}${unit}${formatValue(Math.abs(value))}` : `${text}${unit}`;
}

/** 12px Inter 下数值标签的估算宽度 */
function labelWidth(text: string): number {
  return text.length * 7;
}

/** 左边距放得下最长的刻度（等宽 12px，按带单位的写法算），有 yLabel 时再留出竖排标题 */
function leftMargin(ticks: number[], unit: string, yLabel?: string): number {
  const longest = Math.max(...ticks.map((tick) => withUnit(tick, unit).length), 0);
  return Math.max(44, longest * 7.4 + 12) + (yLabel ? 20 : 0);
}

function Legend({ spec }: { spec: ChartSpec }) {
  if (spec.series.length < 2) return null;

  return (
    <ul className="md-chart__legend">
      {spec.series.map((series, i) => (
        <li key={series.name}>
          <span
            className="md-chart__swatch"
            style={{ background: PALETTE[i % PALETTE.length] }}
          />
          {series.name}
        </li>
      ))}
    </ul>
  );
}

function BarChart({ spec }: { spec: ChartSpec }) {
  const labels = spec.labels;
  const seriesCount = spec.series.length;
  const values = spec.series.flatMap((series) => series.values ?? []);
  const { lo, hi, ticks } = scaleDomain(values, spec.yMin, spec.yMax);

  const groupCount = Math.max(labels.length, 1);
  const left = leftMargin(ticks, spec.unit, spec.yLabel);
  const right = 8;
  const plotWidth = WIDTH - left - right;
  const groupWidth = plotWidth / groupCount;
  const longest = Math.max(...labels.map((label) => label.length), 0);
  const rotate = longest * 7.2 > groupWidth - 8;
  const bottom = rotate ? Math.min(96, 24 + longest * 5.2) : 36;
  const top = 24;
  const plotHeight = HEIGHT - top - bottom;
  const barWidth = Math.min(56, (groupWidth * 0.72) / seriesCount);
  const y = (v: number) => top + plotHeight - ((v - lo) / (hi - lo)) * plotHeight;
  const highlight = spec.highlight ? new Set(spec.highlight) : null;

  // 相邻标签的间距：同组相邻柱子是 barWidth，单系列时是整组宽度；放不下就整张图都不标，
  // 改由刻度带上单位
  const labelSpacing = seriesCount > 1 ? barWidth : groupWidth;
  const valueLabels = spec.series.flatMap((series) =>
    (series.values ?? []).map((value) => withUnit(value, spec.unit))
  );
  const showValues =
    spec.showValues ?? valueLabels.every((text) => labelWidth(text) <= labelSpacing - 4);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="md-chart__svg"
      role="img"
      aria-label={spec.title ?? "Bar chart"}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={left}
            x2={WIDTH - right}
            y1={y(tick)}
            y2={y(tick)}
            className={tick === lo ? "md-chart__axis" : "md-chart__grid"}
          />
          <text x={left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="md-chart__tick">
            {showValues ? formatValue(tick) : withUnit(tick, spec.unit)}
          </text>
        </g>
      ))}
      {spec.yLabel && (
        <text
          transform={`translate(14 ${top + plotHeight / 2}) rotate(-90)`}
          textAnchor="middle"
          className="md-chart__label"
        >
          {spec.yLabel}
        </text>
      )}
      {labels.map((label, g) => {
        const groupX = left + g * groupWidth + (groupWidth - barWidth * seriesCount) / 2;
        const centerX = left + g * groupWidth + groupWidth / 2;
        const filled = !highlight || highlight.has(label);

        return (
          <g key={label}>
            {spec.series.map((series, s) => {
              const value = series.values?.[g];
              if (value === undefined) return null;
              const x = groupX + s * barWidth;
              const barTop = y(Math.max(value, lo));
              return (
                <g key={series.name}>
                  <rect
                    x={x + 1}
                    y={barTop}
                    width={barWidth - 2}
                    height={Math.max(y(lo) - barTop, 0)}
                    style={{
                      fill: filled ? PALETTE[s % PALETTE.length] : "var(--bg)",
                      stroke: STROKE,
                    }}
                    strokeWidth={1}
                  />
                  {showValues && (
                    <text
                      x={x + barWidth / 2}
                      y={barTop - 6}
                      textAnchor="middle"
                      className="md-chart__value"
                    >
                      {withUnit(value, spec.unit)}
                    </text>
                  )}
                </g>
              );
            })}
            {rotate ? (
              <text
                transform={`translate(${centerX + 4} ${y(lo) + 12}) rotate(-40)`}
                textAnchor="end"
                className="md-chart__label"
              >
                {label}
              </text>
            ) : (
              <text x={centerX} y={y(lo) + 22} textAnchor="middle" className="md-chart__label">
                {label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ spec }: { spec: ChartSpec }) {
  const points = spec.series.flatMap((series) => series.points ?? []);
  const yDomain = scaleDomain(
    points.map((point) => point[1]),
    spec.yMin,
    spec.yMax
  );
  const xValues = points.map((point) => point[0]);
  const xDomain = scaleDomain(xValues, Math.min(...xValues, 0));

  const left = leftMargin(yDomain.ticks, spec.unit, spec.yLabel);
  const right = 24;
  const top = 20;
  const bottom = spec.xLabel ? 52 : 32;
  const plotWidth = WIDTH - left - right;
  const plotHeight = HEIGHT - top - bottom;
  const x = (v: number) =>
    left + ((v - xDomain.lo) / (xDomain.hi - xDomain.lo)) * plotWidth;
  const y = (v: number) =>
    top + plotHeight - ((v - yDomain.lo) / (yDomain.hi - yDomain.lo)) * plotHeight;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="md-chart__svg"
      role="img"
      aria-label={spec.title ?? "Line chart"}
    >
      {yDomain.ticks.map((tick) => (
        <g key={`y${tick}`}>
          <line
            x1={left}
            x2={WIDTH - right}
            y1={y(tick)}
            y2={y(tick)}
            className={tick === yDomain.lo ? "md-chart__axis" : "md-chart__grid"}
          />
          <text x={left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="md-chart__tick">
            {withUnit(tick, spec.unit)}
          </text>
        </g>
      ))}
      {xDomain.ticks.map((tick) => (
        <text
          key={`x${tick}`}
          x={x(tick)}
          y={top + plotHeight + 20}
          textAnchor="middle"
          className="md-chart__tick"
        >
          {formatValue(tick)}
        </text>
      ))}
      {spec.yLabel && (
        <text
          transform={`translate(14 ${top + plotHeight / 2}) rotate(-90)`}
          textAnchor="middle"
          className="md-chart__label"
        >
          {spec.yLabel}
        </text>
      )}
      {spec.xLabel && (
        <text
          x={left + plotWidth / 2}
          y={HEIGHT - 8}
          textAnchor="middle"
          className="md-chart__label"
        >
          {spec.xLabel}
        </text>
      )}
      {spec.series.map((series, s) => {
        const color = PALETTE[s % PALETTE.length];
        const seriesPoints = [...(series.points ?? [])].sort((a, b) => a[0] - b[0]);
        return (
          <g key={series.name}>
            <polyline
              points={seriesPoints.map((p) => `${x(p[0])},${y(p[1])}`).join(" ")}
              fill="none"
              style={{ stroke: color }}
              strokeWidth={1.5}
            />
            {seriesPoints.map((p) => (
              <g key={`${p[0]}-${p[1]}`}>
                <circle
                  cx={x(p[0])}
                  cy={y(p[1])}
                  r={4}
                  style={{ fill: "var(--bg)", stroke: color }}
                  strokeWidth={1.5}
                />
                {p[2] && (
                  <text x={x(p[0]) - 8} y={y(p[1]) - 8} textAnchor="end" className="md-chart__value">
                    {p[2]}
                  </text>
                )}
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export default function Chart({ source }: { source: string }) {
  let spec: ChartSpec;
  try {
    spec = chartSpecSchema.parse(JSON.parse(source));
  } catch (error) {
    const reason =
      error instanceof z.ZodError
        ? error.issues.map((issue) => `${issue.path.join(".") || "spec"}: ${issue.message}`).join("\n")
        : error instanceof Error
          ? error.message
          : String(error);
    return <pre className="md-block-error">{`Chart spec invalid\n${reason}\n\n${source}`}</pre>;
  }

  return (
    <figure className="md-chart">
      {(spec.title || spec.subtitle) && (
        <div className="md-chart__head">
          {spec.title && <p className="md-chart__title">{spec.title}</p>}
          {spec.subtitle && <p className="md-chart__subtitle">{spec.subtitle}</p>}
        </div>
      )}
      <Legend spec={spec} />
      {spec.type === "line" ? <LineChart spec={spec} /> : <BarChart spec={spec} />}
      {spec.caption && <figcaption>{spec.caption}</figcaption>}
    </figure>
  );
}
