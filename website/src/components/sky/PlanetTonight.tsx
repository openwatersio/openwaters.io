import { useMemo, useState } from "react";
import { planetAltAz, planetIllumination } from "@openwaters/almanac";
import { DateTime } from "../DateTime";
import { LocationPicker, toObserver, useLocation } from "./LocationPicker";
import { PLANETS, planetNight } from "./planetData";

const clock = { hour: "2-digit", minute: "2-digit" } as const;
const y = (altitude: number) => 260 - altitude * 2.3;
export default function PlanetTonight() {
  const [place, setPlace] = useLocation();
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: place.tz }).format(new Date()),
  );
  const [selected, setSelected] = useState(2);
  const [progress, setProgress] = useState(35);
  const night = useMemo(() => {
    try {
      return { data: planetNight(date, place), error: "" };
    } catch {
      return {
        data: null,
        error: "Choose a valid date from 1951 through 2099.",
      };
    }
  }, [date, place]);
  const data = night.data;
  const time =
    data &&
    new Date(
      data.start.getTime() +
        ((data.end.getTime() - data.start.getTime()) * progress) / 100,
    );
  const planet = PLANETS[selected]!;
  const position = time && planetAltAz(planet.id, time, toObserver(place));
  const illumination = time && planetIllumination(planet.id, time);
  return (
    <div className="space-y-5">
      <LocationPicker place={place} onChange={setPlace} />
      <label className="flex items-center gap-3 font-medium">
        Evening date
        <input
          type="date"
          min="1951-01-01"
          max="2099-12-30"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-canvas rounded-lg border px-3 py-2"
        />
      </label>
      {night.error && <p role="alert">{night.error}</p>}
      {data && time && position && illumination && (
        <>
          {data.polar && <p className="text-fg-muted">{data.polar}</p>}
          <div className="border-line overflow-hidden rounded-xl border">
            <svg
              viewBox="0 0 760 340"
              role="img"
              aria-label="Planet altitude through the night. Select a planet below for its position and rise and set times."
              className="block w-full"
            >
              {data.samples.slice(0, -1).map((s, i) => (
                <rect
                  key={i}
                  x={55 + (i * 680) / 144}
                  y="20"
                  width={680 / 144 + 0.5}
                  height="280"
                  fill={
                    s.sun > -6
                      ? "#344654"
                      : s.sun > -12
                        ? "#202d44"
                        : s.sun > -18
                          ? "#151e34"
                          : "#0b1220"
                  }
                />
              ))}
              {[0, 30, 60, 90].map((a) => (
                <g key={a}>
                  <line
                    x1="55"
                    x2="735"
                    y1={y(a)}
                    y2={y(a)}
                    stroke="white"
                    strokeOpacity={a === 0 ? 0.5 : 0.12}
                  />
                  <text
                    x="45"
                    y={y(a) + 5}
                    textAnchor="end"
                    fill="#c4c8d0"
                    fontSize="14"
                  >
                    {a}°
                  </text>
                </g>
              ))}
              {PLANETS.map((p, index) => (
                <path
                  key={p.id}
                  d={data.samples
                    .map(
                      (s, i) =>
                        `${i ? "L" : "M"}${55 + (i * 680) / 144},${y(Math.max(-17, s.altitudes[index]!))}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={selected === index ? 3 : 1.5}
                  opacity={selected === index ? 1 : 0.45}
                />
              ))}
              <line
                x1={55 + progress * 6.8}
                x2={55 + progress * 6.8}
                y1="20"
                y2="300"
                stroke="white"
                strokeDasharray="4 5"
                opacity=".65"
              />
              <circle
                cx={55 + progress * 6.8}
                cy={y(Math.max(-17, position.altDeg))}
                r="5"
                fill={planet.color}
              />
              <text x="55" y="326" fill="#c4c8d0" fontSize="14">
                {data.start.toLocaleTimeString([], {
                  timeZone: place.tz,
                  ...clock,
                })}
              </text>
              <text
                x="735"
                y="326"
                textAnchor="end"
                fill="#c4c8d0"
                fontSize="14"
              >
                {data.end.toLocaleTimeString([], {
                  timeZone: place.tz,
                  ...clock,
                })}
              </text>
            </svg>
          </div>
          <p className="text-fg-muted text-sm">
            The horizontal line is the horizon. Background shading follows
            twilight; tracks below −17° are clipped. Being above the horizon
            does not guarantee visibility.
          </p>
          <div className="flex flex-wrap gap-2">
            {PLANETS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={selected === i}
                onClick={() => setSelected(i)}
                className={
                  selected === i ? "btn btn-primary" : "btn btn-secondary"
                }
              >
                <svg width="10" height="10" aria-hidden="true">
                  <circle cx="5" cy="5" r="4" fill={p.color} />
                </svg>
                {p.name}
              </button>
            ))}
          </div>
          <label className="block space-y-2">
            <span className="font-semibold">
              <DateTime
                datetime={time}
                timeZone={place.tz}
                month="short"
                day="numeric"
                {...clock}
                timeZoneName="short"
              />
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              aria-label="Time through the night"
              className="accent-accent block w-full"
            />
          </label>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-fg-muted">{planet.name} altitude</dt>
              <dd>
                {Math.round(position.altDeg)}°{" "}
                {position.altDeg < 0 && "(below horizon)"}
              </dd>
            </div>
            <div>
              <dt className="text-fg-muted">Direction</dt>
              <dd>
                {
                  ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
                    Math.round(position.azDeg / 45) % 8
                  ]
                }{" "}
                · {Math.round(position.azDeg)}°
              </dd>
            </div>
            <div>
              <dt className="text-fg-muted">Approx. magnitude</dt>
              <dd>{illumination.magnitude.toFixed(1)}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Rise / set in this window</dt>
              <dd>
                {(["rise", "set"] as const).map((kind, i) => {
                  const event = data.events[selected]!.find(
                    (e) => e.kind === kind,
                  );
                  return (
                    <span key={kind}>
                      {i > 0 && " / "}
                      {event ? (
                        <DateTime
                          datetime={event.time}
                          timeZone={place.tz}
                          {...clock}
                        />
                      ) : (
                        "—"
                      )}
                    </span>
                  );
                })}
              </dd>
            </div>
          </dl>
        </>
      )}
    </div>
  );
}
