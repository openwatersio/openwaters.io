export type SolarKind = "partial" | "annular" | "total";
export type SolarContactKey = "c1" | "c2" | "peak" | "c3" | "c4";

export const solarEclipseInstant = (
  eclipse: { c1: Date; c4: Date },
  progress: number,
) =>
  new Date(
    eclipse.c1.getTime() +
      ((eclipse.c4.getTime() - eclipse.c1.getTime()) * progress) / 1000,
  );

export const solarContactRows = (
  kind: SolarKind,
): readonly (readonly [SolarContactKey, string])[] => [
  ["c1", "Partial begins"],
  ...(kind === "partial"
    ? []
    : ([
        ["c2", `${kind === "total" ? "Totality" : "Annularity"} begins`],
      ] as const)),
  ["peak", "Greatest eclipse"],
  ...(kind === "partial"
    ? []
    : ([
        ["c3", `${kind === "total" ? "Totality" : "Annularity"} ends`],
      ] as const)),
  ["c4", "Partial ends"],
];

export const solarEclipseWindowState = (eclipses: { kind: SolarKind }[]) =>
  eclipses.length === 0
    ? "none"
    : eclipses.some(({ kind }) => kind !== "partial")
      ? "featured"
      : "partial-only";
