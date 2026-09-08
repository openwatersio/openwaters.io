import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  moonAltAz,
  moonEvents,
  moonIllumination,
  sunAltAz,
  sunEvents,
  type SunEventKind,
} from "@openwaters/almanac";

import { DateTime } from "../DateTime";
import { moonPath, phaseName } from "./moonPath";
import {
  DOME_HEIGHT,
  DOME_WIDTH,
  HORIZON_Y,
  azimuthToX,
  centerAzimuthDeg,
  project,
} from "./projection";
import { skyColor } from "./skyColor";
import { domeStars } from "./stars";
import { DAY_MS, MINUTE_MS, startOfZonedDay, zonedDayKey } from "./time";

const MAX_DAY_OFFSET = 366;
import {
  LocationPicker,
  useLocation,
  toObserver,
  PLACES,
} from "./LocationPicker";
const DEFAULT_PLACE = PLACES[0]!;

// `|| 0` because Math.round(-0.4) is -0, which a screen reader says as "minus zero".
const roundDeg = (deg: number) => Math.round(deg) || 0;

const SUN_LABELS: Partial<Record<SunEventKind, string>> = {
  rise: "Sunrise",
  set: "Sunset",
  civilDawn: "Civil dawn",
  civilDusk: "Civil dusk",
  transit: "Solar noon",
};

export default function SkyDome() {
  // `now` is captured once: the ±366-day clamp must not
  // drift under a long-lived tab.
  const [now] = useState(() => new Date());
  const [place, setPlace] = useLocation();
  const [instant, setInstant] = useState(now);

  const observer = useMemo(() => toObserver(place), [place]);
  const dayKey = zonedDayKey(place.tz, instant);
  const dayStart = useMemo(
    () => startOfZonedDay(place.tz, instant),
    // The whole point of dayKey: dragging the time slider must not re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [place.tz, dayKey],
  );

  // The linear-scan searches. Keyed on the civil day, so scrubbing time is free.
  const day = useMemo(() => {
    const end = new Date(dayStart.getTime() + DAY_MS);
    try {
      return {
        sun: sunEvents(dayStart, end, observer),
        moon: moonEvents(dayStart, end, observer),
        error: false,
      };
    } catch {
      return { sun: [], moon: [], error: true };
    }
  }, [dayStart, observer]);

  // Cheap enough to redo every frame: truncated series, microseconds each.
  const sky = useMemo(() => {
    const sun = sunAltAz(instant, observer);
    const moon = moonAltAz(instant, observer);
    const illum = moonIllumination(instant);
    return {
      sun,
      moon,
      illum,
      paint: skyColor(sun.altDeg),
      // Recomputed with the rest: 288 stars is well under a millisecond.
      stars: domeStars(instant, observer),
    };
  }, [instant, observer]);

  // --- autoplay ------------------------------------------------------------
  // Runs once, on mount. A ref rather than effect cleanup because the sweep is
  // cancelled by user input, not by a dependency change.
  const cancelled = useRef(false);
  const stopPlayback = useCallback(() => {
    cancelled.current = true;
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const start = startOfZonedDay(DEFAULT_PLACE.tz, now);
    const sunrise = sunEvents(
      start,
      new Date(start.getTime() + DAY_MS),
      toObserver(DEFAULT_PLACE),
    ).find((e) => e.kind === "rise")?.time;
    if (!sunrise) return; // polar day or night: nothing to sweep through

    const from = sunrise.getTime() - 30 * MINUTE_MS;
    const to = sunrise.getTime() + 60 * MINUTE_MS;
    const t0 = performance.now();
    const DURATION = 6000;
    let frame = 0;

    const step = (ts: number) => {
      if (cancelled.current) return;
      const p = Math.min(1, (ts - t0) / DURATION);
      const eased = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      setInstant(new Date(from + (to - from) * eased));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [now]);

  // --- controls ------------------------------------------------------------
  const minutesIntoDay = Math.round(
    (instant.getTime() - dayStart.getTime()) / MINUTE_MS,
  );

  const setMinutes = (m: number) => {
    stopPlayback();
    // ponytail: a DST day is not 1440 minutes long, so the clock label can skip
    // or repeat an hour here. The label always shows the true local time, so
    // the readout stays honest; fix by walking events if anyone complains.
    setInstant(new Date(dayStart.getTime() + m * MINUTE_MS));
  };

  const stepDay = (delta: number) => {
    stopPlayback();
    const target = new Date(instant.getTime() + delta * DAY_MS);
    const offset = Math.abs(target.getTime() - now.getTime()) / DAY_MS;
    if (offset <= MAX_DAY_OFFSET) setInstant(target);
  };

  // --- render --------------------------------------------------------------
  const sunPoint = project(sky.sun, place.lat);
  const moonPoint = project(sky.moon, place.lat);
  const center = centerAzimuthDeg(place.lat);
  const compass = [
    { az: 0, label: "N" },
    { az: 90, label: "E" },
    { az: 180, label: "S" },
    { az: 270, label: "W" },
  ];

  const firstOf = (kind: SunEventKind) =>
    day.sun.find((e) => e.kind === kind)?.time;
  const moonRise = day.moon.find((e) => e.kind === "rise")?.time;
  const moonSet = day.moon.find((e) => e.kind === "set")?.time;

  const hm = { hour: "2-digit", minute: "2-digit" } as const;

  return (
    <div className="space-y-6">
      <LocationPicker
        place={place}
        onChange={(next) => {
          stopPlayback();
          setPlace(next);
        }}
      />
      {/* Sky dome */}
      <div className="overflow-hidden rounded-xl border border-(--border)">
        <svg
          viewBox={`0 0 ${DOME_WIDTH} ${DOME_HEIGHT}`}
          className="block w-full"
          role="img"
          aria-label={`Sky over ${place.label}. Sun ${roundDeg(sky.sun.altDeg)} degrees altitude, Moon ${roundDeg(sky.moon.altDeg)} degrees altitude, ${phaseName(sky.illum.phase).toLowerCase()}.`}
        >
          <defs>
            <linearGradient id="sky-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sky.paint.top} />
              <stop offset="100%" stopColor={sky.paint.bottom} />
            </linearGradient>
            <radialGradient id="sun-glow">
              <stop offset="0%" stopColor="#fff6d5" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fff6d5" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect
            width={DOME_WIDTH}
            height={DOME_HEIGHT}
            fill="url(#sky-gradient)"
          />

          <g fill="#ffffff" opacity={sky.paint.starOpacity}>
            {sky.stars.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} />
            ))}
          </g>

          {/* Sun */}
          <circle
            cx={sunPoint.x}
            cy={sunPoint.y}
            r={64}
            fill="url(#sun-glow)"
          />
          <circle cx={sunPoint.x} cy={sunPoint.y} r={17} fill="#ffd873" />

          {/* Moon: faint full disc, then the lit region */}
          <circle
            cx={moonPoint.x}
            cy={moonPoint.y}
            r={13}
            fill="#ffffff"
            opacity={0.12}
          />
          <path
            d={moonPath(
              moonPoint.x,
              moonPoint.y,
              13,
              sky.illum.fraction,
              sky.illum.waxing,
            )}
            fill="#f4f4ef"
          />

          {/* Ground last, so a body below the horizon is genuinely occluded */}
          <rect
            y={HORIZON_Y}
            width={DOME_WIDTH}
            height={DOME_HEIGHT - HORIZON_Y}
            fill="#0b1d2c"
          />
          <line
            x1="0"
            y1={HORIZON_Y}
            x2={DOME_WIDTH}
            y2={HORIZON_Y}
            stroke="#ffffff"
            strokeOpacity="0.25"
          />

          <g fill="#ffffff" fillOpacity="0.55" fontSize="13">
            {compass.map(({ az, label }) => {
              const x = azimuthToX(az, place.lat);
              // The seam duplicates the centre's opposite bearing at both edges.
              if (az === (center + 180) % 360) return null;
              return (
                <text key={label} x={x} y={HORIZON_Y + 22} textAnchor="middle">
                  {label}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Scrubber */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary px-3 py-1"
              onClick={() => stepDay(-1)}
              aria-label="Previous day"
            >
              ‹
            </button>
            <button
              type="button"
              className="btn btn-secondary px-3 py-1"
              onClick={() => {
                stopPlayback();
                setInstant(new Date());
              }}
            >
              Now
            </button>
            <button
              type="button"
              className="btn btn-secondary px-3 py-1"
              onClick={() => stepDay(1)}
              aria-label="Next day"
            >
              ›
            </button>
          </div>
          <div className="text-lg font-semibold tabular-nums">
            <DateTime
              datetime={instant}
              timeZone={place.tz}
              weekday="short"
              month="short"
              day="numeric"
            />
            {" · "}
            <DateTime
              datetime={instant}
              timeZone={place.tz}
              {...hm}
              timeZoneName="short"
            />
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={1439}
          value={Math.min(1439, Math.max(0, minutesIntoDay))}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="w-full accent-(--accent)"
          aria-label="Time of day"
        />
      </div>

      {/* Readouts */}
      {day.error ? (
        <div className="card text-(--text-secondary)">
          Couldn't compute events for this date.
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {(["rise", "set", "civilDawn", "civilDusk", "transit"] as const).map(
            (kind) => {
              const t = firstOf(kind);
              return (
                <div key={kind}>
                  <dt className="text-sm text-(--text-secondary)">
                    {SUN_LABELS[kind]}
                  </dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {t ? (
                      <DateTime datetime={t} timeZone={place.tz} {...hm} />
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              );
            },
          )}
          <div>
            <dt className="text-sm text-(--text-secondary)">Moonrise</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {moonRise ? (
                <DateTime datetime={moonRise} timeZone={place.tz} {...hm} />
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-(--text-secondary)">Moonset</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {moonSet ? (
                <DateTime datetime={moonSet} timeZone={place.tz} {...hm} />
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-(--text-secondary)">Moon phase</dt>
            <dd className="text-lg font-semibold">
              {phaseName(sky.illum.phase)}{" "}
              <span className="text-(--text-secondary) tabular-nums">
                {Math.round(sky.illum.fraction * 100)}%
              </span>
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
