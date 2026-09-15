import { Fragment, useMemo, useState } from "react";
import {
  moonAltAz,
  moonPosition,
  solarEclipses,
  solarObscuration,
  sunAltAz,
  sunPosition,
  type SolarEclipse,
  type SolarEclipseKind,
} from "@openwaters/almanac";

import { DateTime } from "../DateTime";
import { cn } from "../../utils/cn";
import { LocationPicker, toObserver, useLocation } from "./LocationPicker";
import {
  solarContactRows,
  solarEclipseInstant,
  solarEclipseWindowState,
} from "./solarEclipse";

const AU_KM = 149_597_870.7;
const SUN_RADIUS_KM = 695_700;
const MOON_RADIUS_KM = 1_737.4;
const DISC_RADIUS = 72;
const KIND_LABEL: Record<SolarEclipseKind, string> = {
  partial: "Partial",
  annular: "Annular",
  total: "Total",
};

const signedAngle = (degrees: number) => ((degrees + 540) % 360) - 180;

function SolarEclipseCard({
  eclipse,
  tz,
  onGoTo,
}: {
  eclipse: SolarEclipse;
  tz: string;
  onGoTo: (time: Date) => void;
}) {
  const peakAlt = Math.round(eclipse.sunAltDeg.peak);

  return (
    <div className="card space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold">Solar eclipse here</h3>
        <span className="rounded-full bg-(--accent-bg) px-3 py-1 text-xs font-semibold tracking-wide text-(--accent) uppercase">
          {KIND_LABEL[eclipse.kind]}
        </span>
      </div>
      <div>
        <div className="text-2xl font-semibold">
          <DateTime
            datetime={eclipse.peak}
            timeZone={tz}
            month="long"
            day="numeric"
            year="numeric"
          />
        </div>
        <div className="text-(--text-secondary)">
          Greatest eclipse at{" "}
          <DateTime
            datetime={eclipse.peak}
            timeZone={tz}
            hour="2-digit"
            minute="2-digit"
            timeZoneName="short"
          />
        </div>
      </div>
      <div
        className={
          peakAlt >= 0
            ? "rounded-lg bg-(--status-green-bg) px-3 py-2 text-sm text-(--status-green-text)"
            : "rounded-lg bg-(--surface-subtle) px-3 py-2 text-sm text-(--text-secondary)"
        }
      >
        {peakAlt >= 0
          ? `Visible at greatest eclipse — the Sun is ${peakAlt}° above the horizon.`
          : `Below the horizon at greatest eclipse — the Sun is ${Math.abs(peakAlt)}° below it.`}
      </div>
      <dl>
        {solarContactRows(eclipse.kind).map(([key, label]) => {
          const time = eclipse[key];
          const altitude = eclipse.sunAltDeg[key];
          if (time === null || altitude === null) return null;
          const dim = altitude < 0 ? "opacity-40" : "";
          const title = altitude < 0 ? "Sun below the horizon" : undefined;
          return (
            <Fragment key={key}>
              <dt className={dim} title={title}>
                {label}
              </dt>
              <dd className={`text-right tabular-nums ${dim}`}>
                <button
                  type="button"
                  onClick={() => onGoTo(time)}
                  title={title ?? `Show the Sun at ${label.toLowerCase()}`}
                  className="text-(--accent) underline-offset-4 hover:underline"
                >
                  <DateTime
                    datetime={time}
                    timeZone={tz}
                    hour="2-digit"
                    minute="2-digit"
                  />
                </button>
              </dd>
            </Fragment>
          );
        })}
        <dt className="mt-1 border-t border-(--border-subtle) pt-1">
          Peak obscuration
        </dt>
        <dd className="mt-1 border-t border-(--border-subtle) pt-1 text-right tabular-nums">
          {(eclipse.obscuration * 100).toFixed(1)}%
        </dd>
      </dl>
    </div>
  );
}

export default function SolarEclipseDemo() {
  const [place, setPlace] = useLocation();
  const [selectedPeak, setSelectedPeak] = useState<number>();
  const [progress, setProgress] = useState(500);
  const [start] = useState(() => new Date());
  const end = useMemo(() => {
    const date = new Date(start);
    date.setUTCFullYear(date.getUTCFullYear() + 10);
    return date;
  }, [start]);
  const observer = useMemo(() => toObserver(place), [place]);
  const eclipses = useMemo(
    () => solarEclipses(start, end, observer),
    [start, end, observer],
  );
  const state = solarEclipseWindowState(eclipses);
  const eclipse =
    eclipses.find(({ peak }) => peak.getTime() === selectedPeak) ?? eclipses[0];

  const choosePlace = (next: typeof place) => {
    setPlace(next);
    setSelectedPeak(undefined);
    setProgress(500);
  };

  if (!eclipse) {
    return (
      <div className="space-y-5">
        <LocationPicker place={place} onChange={choosePlace} />
        <p role="status" className="card text-(--text-secondary)">
          No solar eclipse is visible from here in the next ten years.
        </p>
        <p className="font-medium">
          Never look at the Sun without proper eye protection, at any phase but
          totality.
        </p>
      </div>
    );
  }

  const instant = solarEclipseInstant(eclipse, progress);
  const obscuration = solarObscuration(instant, observer);
  const sun = sunAltAz(instant, observer);
  const moon = moonAltAz(instant, observer);
  const sunRadiusDeg =
    (Math.asin(SUN_RADIUS_KM / (sunPosition(instant).distanceAu * AU_KM)) *
      180) /
    Math.PI;
  const moonRadius =
    (Math.asin(MOON_RADIUS_KM / moonPosition(instant).distanceKm) *
      180 *
      DISC_RADIUS) /
    (Math.PI * sunRadiusDeg);
  const scale = DISC_RADIUS / sunRadiusDeg;
  const moonX =
    160 +
    signedAngle(moon.azDeg - sun.azDeg) *
      Math.cos((sun.altDeg * Math.PI) / 180) *
      scale;
  const moonY = 140 - (moon.altDeg - sun.altDeg) * scale;
  const goTo = (time: Date) =>
    setProgress(
      ((time.getTime() - eclipse.c1.getTime()) /
        (eclipse.c4.getTime() - eclipse.c1.getTime())) *
        1000,
    );

  return (
    <div className="space-y-5">
      <LocationPicker place={place} onChange={choosePlace} />
      <div className="flex flex-wrap gap-2" aria-label="Solar eclipses">
        {eclipses.map((event) => (
          <button
            key={event.peak.toISOString()}
            type="button"
            aria-pressed={event === eclipse}
            onClick={() => {
              setSelectedPeak(event.peak.getTime());
              setProgress(500);
            }}
            className={cn(
              "btn",
              event === eclipse ? "btn-primary" : "btn-secondary",
            )}
          >
            {KIND_LABEL[event.kind]} ·{" "}
            <DateTime
              datetime={event.peak}
              timeZone={place.tz}
              month="short"
              day="numeric"
              year="numeric"
            />
          </button>
        ))}
      </div>
      {state === "partial-only" && (
        <p className="text-sm text-(--text-secondary)">
          No annular or total solar eclipse is visible from here in this
          ten-year window.
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <svg
            viewBox="0 0 320 280"
            className="block w-full rounded-xl"
            role="img"
            aria-label={`${KIND_LABEL[eclipse.kind]} solar eclipse: ${Math.round(obscuration * 100)}% of the Sun covered in an illustrative schematic`}
          >
            <rect
              width="320"
              height="280"
              fill={`hsl(220 45% ${Math.round(30 - obscuration * 18)}%)`}
            />
            <g opacity={sun.altDeg < 0 ? 0.25 : 1}>
              <circle cx="160" cy="140" r={DISC_RADIUS} fill="#f7c66b" />
              <circle cx={moonX} cy={moonY} r={moonRadius} fill="#101c35" />
            </g>
          </svg>
          <label className="block space-y-2 font-medium">
            Eclipse time
            <input
              type="range"
              min="0"
              max="1000"
              step="1"
              aria-label="Solar eclipse time"
              value={progress}
              onChange={(event) => setProgress(Number(event.target.value))}
              className="block w-full accent-(--accent)"
            />
          </label>
          <p className="text-sm tabular-nums">
            {(obscuration * 100).toFixed(1)}% covered · Sun{" "}
            {Math.abs(sun.altDeg).toFixed(1)}°{" "}
            {sun.altDeg >= 0 ? "above" : "below"} the horizon ·{" "}
            <DateTime
              datetime={instant}
              timeZone={place.tz}
              locale="en-GB"
              month="short"
              day="numeric"
              hour="2-digit"
              minute="2-digit"
              timeZoneName="short"
            />
          </p>
          <p className="text-xs text-(--text-secondary)">
            Disc positions and sizes use Almanac's topocentric sky positions and
            distances. The drawing is illustrative, not safe-viewing guidance.
          </p>
        </div>
        <SolarEclipseCard eclipse={eclipse} tz={place.tz} onGoTo={goTo} />
      </div>
      <p className="font-medium">
        Never look at the Sun without proper eye protection, at any phase but
        totality.
      </p>
    </div>
  );
}
