/**
 * Sky gradient and star visibility as a function of the Sun's altitude.
 *
 * The breakpoints are the same ones Almanac uses for its twilight events
 * (0°, −6°, −12°, −18°), so the gradient can never disagree with the civil /
 * nautical / astronomical twilight times printed underneath it.
 */

interface Anchor {
  altDeg: number;
  top: string;
  bottom: string;
}

/** Descending by altitude; `skyColor` interpolates between neighbours. */
const ANCHORS: Anchor[] = [
  { altDeg: 10, top: "#2f7fd4", bottom: "#bde3fb" }, // full day
  { altDeg: 0, top: "#2b4a7a", bottom: "#f8a15f" }, // sunrise / sunset
  { altDeg: -6, top: "#17264a", bottom: "#8d4a63" }, // civil
  { altDeg: -12, top: "#0b1430", bottom: "#2a2a52" }, // nautical
  { altDeg: -18, top: "#04060f", bottom: "#0b1023" }, // astronomical → night
];

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  const part = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

export interface SkyPaint {
  top: string;
  bottom: string;
  /** 0 in daylight, 1 once the Sun is past astronomical twilight. */
  starOpacity: number;
}

export function skyColor(sunAltDeg: number): SkyPaint {
  const first = ANCHORS[0]!;
  const last = ANCHORS[ANCHORS.length - 1]!;

  let top = last.top;
  let bottom = last.bottom;

  if (sunAltDeg >= first.altDeg) {
    top = first.top;
    bottom = first.bottom;
  } else {
    for (let i = 0; i < ANCHORS.length - 1; i++) {
      const hi = ANCHORS[i]!;
      const lo = ANCHORS[i + 1]!;
      if (sunAltDeg <= hi.altDeg && sunAltDeg > lo.altDeg) {
        const t = (hi.altDeg - sunAltDeg) / (hi.altDeg - lo.altDeg);
        top = mix(hi.top, lo.top, t);
        bottom = mix(hi.bottom, lo.bottom, t);
        break;
      }
    }
  }

  // Stars come out through nautical twilight and are fully up by −18°.
  const starOpacity = Math.min(1, Math.max(0, (-6 - sunAltDeg) / 12));

  return { top, bottom, starOpacity };
}
