import { useMemo } from "react";
import type { Station } from "@neaps/tide-database";
import { Temporal } from "@js-temporal/polyfill";
import { useNeapsAPI } from "../../utils/useNeapsAPI";
import type { ExtremesResponse, TimelineResponse } from "../../utils/tides";
import { preferredUnits } from "../../utils/units";
import Today from "./Today";
import { TideGraph } from "./TideGraph";

interface Props {
  station: Station;
}

export function TideStation({ station }: Props) {
  // Compute a single date range that covers both components:
  // - Today needs extremes from -6.5h to +18.5h
  // - TideGraph needs data from now to +3 days
  // Combined: -6.5h to +3 days
  const { startDate, endDate } = useMemo(() => {
    const start = Temporal.Now.zonedDateTimeISO(station.timezone).subtract({
      hours: 6,
      minutes: 30,
    });
    const end = Temporal.Now.zonedDateTimeISO(station.timezone).add({
      days: 3,
    });
    return {
      startDate: start.toInstant().toString(),
      endDate: end.toInstant().toString(),
    };
  }, [station.timezone]);

  const { data: extremesData, loading } = useNeapsAPI<ExtremesResponse>(
    `/tides/stations/${station.id}/extremes`,
    { start: startDate, end: endDate, units: preferredUnits },
  );

  const { data: timelineData } = useNeapsAPI<TimelineResponse>(
    `/tides/stations/${station.id}/timeline`,
    { start: startDate, end: endDate, units: preferredUnits },
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-navy-600">Loading tide data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Today
        station={station}
        extremesData={extremesData}
        timelineData={timelineData}
      />
      <TideGraph
        station={station}
        extremesData={extremesData}
        timelineData={timelineData}
      />
    </div>
  );
}
