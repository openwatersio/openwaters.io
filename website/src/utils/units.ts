const IMPERIAL_LOCALES = ["en-US", "en-LR", "my-MM"];

const locale =
  typeof navigator !== "undefined" ? navigator.language : undefined;

export const imperial = !!locale && IMPERIAL_LOCALES.includes(locale);
export const preferredUnits = imperial ? "feet" : "meters";
