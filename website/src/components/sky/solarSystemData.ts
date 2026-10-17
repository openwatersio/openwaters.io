import { planetHeliocentricPosition } from "@openwaters/almanac";

export const SOLAR_PLANETS = [
  // Even spacing, not to scale: true distances would leave the inner four in
  // a few pixels around the Sun on a phone, and a log scale still crowds
  // Venus, Earth and Mars together.
  { id: "mercury", name: "Mercury", color: "#c4c8d0", radius: 45, size: 5 },
  { id: "venus", name: "Venus", color: "#f3d68a", radius: 80, size: 5 },
  { id: "earth", name: "Earth", color: "#87c9ed", radius: 115, size: 5 },
  { id: "mars", name: "Mars", color: "#ff947d", radius: 150, size: 5 },
  { id: "jupiter", name: "Jupiter", color: "#e5b88e", radius: 190, size: 10 },
  { id: "saturn", name: "Saturn", color: "#b8a7ef", radius: 230, size: 8 },
  { id: "uranus", name: "Uranus", color: "#8fd9d2", radius: 270, size: 7 },
  { id: "neptune", name: "Neptune", color: "#7f9cf5", radius: 305, size: 7 },
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
