import { planetHeliocentricPosition } from "@openwaters/almanac";

export const SOLAR_PLANETS = [
  { id: "mercury", name: "Mercury", color: "#c4c8d0", radius: 55 },
  { id: "venus", name: "Venus", color: "#f3d68a", radius: 90 },
  { id: "earth", name: "Earth", color: "#87c9ed", radius: 125 },
  { id: "mars", name: "Mars", color: "#ff947d", radius: 165 },
  { id: "jupiter", name: "Jupiter", color: "#e5b88e", radius: 215 },
  { id: "saturn", name: "Saturn", color: "#b8a7ef", radius: 275 },
] as const;

export function solarSystemPositions(time: Date) {
  return SOLAR_PLANETS.map((planet) => {
    const p = planetHeliocentricPosition(planet.id, time);
    // Rotate fixed J2000 equatorial vectors into the top-down ecliptic view.
    const y =
      p.yAu * Math.cos((23.43928 * Math.PI) / 180) +
      p.zAu * Math.sin((23.43928 * Math.PI) / 180);
    const projectedRadius = Math.hypot(p.xAu, y);
    return {
      ...planet,
      x: (planet.radius * p.xAu) / projectedRadius,
      y: (planet.radius * y) / projectedRadius,
      distanceAu: Math.hypot(p.xAu, p.yAu, p.zAu),
    };
  });
}
