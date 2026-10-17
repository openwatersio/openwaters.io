// aiscast counts a station as active while it was heard less than five minutes
// ago (stationActive in ais/server/stats.go).
export const ACTIVE_S = 5 * 60;

export type StationStatus = {
  receiving: boolean;
  message: string;
};

// Matches formatAge on the station page the token page links to.
function ago(s: number) {
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86400)} days`;
}

// lastAgeS is null when /v1/stations/{id} answers 404. aiscast lists only the
// stations heard since it last started, so that means "no recent data", not
// "never sent any".
export function stationStatus(lastAgeS: number | null): StationStatus {
  if (lastAgeS === null)
    return {
      receiving: false,
      message: "No recent data sent with this token.",
    };
  if (
    typeof lastAgeS !== "number" ||
    !Number.isFinite(lastAgeS) ||
    lastAgeS < 0
  )
    return { receiving: false, message: "Couldn't check station status" };
  if (lastAgeS < ACTIVE_S)
    return { receiving: true, message: "Receiving data sent with this token" };
  return {
    receiving: false,
    message: `Not receiving. Last data sent with this token ${ago(lastAgeS)} ago.`,
  };
}
