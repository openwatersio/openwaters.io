import { useMemo, useState } from "react";
import { moonIllumination, moonAltAz } from "@openwaters/almanac";
import { DateTime } from "../DateTime";
import { cn } from "../../utils/cn";
import { moonPath, phaseName } from "./moonPath";
import { moonMonth, twilightDay } from "./demoData";
import { LocationPicker, useLocation, toObserver } from "./LocationPicker";

const DAY_MS = 86_400_000;
const PHASE_LABELS = {
  new: "New moon",
  firstQuarter: "First quarter",
  full: "Full moon",
  lastQuarter: "Last quarter",
};

export function MoonFilmstrip({ initialMonth }: { initialMonth: string }) {
  const [month, setMonth] = useState(initialMonth);
  const [offset, setOffset] = useState(0.5);
  const [place, setPlace] = useLocation();
  const data = useMemo(() => moonMonth(month), [month]);
  const instant = new Date(data.start.getTime() + offset * DAY_MS);
  const illumination = moonIllumination(instant);
  const name = phaseName(illumination.phase);
  const selectedDay = Math.floor(offset);
  const altitude = moonAltAz(instant, toObserver(place)).altDeg;
  const changeMonth = (value: string) => {
    setMonth(value);
    setOffset(0.5);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 font-medium">
          Month
          <select
            aria-label="Moon month"
            value={month.slice(5)}
            className="bg-canvas rounded-lg border px-3 py-2"
            onChange={(e) =>
              changeMonth(`${month.slice(0, 4)}-${e.target.value}`)
            }
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={String(i + 1).padStart(2, "0")}>
                {new Date(Date.UTC(2026, i, 1)).toLocaleString("en", {
                  month: "long",
                  timeZone: "UTC",
                })}
              </option>
            ))}
          </select>
          <select
            aria-label="Moon year"
            value={month.slice(0, 4)}
            className="bg-canvas rounded-lg border px-3 py-2"
            onChange={(e) => changeMonth(`${e.target.value}-${month.slice(5)}`)}
          >
            {Array.from({ length: 151 }, (_, i) => (
              <option key={i} value={1950 + i}>
                {1950 + i}
              </option>
            ))}
          </select>
        </label>
        <span className="text-fg-muted text-sm">
          One disc per day · noon UTC
        </span>
      </div>
      <LocationPicker place={place} onChange={setPlace} />
      <div className="bg-well text-fg-strong overflow-hidden rounded-xl p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-center gap-6 pb-6 sm:gap-10">
          <svg
            viewBox="0 0 160 160"
            className="size-32 shrink-0 sm:size-40"
            role="img"
            aria-label={`${name}, ${Math.round(illumination.fraction * 100)}% illuminated`}
          >
            <circle cx="80" cy="80" r="70" fill="#1e293b" />
            <path
              d={moonPath(
                80,
                80,
                70,
                illumination.fraction,
                illumination.waxing,
              )}
              fill="#f4f4ef"
            />
          </svg>
          <div className="min-w-44 space-y-1">
            <p className="text-xl font-semibold sm:text-2xl">{name}</p>
            <p className="text-fg-muted">
              <span className="text-fg-strong text-3xl tabular-nums">
                {Math.round(illumination.fraction * 100)}%
              </span>{" "}
              illuminated
            </p>
            <p className="text-fg-muted text-sm">
              <DateTime
                datetime={instant}
                timeZone={place.tz}
                locale="en-GB"
                day="numeric"
                month="short"
                year="numeric"
                hour="2-digit"
                minute="2-digit"
              />{" "}
              {place.label}
            </p>
            <p className="text-fg-muted text-sm">
              Moon {Math.abs(altitude).toFixed(1)}°{" "}
              {altitude >= 0 ? "above" : "below"} the horizon here
            </p>
          </div>
        </div>
        <div
          className="grid grid-cols-7 gap-1 sm:grid-cols-11"
          aria-label="Daily Moon phases"
        >
          {data.days.map((day, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={i === selectedDay}
              aria-label={`${month}-${String(i + 1).padStart(2, "0")}: ${phaseName(day.phase)}, ${Math.round(day.fraction * 100)}% illuminated`}
              onClick={() => setOffset(i + 0.5)}
              className={cn(
                "focus-visible:outline-accent hover:bg-surface-raised rounded-lg px-1 py-2 text-center text-xs tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2",
                i === selectedDay && "ring-accent bg-surface-raised ring-1",
              )}
            >
              <svg
                viewBox="0 0 40 40"
                className="mx-auto mb-1 size-8"
                aria-hidden="true"
              >
                <circle cx="20" cy="20" r="16" fill="#334155" />
                <path
                  d={moonPath(20, 20, 16, day.fraction, day.waxing)}
                  fill="#f4f4ef"
                />
              </svg>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      <label className="block space-y-2 font-medium">
        <span>
          Day of month{" "}
          <span className="text-fg-muted tabular-nums">{selectedDay + 1}</span>
        </span>
        <input
          type="range"
          aria-label="Day of month"
          min="1"
          max={data.days.length}
          step="1"
          value={selectedDay + 1}
          onChange={(e) => setOffset(Number(e.target.value) - 0.5)}
          className="accent-accent block w-full"
        />
      </label>
      <div
        className="flex flex-wrap gap-2"
        aria-label="Jump to an exact Moon phase"
      >
        {data.quarters.map((quarter) => (
          <button
            key={quarter.time.toISOString()}
            type="button"
            className="btn btn-secondary text-sm"
            onClick={() =>
              setOffset(
                (quarter.time.getTime() - data.start.getTime()) / DAY_MS,
              )
            }
          >
            {PHASE_LABELS[quarter.phase]} · {quarter.time.getUTCDate()}
          </button>
        ))}
      </div>
      <p className="text-fg-muted text-sm">
        Phase buttons jump to the exact instant. The upright discs illustrate
        illumination; their tilt in your sky depends on your location. Phase is
        effectively the same worldwide; location changes the local time and Moon
        altitude.
      </p>
    </div>
  );
}

const STAGES = [
  { label: "Daylight", color: "#f7c66b" },
  { label: "Civil twilight", color: "#d88377" },
  { label: "Nautical twilight", color: "#85678e" },
  { label: "Astronomical twilight", color: "#414c78" },
  { label: "Night", color: "#101c35" },
];
const hourLabel = (hours: number) => {
  const minutes = Math.round(hours * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};

export function TwilightRibbon() {
  const [place, setPlace] = useLocation();
  const [month, setMonth] = useState<6 | 12>(6);
  const { start, bands } = useMemo(
    () => twilightDay(place.lat, month, place.lon, place.tz),
    [place, month],
  );
  const daylight = bands
    .filter((band) => band.stage === 0)
    .reduce((hours, band) => hours + band.to - band.from, 0);
  const location = place.label;

  return (
    <div className="space-y-5">
      <LocationPicker place={place} onChange={setPlace} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" aria-label="Season">
          {([6, 12] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={month === value}
              onClick={() => setMonth(value)}
              className={cn(
                "btn",
                month === value ? "btn-primary" : "btn-secondary",
              )}
            >
              {value === 6 ? "June 21" : "December 21"}
            </button>
          ))}
        </div>
        <p className="font-medium tabular-nums">
          {Math.floor(Math.round(daylight * 60) / 60)}h{" "}
          {Math.round(daylight * 60) % 60}m of daylight
        </p>
      </div>
      <div>
        <svg
          viewBox="0 0 800 60"
          preserveAspectRatio="none"
          className="block h-16 w-full"
          role="img"
          aria-label={`Daylight and twilight at ${location} on ${month === 6 ? "June" : "December"} 21, 2026. ${daylight.toFixed(1)} hours of daylight. Exact intervals are listed below.`}
        >
          {bands.map((band) => (
            <rect
              key={band.from}
              x={(band.from / 24) * 800}
              y="0"
              width={((band.to - band.from) / 24) * 800}
              height="60"
              fill={STAGES[band.stage]!.color}
            />
          ))}
        </svg>
        <div className="text-fg-muted mt-2 flex justify-between text-xs tabular-nums">
          {[0, 6, 12, 18, 24].map((hour) => (
            <span key={hour}>{hourLabel(hour)}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {STAGES.map((stage) => (
          <span key={stage.label} className="inline-flex items-center gap-2">
            <svg width="12" height="12" aria-hidden="true">
              <rect width="12" height="12" rx="2" fill={stage.color} />
            </svg>
            {stage.label}
          </span>
        ))}
      </div>
      <p className="text-fg-muted text-sm">
        {daylight === 24
          ? "Midnight Sun: the Sun stays above the horizon all day. "
          : daylight === 0
            ? "Polar night: the Sun never rises, though twilight can still bring light. "
            : "Choose another location to compare the length of the day. "}
        Times are local to {place.label} on{" "}
        <DateTime
          datetime={start}
          timeZone={place.tz}
          locale="en-GB"
          day="numeric"
          month="long"
          year="numeric"
        />
        .
      </p>
      <details className="text-sm">
        <summary className="text-accent cursor-pointer font-medium">
          Exact twilight intervals
        </summary>
        <ul className="mt-3 space-y-1">
          {bands.map((band) => (
            <li key={band.from} className="tabular-nums">
              {hourLabel(band.from)}–{hourLabel(band.to)} ·{" "}
              {STAGES[band.stage]!.label}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
