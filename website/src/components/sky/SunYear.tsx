import { useMemo, useState } from "react";
import { sunYear } from "./demoData";
import { LocationPicker, useLocation, toObserver } from "./LocationPicker";
import { DateTime } from "../DateTime";

export default function SunYear() {
  const [place, setPlace] = useLocation();
  const [day, setDay] = useState(0);
  const points = useMemo(() => sunYear(toObserver(place)), [place]);
  const facing = place.lat < 0 ? 0 : 180;
  const offsets = points.map(
    (point) => ((point.azDeg - facing + 540) % 360) - 180,
  );
  const extent =
    offsets.reduce((max, value) => Math.max(max, Math.abs(value)), 10) + 2;
  const x = (i: number) => 70 + ((offsets[i]! + extent) / (extent * 2)) * 660;
  const y = (alt: number) => 310 - ((alt + 30) / 120) * 260;
  const selected = points[day]!;
  return (
    <div className="space-y-5">
      <LocationPicker place={place} onChange={setPlace} />
      <p className="text-sm text-(--text-secondary)">
        The Sun at the same UTC time every day in 2026, chosen near noon at this
        longitude. Earth's tilt and changing orbital speed trace this figure
        eight, called an analemma.
      </p>
      <svg
        viewBox="0 0 800 360"
        className="bg-navy-950 block w-full rounded-xl"
        role="img"
        aria-label={`Solar analemma over ${place.label}. Selected Sun altitude ${selected.altDeg.toFixed(1)} degrees, azimuth ${selected.azDeg.toFixed(1)} degrees.`}
      >
        {[-30, 0, 30, 60, 90].map((alt) => (
          <g key={alt}>
            <line
              x1="70"
              x2="730"
              y1={y(alt)}
              y2={y(alt)}
              stroke={alt === 0 ? "#94a3b8" : "#334155"}
              strokeDasharray={alt === 0 ? "5 5" : undefined}
            />
            <text
              x="58"
              y={y(alt) + 5}
              textAnchor="end"
              fill="#cbd5e1"
              fontSize="26"
              className="sm:text-base"
            >
              {alt}°
            </text>
          </g>
        ))}
        <text
          x="70"
          y="28"
          fill="#cbd5e1"
          fontSize="26"
          className="sm:text-base"
        >
          Altitude
        </text>
        <polyline
          points={points.map((p, i) => `${x(i)},${y(p.altDeg)}`).join(" ")}
          fill="none"
          stroke="#f7c66b"
          strokeWidth="2"
        />
        {points.map(
          (point, i) =>
            point.time.getUTCDate() === 15 && (
              <g key={i}>
                <circle cx={x(i)} cy={y(point.altDeg)} r="3" fill="#f7c66b">
                  <title>
                    {point.time.toLocaleDateString("en", {
                      month: "long",
                      timeZone: "UTC",
                    })}
                  </title>
                </circle>
              </g>
            ),
        )}
        <circle
          cx={x(day)}
          cy={y(selected.altDeg)}
          r="8"
          fill="#f7c66b"
          stroke="white"
          strokeWidth="2"
        />
        <text
          x="70"
          y="342"
          fill="#cbd5e1"
          fontSize="26"
          className="sm:text-base"
        >
          −{extent.toFixed(0)}°
        </text>
        <text
          x="400"
          y="342"
          textAnchor="middle"
          fill="#cbd5e1"
          fontSize="26"
          className="sm:text-base"
        >
          Azimuth relative to {facing === 0 ? "north" : "south"}
        </text>
        <text
          x="730"
          y="342"
          textAnchor="end"
          fill="#cbd5e1"
          fontSize="26"
          className="sm:text-base"
        >
          +{extent.toFixed(0)}°
        </text>
      </svg>
      <label className="block space-y-2 font-medium">
        Day of year ·{" "}
        <DateTime
          datetime={selected.time}
          timeZone={place.tz}
          locale="en-GB"
          month="long"
          day="numeric"
        />
        <input
          type="range"
          aria-label="Day of year"
          min="0"
          max={points.length - 1}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="block w-full accent-(--accent)"
        />
      </label>
      <p className="text-sm text-(--text-secondary) tabular-nums">
        Altitude {selected.altDeg.toFixed(1)}° · azimuth{" "}
        {selected.azDeg.toFixed(1)}° · sampled at{" "}
        <DateTime
          datetime={selected.time}
          locale="en-GB"
          timeZone="UTC"
          hour="2-digit"
          minute="2-digit"
        />{" "}
        UTC daily. Dashed line: horizon. Negative altitude means the Sun is
        below it.
      </p>
    </div>
  );
}
