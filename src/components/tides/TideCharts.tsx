import tidePrediction from "@neaps/tide-predictor";

// Monterey, CA harmonic constituents (station 9413450)
const montereyConstituents = [
  { name: "M2", amplitude: 0.491, phase: 181.3 },
  { name: "S2", amplitude: 0.13, phase: 180.1 },
  { name: "N2", amplitude: 0.112, phase: 155 },
  { name: "K1", amplitude: 0.354, phase: 212.4 },
  { name: "O1", amplitude: 0.219, phase: 198.6 },
  { name: "K2", amplitude: 0.042, phase: 166.6 },
  { name: "P1", amplitude: 0.111, phase: 210.1 },
  { name: "Q1", amplitude: 0.041, phase: 189.3 },
  { name: "M4", amplitude: 0.012, phase: 232.6 },
  { name: "M6", amplitude: 0.006, phase: 219.1 },
  { name: "MK3", amplitude: 0.004, phase: 135.7 },
  { name: "S4", amplitude: 0.002, phase: 165.7 },
  { name: "MN4", amplitude: 0.005, phase: 199.9 },
  { name: "NU2", amplitude: 0.022, phase: 157.7 },
  { name: "S6", amplitude: 0.001, phase: 43.8 },
  { name: "MU2", amplitude: 0.012, phase: 167.1 },
  { name: "2N2", amplitude: 0.014, phase: 126.2 },
  { name: "OO1", amplitude: 0.013, phase: 231.2 },
  { name: "LAM2", amplitude: 0.004, phase: 174.7 },
  { name: "S1", amplitude: 0.01, phase: 134.7 },
  { name: "M1", amplitude: 0.013, phase: 216.6 },
  { name: "J1", amplitude: 0.02, phase: 228.9 },
  { name: "MM", amplitude: 0.0, phase: 0.0 },
  { name: "SSA", amplitude: 0.028, phase: 159.5 },
  { name: "SA", amplitude: 0.063, phase: 255.7 },
  { name: "MSF", amplitude: 0.0, phase: 0.0 },
  { name: "MF", amplitude: 0.0, phase: 0.0 },
  { name: "RHO", amplitude: 0.008, phase: 194.9 },
  { name: "T2", amplitude: 0.007, phase: 175.9 },
  { name: "L2", amplitude: 0.014, phase: 189.6 },
  { name: "2Q1", amplitude: 0.005, phase: 181.7 },
  { name: "2SM2", amplitude: 0.002, phase: 352.9 },
  { name: "M3", amplitude: 0.003, phase: 266.6 },
  { name: "MS4", amplitude: 0.005, phase: 277.6 },
  { name: "2MK3", amplitude: 0.002, phase: 115.7 },
];

const width = 600;
const height = 150;
const padding = 10;
const chartWidth = width - padding * 2;
const chartHeight = height - padding * 2;

// Safe min/max that doesn't use spread operator (avoids stack overflow on large arrays)
function getMinMax(levels: number[]): { min: number; max: number } {
  let min = levels[0];
  let max = levels[0];
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] < min) min = levels[i];
    if (levels[i] > max) max = levels[i];
  }
  return { min, max };
}

function generatePath(
  levels: number[],
  minLevel: number,
  range: number,
): string {
  const points = levels.map((level, i) => {
    const x = padding + (i / (levels.length - 1)) * chartWidth;
    const y =
      padding + chartHeight - ((level - minLevel) / range) * chartHeight;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `M${points.join(" L")}`;
}

interface ChartData {
  paths: Array<{ d: string; color: string; name?: string }>;
  zeroY: number;
  label?: string;
  legend?: Array<{ color: string; name: string }>;
}

function generateChartData(
  type: "single" | "multiple" | "all" | "combined",
): ChartData {
  const timeFidelity = 30; // 30-minute intervals

  if (type === "single") {
    const m2 = montereyConstituents.find((c) => c.name === "M2")!;
    const prediction = tidePrediction([m2]);
    const timeline = prediction.getTimelinePrediction({
      start: new Date("2018-01-01"),
      end: new Date("2018-01-05"),
      timeFidelity,
    });
    const levels = timeline.map((p) => p.level);
    const { min: minLevel, max: maxLevel } = getMinMax(levels);
    const range = maxLevel - minLevel || 1;
    const zeroY =
      padding + chartHeight - ((0 - minLevel) / range) * chartHeight;

    return {
      paths: [{ d: generatePath(levels, minLevel, range), color: "#0284c7" }],
      zeroY,
      label: "M2 constituent for Monterey, CA (Jan 1-5, 2018)",
    };
  }

  if (type === "multiple") {
    const constituentsToShow = ["M2", "S2", "N2", "K1"];
    const colors: Record<string, string> = {
      M2: "#0284c7",
      S2: "#dc2626",
      N2: "#7c3aed",
      K1: "#16a34a",
    };

    const datasets = constituentsToShow.map((name) => {
      const constituent = montereyConstituents.find((c) => c.name === name)!;
      const prediction = tidePrediction([constituent]);
      const timeline = prediction.getTimelinePrediction({
        start: new Date("2018-01-01"),
        end: new Date("2018-01-05"),
        timeFidelity,
      });
      return {
        levels: timeline.map((p) => p.level),
        color: colors[name],
        name,
      };
    });

    let minLevel = Infinity;
    let maxLevel = -Infinity;
    for (const dataset of datasets) {
      const { min, max } = getMinMax(dataset.levels);
      if (min < minLevel) minLevel = min;
      if (max > maxLevel) maxLevel = max;
    }
    const range = maxLevel - minLevel || 1;
    const zeroY =
      padding + chartHeight - ((0 - minLevel) / range) * chartHeight;

    return {
      paths: datasets.map((d) => ({
        d: generatePath(d.levels, minLevel, range),
        color: d.color,
        name: d.name,
      })),
      zeroY,
      legend: datasets.map((d) => ({ color: d.color, name: d.name })),
    };
  }

  if (type === "all") {
    const colors = [
      "#0284c7",
      "#dc2626",
      "#16a34a",
      "#7c3aed",
      "#f59e0b",
      "#ec4899",
      "#06b6d4",
      "#84cc16",
      "#f97316",
      "#8b5cf6",
      "#14b8a6",
      "#ef4444",
      "#22c55e",
      "#a855f7",
      "#eab308",
      "#6366f1",
      "#10b981",
      "#f43f5e",
      "#3b82f6",
      "#d946ef",
      "#0ea5e9",
      "#78716c",
      "#64748b",
      "#71717a",
      "#737373",
      "#a3a3a3",
      "#525252",
      "#404040",
      "#262626",
      "#171717",
    ];

    const activeConstituents = montereyConstituents.filter(
      (c) => c.amplitude > 0,
    );
    const datasets = activeConstituents.map((constituent, i) => {
      const prediction = tidePrediction([constituent]);
      const timeline = prediction.getTimelinePrediction({
        start: new Date("2018-01-01"),
        end: new Date("2018-01-05"),
        timeFidelity: 60, // Hourly for "all" to reduce data
      });
      return {
        levels: timeline.map((p) => p.level),
        color: colors[i % colors.length],
        name: constituent.name,
      };
    });

    let minLevel = Infinity;
    let maxLevel = -Infinity;
    for (const dataset of datasets) {
      const { min, max } = getMinMax(dataset.levels);
      if (min < minLevel) minLevel = min;
      if (max > maxLevel) maxLevel = max;
    }
    const range = maxLevel - minLevel || 1;
    const zeroY =
      padding + chartHeight - ((0 - minLevel) / range) * chartHeight;

    return {
      paths: datasets.map((d) => ({
        d: generatePath(d.levels, minLevel, range),
        color: d.color,
      })),
      zeroY,
      label: `All ${activeConstituents.length} constituents plotted individually`,
    };
  }

  // Combined prediction
  const prediction = tidePrediction(montereyConstituents);
  const timeline = prediction.getTimelinePrediction({
    start: new Date("2018-01-01"),
    end: new Date("2018-01-05"),
    timeFidelity,
  });
  const levels = timeline.map((p) => p.level);
  const { min: minLevel, max: maxLevel } = getMinMax(levels);
  const range = maxLevel - minLevel || 1;
  const zeroY = padding + chartHeight - ((0 - minLevel) / range) * chartHeight;

  return {
    paths: [{ d: generatePath(levels, minLevel, range), color: "#0284c7" }],
    zeroY,
    label: "Combined tide prediction for Monterey, CA (Jan 1-5, 2018)",
  };
}

interface TideChartProps {
  type: "single" | "multiple" | "all" | "combined";
}

export function TideChart({ type }: TideChartProps) {
  const chartData = generateChartData(type);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <line
          x1={padding}
          y1={chartData.zeroY}
          x2={width - padding}
          y2={chartData.zeroY}
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="4"
        />
        {chartData.paths.map((path, i) => (
          <path
            key={i}
            d={path.d}
            fill="none"
            stroke={path.color}
            strokeWidth={
              type === "all" ? "1" : type === "multiple" ? "1.5" : "2"
            }
            opacity={type === "all" ? "0.6" : type === "multiple" ? "0.8" : "1"}
          />
        ))}
      </svg>
      {chartData.legend && (
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm">
          {chartData.legend.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
          ))}
        </div>
      )}
      {chartData.label && (
        <p className="mt-2 text-center text-sm text-navy-500">
          {chartData.label}
        </p>
      )}
    </div>
  );
}

// Named exports for each chart type for convenience
export function SingleConstituentChart() {
  return <TideChart type="single" />;
}

export function MultipleConstituentsChart() {
  return <TideChart type="multiple" />;
}

export function AllConstituentsChart() {
  return <TideChart type="all" />;
}

export function CombinedPredictionChart() {
  return <TideChart type="combined" />;
}
