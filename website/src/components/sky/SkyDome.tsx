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
import { CENTER, DOME_SIZE, HORIZON_R, project } from "./projection";
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

const HOUR_MS = 60 * MINUTE_MS;
/** How long the opening sweep takes to cross the night. */
const SWEEP_MS = 14_000;

// `|| 0` because Math.round(-0.4) is -0, which a screen reader says as "minus zero".
const roundDeg = (deg: number) => Math.round(deg) || 0;

const SUN_LABELS: Partial<Record<SunEventKind, string>> = {
  rise: "Sunrise",
  set: "Sunset",
  civilDawn: "Civil dawn",
  civilDusk: "Civil dusk",
  transit: "Solar noon",
};

/** True when the visitor has asked for less motion. */
const stillPreferred = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The stretch of darkness the page opens on: sunset, then ten hours.
 *
 * The demo is a star field, so it should open on a sky that has stars in it
 * rather than on whatever the visitor's clock says. Ten hours is longer than
 * most nights, which is the point — the sweep runs past dawn in summer and the
 * sky brightens on its own, which is a better demonstration than stopping.
 *
 * Null under a polar day, where there is no sunset to start from.
 */
function nightWindow(now: Date, place: typeof DEFAULT_PLACE) {
  const start = startOfZonedDay(place.tz, now);
  const sunset = sunEvents(
    start,
    new Date(start.getTime() + DAY_MS),
    toObserver(place),
  ).find((e) => e.kind === "set")?.time;
  if (!sunset) return null;
  return { from: sunset, to: new Date(sunset.getTime() + 10 * HOUR_MS) };
}

export default function SkyDome() {
  // `now` is captured once: the ±366-day clamp must not
  // drift under a long-lived tab.
  const [now] = useState(() => new Date());
  const [place, setPlace] = useLocation();
  const night = useMemo(() => nightWindow(now, DEFAULT_PLACE), [now]);
  // Sunset, so the sweep opens in daylight and the stars come out as it runs.
  // Standing still, that first frame would be a starless sky on a page whose
  // whole subject is the star field, so a still visitor gets the middle of the
  // night instead.
  const [instant, setInstant] = useState(() => {
    if (!night) return now;
    if (!stillPreferred()) return night.from;
    return new Date((night.from.getTime() + night.to.getTime()) / 2);
  });

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
    if (!night || stillPreferred()) return;

    const [from, to] = [night.from.getTime(), night.to.getTime()];
    const t0 = performance.now();
    let frame = 0;
    // Linear: the sky turns at one rate, and easing the night would read as the
    // Earth slowing down.
    const step = (ts: number) => {
      if (cancelled.current) return;
      const p = Math.min(1, (ts - t0) / SWEEP_MS);
      setInstant(new Date(from + (to - from) * p));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [night]);

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
  const sunPoint = project(sky.sun);
  const moonPoint = project(sky.moon);
  // Just outside the rim, on the same bearings the dome uses.
  const compass = [
    { az: 0, label: "N" },
    { az: 90, label: "E" },
    { az: 180, label: "S" },
    { az: 270, label: "W" },
  ].map(({ az, label }) => {
    const rad = (az * Math.PI) / 180;
    return {
      label,
      x: CENTER - (HORIZON_R + 15) * Math.sin(rad),
      y: CENTER - (HORIZON_R + 15) * Math.cos(rad),
    };
  });

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
      {/* Sky dome: the whole visible hemisphere, zenith at the centre */}
      <svg
        viewBox={`0 0 ${DOME_SIZE} ${DOME_SIZE}`}
        className="mx-auto block w-full max-w-[34rem]"
        role="img"
        aria-label={`Sky over ${place.label}, looking up: north at the top, east on the left. Sun ${roundDeg(sky.sun.altDeg)} degrees altitude, Moon ${roundDeg(sky.moon.altDeg)} degrees altitude, ${phaseName(sky.illum.phase).toLowerCase()}, ${sky.stars.length} stars above the horizon.`}
      >
        <defs>
          {/* Radial, not linear: on a dome the zenith is the centre. */}
          <radialGradient id="sky-gradient">
            <stop offset="0%" stopColor={sky.paint.top} />
            <stop offset="100%" stopColor={sky.paint.bottom} />
          </radialGradient>
          <radialGradient id="sun-glow">
            <stop offset="0%" stopColor="#fff6d5" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff6d5" stopOpacity="0" />
          </radialGradient>
          {/* The horizon does the occluding a ground rectangle used to. */}
          <clipPath id="horizon">
            <circle cx={CENTER} cy={CENTER} r={HORIZON_R} />
          </clipPath>
        </defs>

        <circle
          cx={CENTER}
          cy={CENTER}
          r={HORIZON_R}
          fill="url(#sky-gradient)"
        />

        <g clipPath="url(#horizon)">
          <g fill="#ffffff" opacity={sky.paint.starOpacity}>
            {sky.stars.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} />
            ))}
          </g>

          <circle
            cx={sunPoint.x}
            cy={sunPoint.y}
            r={46}
            fill="url(#sun-glow)"
          />
          <circle cx={sunPoint.x} cy={sunPoint.y} r={12} fill="#ffd873" />

          {/* Moon: faint full disc, then the lit region */}
          <circle
            cx={moonPoint.x}
            cy={moonPoint.y}
            r={10}
            fill="#ffffff"
            opacity={0.12}
          />
          <path
            d={moonPath(
              moonPoint.x,
              moonPoint.y,
              10,
              sky.illum.fraction,
              sky.illum.waxing,
            )}
            fill="#f4f4ef"
          />
        </g>

        <circle
          cx={CENTER}
          cy={CENTER}
          r={HORIZON_R}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.25"
        />

        <g
          fill="var(--text-secondary)"
          fontSize="13"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {compass.map(({ label, x, y }) => (
            <text key={label} x={x} y={y}>
              {label}
            </text>
          ))}
        </g>
      </svg>

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
