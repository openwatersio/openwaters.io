const IMPERIAL_LOCALES = ["en-US", "en-LR", "my-MM"];

const locale =
  typeof navigator !== "undefined" ? navigator.language : undefined;

function usesImperialUnits(locale: string | undefined): boolean {
  return !!locale && IMPERIAL_LOCALES.includes(locale);
}

const imperial = usesImperialUnits(locale);

const FEET_PER_METER = 3.28084;
const MILES_PER_METER = 0.000621371;

interface DistanceProps {
  meters: number;
  precision?: number;
}

export function Distance({ meters, precision }: DistanceProps) {
  let value: number;
  let unit: string;

  if (imperial) {
    const miles = meters * MILES_PER_METER;
    if (miles >= 0.1) {
      value = miles;
      unit = "mi";
    } else {
      value = meters * FEET_PER_METER;
      unit = "ft";
    }
  } else {
    if (meters >= 1000) {
      value = meters / 1000;
      unit = "km";
    } else {
      value = meters;
      unit = "m";
    }
  }

  return (
    <span className="tabular-nums">
      {value.toFixed(precision ?? (value >= 5 ? 0 : 1))}
      <span className="text-[0.8em]"> {unit}</span>
    </span>
  );
}

export function TideHeight({
  value,
  precision = 1,
}: {
  value: number;
  precision?: number;
}) {
  return <Distance meters={value} precision={precision} />;
}
