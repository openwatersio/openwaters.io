import { useMemo, useState } from "react";
import { WANDER_EXAMPLES, wanderTrack } from "./planetData";

export default function PlanetWander() {
  const [planet, setPlanet] = useState<keyof typeof WANDER_EXAMPLES>("mars");
  const [day, setDay] = useState(90);
  const track = useMemo(() => wanderTrack(planet), [planet]);
  const point = track[Math.min(day, track.length - 1)]!;
  const bounds = useMemo(() => {
    let minRa = Infinity,
      maxRa = -Infinity,
      minDec = Infinity,
      maxDec = -Infinity,
      radius = 0;
    for (const p of track) {
      minRa = Math.min(minRa, p.ra);
      maxRa = Math.max(maxRa, p.ra);
      minDec = Math.min(minDec, p.dec);
      maxDec = Math.max(maxDec, p.dec);
      radius = Math.max(
        radius,
        Math.hypot(p.planet.xAu, p.planet.yAu, p.planet.zAu),
      );
    }
    return { minRa, maxRa, minDec, maxDec, radius };
  }, [track]);
  // Rotate the API's fixed J2000 equatorial vectors into the orbital diagram's ecliptic plane.
  const orbit = (p: typeof point.earth) => ({
    x: 180 + (p.xAu * 145) / bounds.radius,
    y:
      180 -
      ((p.yAu * Math.cos((23.43928 * Math.PI) / 180) +
        p.zAu * Math.sin((23.43928 * Math.PI) / 180)) *
        145) /
        bounds.radius,
  });
  const sky = (p: typeof point) => ({
    x: 330 - ((p.ra - bounds.minRa) / (bounds.maxRa - bounds.minRa)) * 290,
    y: 275 - ((p.dec - bounds.minDec) / (bounds.maxDec - bounds.minDec)) * 205,
  });
  const path = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const earth = orbit(point.earth),
    body = orbit(point.planet),
    apparent = sky(point);
  const retrograde =
    day > 0 && point.ra < track[Math.min(day, track.length - 1) - 1]!.ra;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {Object.entries(WANDER_EXAMPLES).map(([id, p]) => (
          <button
            type="button"
            key={id}
            aria-pressed={planet === id}
            className={planet === id ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => {
              setPlanet(id as keyof typeof WANDER_EXAMPLES);
              setDay(90);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <svg
          viewBox="0 0 360 360"
          role="img"
          aria-label={`Sun-centered orbital view of Earth and ${WANDER_EXAMPLES[planet].name}, with a line of sight from Earth.`}
          className="border-line w-full rounded-xl border"
        >
          <path
            d={path(track.map((p) => orbit(p.earth)))}
            fill="none"
            stroke="#87c9ed"
            strokeOpacity=".4"
          />
          <path
            d={path(track.map((p) => orbit(p.planet)))}
            fill="none"
            stroke="#ff947d"
            strokeOpacity=".4"
          />
          <line
            x1={earth.x}
            y1={earth.y}
            x2={body.x}
            y2={body.y}
            stroke="white"
            strokeDasharray="4 4"
            opacity=".6"
          />
          <circle cx="180" cy="180" r="8" fill="#f3d68a" />
          <text x="192" y="185" fill="#f3d68a" fontSize="13">
            Sun
          </text>
          <circle cx={earth.x} cy={earth.y} r="5" fill="#87c9ed" />
          <text
            x={earth.x}
            y={earth.y - 12}
            textAnchor="middle"
            fill="#87c9ed"
            fontSize="13"
          >
            Earth
          </text>
          <circle cx={body.x} cy={body.y} r="6" fill="#ff947d" />
          <text
            x={body.x}
            y={body.y - 12}
            textAnchor="middle"
            fill="#ff947d"
            fontSize="13"
          >
            {WANDER_EXAMPLES[planet].name}
          </text>
          <text x="18" y="337" fill="#c4c8d0" fontSize="12">
            Sun-centered · radius {bounds.radius.toFixed(1)} AU
          </text>
        </svg>
        <svg
          viewBox="0 0 360 360"
          role="img"
          aria-label={`${WANDER_EXAMPLES[planet].name}'s apparent track in right ascension and declination. ${retrograde ? "Moving westward: retrograde." : "Moving eastward."}`}
          className="border-line w-full rounded-xl border"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line
                x1="40"
                x2="330"
                y1={70 + t * 205}
                y2={70 + t * 205}
                stroke="white"
                strokeOpacity=".1"
              />
              <text
                x="32"
                y={75 + t * 205}
                textAnchor="end"
                fill="#c4c8d0"
                fontSize="11"
              >
                {(bounds.maxDec - t * (bounds.maxDec - bounds.minDec)).toFixed(
                  0,
                )}
                °
              </text>
              <text
                x={40 + t * 290}
                y="297"
                textAnchor="middle"
                fill="#c4c8d0"
                fontSize="11"
              >
                {(bounds.maxRa - t * (bounds.maxRa - bounds.minRa)).toFixed(0)}°
              </text>
            </g>
          ))}
          <path
            d={path(track.map(sky))}
            fill="none"
            stroke="#ff947d"
            strokeOpacity=".3"
            strokeWidth="2"
          />
          <path
            d={path(track.slice(0, day + 1).map(sky))}
            fill="none"
            stroke="#ff947d"
            strokeWidth="2.5"
          />
          {track
            .filter((_, i) => i % 30 === 0)
            .map((p) => {
              const s = sky(p);
              return (
                <circle
                  key={p.time.getTime()}
                  cx={s.x}
                  cy={s.y}
                  r="3"
                  fill="#c4c8d0"
                />
              );
            })}
          <circle cx={apparent.x} cy={apparent.y} r="6" fill="#ff947d" />
          <text x="180" y="35" textAnchor="middle" fill="#c4c8d0" fontSize="14">
            Apparent path against the sky
          </text>
          <text
            x="180"
            y="321"
            textAnchor="middle"
            fill="#c4c8d0"
            fontSize="12"
          >
            East ← Right ascension → West
          </text>
          <text
            x="180"
            y="341"
            textAnchor="middle"
            fill="#c4c8d0"
            fontSize="12"
          >
            Vertical axis: declination · dots every 30 days
          </text>
        </svg>
      </div>
      <label className="block space-y-3">
        <span className="flex flex-wrap justify-between gap-2 font-semibold">
          <span>
            {point.time.toLocaleDateString([], {
              timeZone: "UTC",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span>
            {retrograde ? "Moving westward · retrograde" : "Moving eastward"}
          </span>
        </span>
        <input
          type="range"
          min="0"
          max={track.length - 1}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          aria-label="Date through the retrograde interval"
          className="accent-accent block w-full"
        />
      </label>
      <p className="text-fg-muted text-sm">
        Earth and the planet keep orbiting the Sun in the same direction. As
        Earth overtakes the outer planet, our changing line of sight makes it
        appear to move westward for a while. Distances use astronomical units (1
        AU is roughly the Earth–Sun distance); body markers are enlarged. The
        sky track uses equatorial coordinates, with east on the left.
      </p>
    </div>
  );
}
