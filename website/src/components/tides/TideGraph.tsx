import { useMemo } from "react";
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
import type { ExtremesResponse, TimelineResponse } from "../../utils/tides";

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

interface TideDataPoint {
  time: Date;
  level: number;
  label?: string;
}

interface Props {
  station: Station;
  extremesData: ExtremesResponse | null;
  timelineData: TimelineResponse | null;
}

export function TideGraph({ station, extremesData, timelineData }: Props) {
  const units: "meters" | "feet" = "feet";
  const isReference = station.type === "reference";

  const data: TideDataPoint[] = useMemo(() => {
    if (isReference && timelineData) {
      return timelineData.timeline.map((p) => ({
        time: new Date(p.time),
        level: p.level,
      }));
    }
    if (!isReference && extremesData) {
      return extremesData.extremes.map((p) => ({
        time: new Date(p.time),
        level: p.level,
        label: p.label,
      }));
    }
    return [];
  }, [isReference, timelineData, extremesData]);

  const datum =
    (isReference ? timelineData?.datum : extremesData?.datum) ||
    station.chart_datum;

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
          { x: currentTime, y: Math.min(0, minLevel - padding) },
          { x: currentTime, y: maxLevel + padding },
        ],
        borderColor: "rgba(249, 115, 22, 0.5)",
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const unitsLabel = units === "feet" ? "ft" : "m";

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
            return `${(context.parsed.y ?? 0).toFixed(2)} ${unitsLabel}`;
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
        ticks: {
          stepSize: maxLevel - minLevel > 3 ? 1 : 0.5,
          callback: function (value: any) {
            return `${value} ${unitsLabel}`;
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
