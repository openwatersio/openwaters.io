import { useEffect, useState } from "react";
import { useStation } from "neaps";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import type { Station } from "@neaps/tide-database";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
);

interface Props {
  station: Station;
}

interface TideDataPoint {
  time: Date;
  level: number;
  label?: string;
}

type Predictor = ReturnType<typeof useStation>;

export function TideGraph({ station }: Props) {
  const [predictor, setPredictor] = useState<Predictor>();
  const [data, setData] = useState<TideDataPoint[]>([]);
  const [startDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });
  const [endDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    return tomorrow.toISOString().split("T")[0];
  });
  const [datum, setDatum] = useState<string>("");
  const [units] = useState<"meters" | "feet">("feet");

  useEffect(() => {
    const predictor = useStation(station);
    setPredictor(predictor);
    if (!datum && predictor.defaultDatum) setDatum(predictor.defaultDatum);
  }, [station]);

  useEffect(() => {
    if (!predictor) return;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (station.type === "reference") {
      const prediction = predictor.getTimelinePrediction({
        start,
        end,
        timeFidelity: 6,
        datum,
        units,
      });

      setData(prediction.timeline);
    } else {
      const prediction = predictor.getExtremesPrediction({
        start,
        end,
        timeFidelity: 6,
        datum,
        units,
      });

      setData(prediction.extremes || []);
    }
  }, [startDate, endDate, datum, predictor]);

  const minLevel = data.length > 0 ? Math.min(...data.map((d) => d.level)) : 0;
  const maxLevel = data.length > 0 ? Math.max(...data.map((d) => d.level)) : 2;
  const padding = (maxLevel - minLevel) * 0.1 || 0.5;

  const pointDateStyle = Intl.DateTimeFormat(undefined, {
    timeZone: station.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });
  const axisDateStyle = Intl.DateTimeFormat(undefined, {
    timeZone: station.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const currentTime = new Date();
  const chartData = {
    datasets: [
      {
        label: "Water Level",
        data: data.map((d) => ({ x: d.time, y: d.level })),
        borderColor: "#0ea5e9",
        backgroundColor: "rgba(14, 165, 233, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "#0ea5e9",
      },
      {
        label: "Current Time",
        data: [
          { x: currentTime, y: minLevel - padding },
          { x: currentTime, y: maxLevel + padding },
        ],
        borderColor: "rgba(249, 115, 22, 0.5)",
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            if (context.length === 0) return "";
            return pointDateStyle.format(new Date(context[0].parsed.x));
          },
          label: (context: any) => {
            return `${(context.parsed.y ?? 0).toFixed(2)} ${units === "meters" ? "m" : "ft"}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "time" as const,
        time: {
          unit: "day" as const,
        },
        ticks: {
          callback: function (value: any) {
            return axisDateStyle.format(new Date(value));
          },
        },
      },
      y: {
        min: minLevel - padding,
        max: maxLevel + padding,
        ticks: {
          callback: function (value: any) {
            return `${value.toFixed(0)} ${units === "meters" ? "m" : "ft"}`;
          },
        },
        title: {
          display: true,
          text: datum,
        },
      },
    },
  };

  return (
    <div className="space-y-4">
      {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-semibold text-navy-900">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded border border-navy-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-navy-900">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded border border-navy-200 px-3 py-2 text-sm"
          />
        </div>
        {datums.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-navy-900">
              Datum
            </label>
            <select
              value={datum || defaultDatum}
              onChange={(e) => setDatum(e.target.value)}
              className="mt-1 block w-full rounded border border-navy-200 px-3 py-2 text-sm"
            >
              {datums.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
      </div> */}

      <div className="">
        {data.length > 0 ? (
          <div>
            <Line data={chartData} options={chartOptions} />
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-navy-600">Loading tide data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
