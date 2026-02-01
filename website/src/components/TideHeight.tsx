interface TideHeightProps {
  value: number; // Height in meters
  precision?: number;
}

const IMPERIAL_LOCALES = ["en-US", "en-LR", "my-MM"];

// Get user's preferred locale
const locale =
  typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";

/**
 * Detects if user's locale prefers imperial units
 * Returns true for US, Liberia, and Myanmar
 */
function usesImperialUnits(locale: string): boolean {
  const localeBase = locale.split("-")[0];
  return (
    IMPERIAL_LOCALES.some((l) => l.startsWith(localeBase)) || locale === "en-US"
  );
}

/**
 * Converts meters to feet
 */
function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

/**
 * Client-side tide height formatter
 * Shows feet for US locale, meters for others
 */
export function TideHeight({ value, precision = 1 }: TideHeightProps) {
  const useImperial = usesImperialUnits(locale);
  const displayValue = useImperial ? metersToFeet(value) : value;
  const unit = useImperial ? "ft" : "m";

  return (
    <span className="tabular-nums">
      {displayValue.toFixed(precision)}
      <span className="text-[0.8em]"> {unit}</span>
    </span>
  );
}
