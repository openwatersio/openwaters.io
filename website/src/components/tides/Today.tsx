import { DateTime } from "../DateTime";
import { TideHeight } from "../TideHeight";
import { useStation } from "neaps";
import type { Station } from "@neaps/tide-database";
import { Temporal } from "@js-temporal/polyfill";
import { cn } from "../../utils/cn";

// Format timezone name with UTC offset (e.g., "America/New_York" → "New York (UTC-5)")
function formatTimezoneWithOffset(timeZone: string) {
  // Get the UTC offset for this timezone
  const zoned = Temporal.Now.zonedDateTimeISO(timeZone);
  const offset = zoned.offset;

  // Format offset as +/-HH:MM
  const sign = offset.startsWith("-") ? "-" : "+";
  const formatted =
    sign +
    offset
      .slice(1)
      .split(":")
      .filter((n) => n && n !== "00")
      .join(":");

  return `${timeZone.replace("_", " ")} (UTC${formatted})`;
}

export type TodayProps = {
  station: Station;
  now?: Temporal.Instant;
};

export default function Today({
  station,
  now = Temporal.Now.instant(),
}: TodayProps) {
  const start = Temporal.Now.zonedDateTimeISO(station.timezone).subtract({
    hours: 6,
    minutes: 30,
  });
  const end = start.add({ hours: 25 });

  const predictor = useStation(station);
  const isReference = predictor.type === "reference";

  const today = predictor.getExtremesPrediction({
    start: new Date(start.toInstant().epochMilliseconds),
    end: new Date(end.toInstant().epochMilliseconds),
  });

  const nextTide = today.extremes?.find(
    (extreme) => extreme.time.valueOf() > now.epochMilliseconds,
  );

  const nowPrediction =
    isReference &&
    useStation(station).getWaterLevelAtTime({
      time: new Date(now.epochMilliseconds),
    });

  return (
    <div className="space-y-4 tabular-nums">
      <div className="grid grid-cols-2 items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Today's Tides</h2>
          <div className="text-xl">
            <DateTime
              datetime={start.toPlainDateTime().toString()}
              timeZone={station.timezone}
              dateStyle="medium"
            />
          </div>
          <div className="text-3xl">
            <DateTime
              datetime={new Date().toString()}
              timeZone={station.timezone}
              timeStyle="short"
            />
          </div>
          <div className="text-xs text-slate-400">
            {formatTimezoneWithOffset(station.timezone)}
          </div>
          <div className="mt-4 flex items-center gap-2 text-5xl font-semibold text-navy-900">
            {nextTide?.high ? (
              <span
                className="text-3xl font-bold text-green-700"
                aria-label="Rising"
              >
                &#8593;
              </span>
            ) : (
              <span
                className="text-3xl font-bold text-red-700"
                aria-label="Falling"
              >
                &#8595;
              </span>
            )}
            {nowPrediction && <TideHeight value={nowPrediction.level} />}
          </div>
          <div>{predictor.defaultDatum}</div>
        </div>
        {today.extremes && today.extremes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-200">
                  <th className="px-4 py-2 text-center font-semibold text-navy-900">
                    Time
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-navy-900">
                    Type
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-navy-900">
                    Height
                  </th>
                </tr>
              </thead>
              <tbody>
                {today.extremes.map((extreme) => (
                  <tr
                    className={cn({
                      "border-b border-navy-100 hover:bg-navy-50": true,
                      "text-navy-500":
                        extreme.time.valueOf() < now.epochMilliseconds,
                    })}
                    key={extreme.time.toISOString()}
                  >
                    <td className="px-4 py-2 text-right">
                      <DateTime
                        datetime={extreme.time.toISOString()}
                        timeZone={station.timezone}
                        timeStyle="short"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">{extreme.label}</td>
                    <td className="px-4 py-2 text-right">
                      <TideHeight value={extreme.level} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-navy-200 bg-navy-50 p-6 text-center">
            <p className="text-navy-600">No tide data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
