import { useId, useMemo, useState } from "react";
import {
  lunarEclipses,
  lunarEclipseVisibility,
  moonAltAz,
} from "@openwaters/almanac";
import { LocationPicker, useLocation, toObserver } from "./LocationPicker";
import { EclipseCard } from "./EclipsePanel";
import { eclipseShade, eclipseCoverage, KIND_LABEL } from "./eclipseShade";
import { DateTime } from "../DateTime";
import { cn } from "../../utils/cn";

const MEANING = {
  penumbral:
    "The Moon passes through Earth's faint outer shadow. Its surface dims subtly; no dark bite appears.",
  partial:
    "Part of the Moon enters Earth's dark central shadow, the umbra. A curved dark bite crosses the disc.",
  total:
    "The whole Moon enters the umbra. Sunlight filtered through Earth's atmosphere can turn it copper or red.",
};

export default function LunarEclipseDemo() {
  const [place, setPlace] = useLocation();
  const [kind, setKind] = useState<keyof typeof MEANING>("total");
  const [progress, setProgress] = useState(500);
  const clip = useId();
  const examples = useMemo(
    () =>
      lunarEclipses(
        new Date("2026-01-01T00:00:00Z"),
        new Date("2028-01-01T00:00:00Z"),
      ),
    [],
  );
  const eclipse = examples.find((e) => e.kind === kind)!;
  const observer = useMemo(() => toObserver(place), [place]);
  const visibility = useMemo(
    () => lunarEclipseVisibility(eclipse, observer),
    [eclipse, observer],
  );
  const duration = eclipse.p4.getTime() - eclipse.p1.getTime();
  const instant = new Date(eclipse.p1.getTime() + (duration * progress) / 1000);
  const shade = eclipseShade(instant, eclipse);
  const coverage = eclipseCoverage(instant, eclipse);
  const altitude = moonAltAz(instant, observer).altDeg;
  const goTo = (time: Date) =>
    setProgress(((time.getTime() - eclipse.p1.getTime()) / duration) * 1000);
  return (
    <div className="space-y-5">
      <LocationPicker place={place} onChange={setPlace} />
      <div className="flex flex-wrap gap-2">
        {(["penumbral", "partial", "total"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => {
              setKind(value);
              setProgress(500);
            }}
            className={cn(
              "btn",
              kind === value ? "btn-primary" : "btn-secondary",
            )}
          >
            {KIND_LABEL[value]}
          </button>
        ))}
      </div>
      <p>{MEANING[kind]}</p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <svg
            viewBox="0 0 320 280"
            className="bg-navy-950 block w-full rounded-xl"
            role="img"
            aria-label={`${KIND_LABEL[kind]} lunar eclipse: schematic Moon during the selected phase`}
          >
            <defs>
              <clipPath id={clip}>
                <circle cx="160" cy="140" r="90" />
              </clipPath>
            </defs>
            <circle cx="160" cy="140" r="90" fill="#f4f4ef" />
            {kind === "penumbral" ? (
              <circle cx="160" cy="140" r="90" fill="#334155" opacity={shade} />
            ) : (
              <circle
                cx={160 + 180 * (1 - coverage)}
                cy="140"
                r="90"
                fill={kind === "total" ? "#8a3b22" : "#252337"}
                clipPath={`url(#${clip})`}
              />
            )}
          </svg>
          <label className="block space-y-2 font-medium">
            Eclipse time
            <input
              type="range"
              min="0"
              max="1000"
              step="1"
              aria-label="Eclipse time"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="block w-full accent-(--accent)"
            />
          </label>
          <p className="text-sm tabular-nums">
            <DateTime
              datetime={instant}
              timeZone={place.tz}
              locale="en-GB"
              month="short"
              day="numeric"
              hour="2-digit"
              minute="2-digit"
              timeZoneName="short"
            />{" "}
            · Moon {Math.abs(altitude).toFixed(1)}°{" "}
            {altitude >= 0 ? "above" : "below"} your horizon.
          </p>
          <p className="text-xs text-(--text-secondary)">
            Shadow shape and color are illustrative, not a prediction of the
            Moon's exact appearance. Contact times come from Almanac. The Moon
            stays visible in this illustration even when below your horizon.
          </p>
        </div>
        <EclipseCard
          heading={`${KIND_LABEL[kind]} example`}
          eclipse={eclipse}
          visibility={visibility}
          tz={place.tz}
          onGoTo={goTo}
        />
      </div>
      <p className="text-sm text-(--text-secondary)">
        A lunar eclipse happens at the same instant worldwide. Location changes
        which stages are above your horizon and their local clock times.
        Visibility excludes weather and terrain.
      </p>
    </div>
  );
}
