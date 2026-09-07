import { useRef, useState } from "react";

export const PLACES = [
  { label: "Salish Sea", lat: 48.5, lon: -123, tz: "America/Vancouver" },
  { label: "Tromsø, Norway", lat: 69.65, lon: 18.96, tz: "Europe/Oslo" },
  {
    label: "Sydney, Australia",
    lat: -33.87,
    lon: 151.21,
    tz: "Australia/Sydney",
  },
];
export type Place = (typeof PLACES)[number];
export const toObserver = (place: Place) => ({
  latitudeDeg: place.lat,
  longitudeDeg: place.lon,
});
export const useLocation = () => useState(PLACES[0]!);

export function LocationPicker({
  place,
  onChange,
}: {
  place: Place;
  onChange: (place: Place) => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  const selected = PLACES.findIndex((preset) => preset === place);
  const locate = () => {
    setError("");
    if (!navigator.geolocation) {
      setError(
        "Location is unavailable in this browser. Choose a place instead.",
      );
      return;
    }
    const current = ++request.current;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (current !== request.current) return;
        setLoading(false);
        if (
          !Number.isFinite(coords.latitude) ||
          !Number.isFinite(coords.longitude) ||
          Math.abs(coords.latitude) > 90 ||
          Math.abs(coords.longitude) > 180
        ) {
          setError("Couldn't read your location. Choose a place instead.");
          return;
        }
        onChange({
          label: "Your location",
          lat: coords.latitude,
          lon: coords.longitude,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      },
      () => {
        if (current !== request.current) return;
        setLoading(false);
        setError(
          "Couldn't access your location. Allow location access or choose a place below.",
        );
      },
      { timeout: 10000 },
    );
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-medium">
          Location
          <select
            className="max-w-full rounded-lg border bg-(--surface) px-3 py-2"
            value={selected < 0 ? "device" : selected}
            onChange={(e) => {
              ++request.current;
              setLoading(false);
              setError("");
              const next = PLACES[Number(e.target.value)];
              if (next) onChange(next);
            }}
          >
            {PLACES.map((preset, i) => (
              <option key={preset.label} value={i}>
                {preset.label}
              </option>
            ))}
            {selected < 0 && <option value="device">Your location</option>}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-secondary text-sm"
          disabled={loading}
          onClick={locate}
        >
          {loading ? "Locating…" : "Use my location"}
        </button>
      </div>
      <p className="text-xs text-(--text-secondary)">
        Your location stays in this browser tab. We don't send it to our servers
        or store it.
      </p>
      {error && (
        <p role="alert" className="text-sm text-(--status-red-text)">
          {error}
        </p>
      )}
    </div>
  );
}
