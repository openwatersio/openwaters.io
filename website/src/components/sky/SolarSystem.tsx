import { useEffect, useState } from "react";
import { solarSystemPositions, SOLAR_PLANETS } from "./solarSystemData";

const START = Date.UTC(2026, 0, 1);
const END = Date.UTC(2056, 0, 1);
const DAY_MS = 86400000;
const DAYS = (END - START) / DAY_MS;
const PARADES = [
  {
    date: "2026-02-28",
    label: "Feb 28, 2026 · evening",
    planets:
      "Mercury, Venus, Jupiter, and Saturn; Uranus and Neptune are also part of this parade.",
    source:
      "https://www.nasa.gov/blogs/watch-the-skies/2026/01/16/most-notable-2026-astronomical-events-a-year-of-watching-the-skies/",
  },
  {
    date: "2026-08-12",
    label: "Aug 12, 2026 · morning",
    planets:
      "Mercury, Mars, Jupiter, and Saturn; Uranus and Neptune are also part of this parade.",
    source: "https://starwalk.space/en/news/planetary-alignment-august-12-2026",
  },
  {
    date: "2026-11-14",
    label: "Nov 14, 2026 · morning",
    planets: "Mercury, Venus, Mars, and Jupiter.",
    source: "https://starwalk.space/en/news/what-is-planet-parade",
  },
];

export default function SolarSystem() {
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      previous: number | undefined;
    const step = (now: number) => {
      if (previous !== undefined)
        setDay(
          (value) =>
            (value + (Math.min(now - previous!, 100) * 365.25) / 10000) % DAYS,
        );
      previous = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  const time = new Date(START + day * DAY_MS);
  const positions = solarSystemPositions(time);
  const parade = PARADES.find(
    (p) => p.date === time.toISOString().slice(0, 10),
  );
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="font-medium">Jump to a planet parade</p>
        <div className="flex flex-wrap gap-2">
          {PARADES.map((p) => (
            <button
              key={p.date}
              type="button"
              aria-pressed={parade === p}
              className={parade === p ? "btn btn-primary" : "btn btn-secondary"}
              onClick={() => {
                setPlaying(false);
                setDay((Date.parse(`${p.date}T00:00:00Z`) - START) / DAY_MS);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-fg-muted text-sm">
          A planet parade is several planets sharing Earth's morning or evening
          sky. These dates show their orbital arrangement from above; the
          planets do not need to form a straight line in space. Local viewing
          dates and times vary.
        </p>
        {parade && (
          <p className="text-fg-muted text-sm" role="status">
            {parade.planets} Uranus and Neptune are not drawn in this demo.{" "}
            <a href={parade.source} className="text-accent hover:underline">
              Viewing guide
            </a>
            .
          </p>
        )}
      </div>
      <svg
        viewBox="0 0 660 660"
        role="img"
        aria-label={`Solar system on ${time.toISOString().slice(0, 10)}. Mercury, Venus, Earth, Mars, Jupiter, and Saturn orbit the Sun at different rates. Orbit spacing and body sizes are schematic.`}
        className="border-line mx-auto block w-full max-w-2xl rounded-xl border"
      >
        {SOLAR_PLANETS.map((p) => (
          <circle
            key={p.id}
            cx="330"
            cy="330"
            r={p.radius}
            fill="none"
            stroke="white"
            strokeOpacity=".13"
          />
        ))}
        <circle cx="330" cy="330" r="15" fill="#f3d68a" />
        <text x="330" y="334" textAnchor="middle" fill="#17212d" fontSize="11">
          Sun
        </text>
        {positions.map((p) => (
          <g key={p.id}>
            {p.id === "saturn" && (
              <ellipse
                cx={330 + p.x}
                cy={330 - p.y}
                rx="15"
                ry="5"
                fill="none"
                stroke={p.color}
                strokeWidth="2"
                transform={`rotate(-25 ${330 + p.x} ${330 - p.y})`}
              />
            )}
            <circle
              cx={330 + p.x}
              cy={330 - p.y}
              r={p.id === "jupiter" ? 10 : p.id === "saturn" ? 8 : 5}
              fill={p.color}
            />
            <text
              x={330 + p.x}
              y={330 - p.y + (p.y >= 0 ? -18 : 26)}
              textAnchor="middle"
              fill={p.color}
              fontSize="15"
            >
              {p.name}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (!playing && day >= DAYS) setDay(0);
              setPlaying(!playing);
            }}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setPlaying(false);
              setDay(0);
            }}
          >
            Reset
          </button>
        </div>
        <span className="font-semibold tabular-nums">
          {time.toLocaleDateString([], {
            timeZone: "UTC",
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
      <label className="block">
        <span className="sr-only">Solar system date, 2026 through 2056</span>
        <input
          type="range"
          min="0"
          max={DAYS}
          step="0.1"
          value={day}
          onChange={(e) => {
            setPlaying(false);
            setDay(Number(e.target.value));
          }}
          className="accent-accent block w-full"
        />
      </label>
      <div className="text-fg-muted flex justify-between text-sm">
        <span>2026</span>
        <span>2056</span>
      </div>
      <p className="text-fg-muted text-sm">
        Look down on the solar system from north of its orbital plane. The dates
        and orbital directions come from Almanac; orbit spacing and body sizes
        are schematic so the inner planets stay readable. Playback advances one
        year every ten seconds. Mercury laps the Sun many times while Saturn
        takes almost thirty years to circle once.
      </p>
      <dl className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {positions.map((p) => (
          <div key={p.id}>
            <dt className="font-medium">{p.name}</dt>
            <dd className="text-fg-muted text-sm tabular-nums">
              {p.distanceAu.toFixed(2)} AU
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
