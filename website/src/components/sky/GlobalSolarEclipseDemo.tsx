import { useEffect, useMemo, useRef, useState } from "react";
import {
  globalSolarEclipses,
  solarEclipseCentralLine,
  type GlobalSolarEclipse,
  type SolarEclipseAxisPoint,
  type SolarEclipseKind,
} from "@openwaters/almanac";
import { Layer, Map, Marker, Source, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import { DateTime } from "../DateTime";
import { cn } from "../../utils/cn";
import { useMapStyle } from "../../utils/useMapStyle";
import {
  centralLineFeatures,
  formatLatitude,
  formatLongitude,
  nearestPointIndex,
  pathBounds,
  unwrapLongitudes,
} from "./globalEclipse";

const KIND_LABEL: Record<SolarEclipseKind, string> = {
  partial: "Partial",
  annular: "Annular",
  total: "Total",
};
const LINE_COLOR = { total: "#f7c66b", annular: "#f08a4b" } as const;
const WHOLE_EARTH = { longitude: 0, latitude: 20, zoom: 0.8 };

const formatDuration = (ms: number) => {
  const minutes = Math.round(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
};

function EclipseCard({
  eclipse,
  line,
}: {
  eclipse: GlobalSolarEclipse;
  line: SolarEclipseAxisPoint[];
}) {
  const first = line[0];
  const last = line.at(-1);
  return (
    <div className="card space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold">Solar eclipse on Earth</h3>
        <span className="bg-accent/15 text-accent rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          {KIND_LABEL[eclipse.kind]}
        </span>
      </div>
      <div>
        <div className="text-2xl font-semibold">
          <DateTime
            datetime={eclipse.peak}
            timeZone="UTC"
            month="long"
            day="numeric"
            year="numeric"
          />
        </div>
        <div className="text-fg-muted">
          Greatest eclipse at{" "}
          <DateTime
            datetime={eclipse.peak}
            timeZone="UTC"
            hour="2-digit"
            minute="2-digit"
            timeZoneName="short"
          />
        </div>
      </div>
      {eclipse.kind === "partial" ? (
        <p className="bg-surface text-fg-muted rounded-lg px-3 py-2 text-sm">
          Partial everywhere it is seen. The axis of the Moon's shadow passes
          outside the Earth, so no one stands in the full shadow and there is no
          central line: only the Moon's outer shadow, the penumbra, reaches the
          ground, at high latitudes and with the Sun low.
        </p>
      ) : null}
      <dl>
        {eclipse.latitudeDeg !== null && eclipse.longitudeDeg !== null ? (
          <>
            <dt>Greatest eclipse over</dt>
            <dd className="text-right tabular-nums">
              {formatLatitude(eclipse.latitudeDeg)},{" "}
              {formatLongitude(eclipse.longitudeDeg)}
            </dd>
          </>
        ) : null}
        {eclipse.obscuration !== null ? (
          <>
            <dt>Sun covered there</dt>
            <dd className="text-right tabular-nums">
              {(eclipse.obscuration * 100).toFixed(1)}%
            </dd>
          </>
        ) : null}
        {first && last ? (
          <>
            <dt>Shadow axis on Earth</dt>
            <dd className="text-right whitespace-nowrap tabular-nums">
              <DateTime
                datetime={first.time}
                timeZone="UTC"
                hour="2-digit"
                minute="2-digit"
              />
              –
              <DateTime
                datetime={last.time}
                timeZone="UTC"
                hour="2-digit"
                minute="2-digit"
              />{" "}
              UTC
            </dd>
            <dt>Crossing time</dt>
            <dd className="text-right tabular-nums">
              {formatDuration(last.time.getTime() - first.time.getTime())}
            </dd>
          </>
        ) : null}
        <dt className={cn(first && "border-line mt-1 border-t pt-1")}>
          Shadow axis from Earth's center
        </dt>
        <dd
          className={cn(
            "text-right tabular-nums",
            first && "border-line mt-1 border-t pt-1",
          )}
        >
          {Math.round(eclipse.axisDistanceKm).toLocaleString("en-US")} km
        </dd>
      </dl>
    </div>
  );
}

export default function GlobalSolarEclipseDemo() {
  const mapStyle = useMapStyle();
  const mapRef = useRef<MapRef>(null);
  const [start] = useState(() => new Date());
  const eclipses = useMemo(() => {
    const end = new Date(start);
    end.setUTCFullYear(end.getUTCFullYear() + 10);
    return globalSolarEclipses(start, end);
  }, [start]);
  const [selectedPeak, setSelectedPeak] = useState<number>();
  const eclipse =
    eclipses.find(({ peak }) => peak.getTime() === selectedPeak) ?? eclipses[0];
  const line = useMemo(
    () => (eclipse ? solarEclipseCentralLine(eclipse.peak) : []),
    [eclipse],
  );
  const longitudes = useMemo(() => unwrapLongitudes(line), [line]);
  const [index, setIndex] = useState<number>();
  const peakIndex = eclipse ? nearestPointIndex(line, eclipse.peak) : -1;
  const current = line[index ?? peakIndex];
  const currentLongitude = longitudes[index ?? peakIndex];

  // The first line frames the initial view; later selections fly to theirs.
  const [initialViewState] = useState(() => {
    const bounds = pathBounds(line);
    return bounds ? { bounds, fitBoundsOptions: { padding: 48 } } : WHOLE_EARTH;
  });
  const framed = useRef(line);
  useEffect(() => {
    if (framed.current === line) return;
    framed.current = line;
    const bounds = pathBounds(line);
    if (bounds) {
      mapRef.current?.fitBounds(bounds, { padding: 48, duration: 800 });
    } else {
      mapRef.current?.flyTo({
        center: [WHOLE_EARTH.longitude, WHOLE_EARTH.latitude],
        zoom: WHOLE_EARTH.zoom,
        duration: 800,
      });
    }
  }, [line]);

  if (!eclipse) return null;

  return (
    <div className="space-y-5">
      <div
        className="flex flex-wrap gap-2"
        aria-label="Solar eclipses on Earth"
      >
        {eclipses.map((event) => (
          <button
            key={event.peak.toISOString()}
            type="button"
            aria-pressed={event === eclipse}
            onClick={() => {
              setSelectedPeak(event.peak.getTime());
              setIndex(undefined);
            }}
            className={cn(
              "btn",
              event === eclipse ? "btn-primary" : "btn-secondary",
            )}
          >
            {KIND_LABEL[event.kind]} ·{" "}
            <DateTime
              datetime={event.peak}
              timeZone="UTC"
              month="short"
              day="numeric"
              year="numeric"
            />
          </button>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="border-line aspect-square overflow-hidden rounded-xl border">
            <Map
              ref={mapRef}
              mapStyle={mapStyle}
              projection="globe"
              initialViewState={initialViewState}
              attributionControl={{ compact: true }}
              style={{ width: "100%", height: "100%" }}
            >
              <Source
                id="central-line"
                type="geojson"
                data={centralLineFeatures(line, longitudes)}
              >
                <Layer
                  id="central-line"
                  type="line"
                  layout={{ "line-cap": "round", "line-join": "round" }}
                  paint={{
                    "line-width": 4,
                    "line-color": [
                      "match",
                      ["get", "kind"],
                      "total",
                      LINE_COLOR.total,
                      LINE_COLOR.annular,
                    ],
                  }}
                />
              </Source>
              {current && currentLongitude !== undefined ? (
                <Marker
                  longitude={currentLongitude}
                  latitude={current.latitudeDeg}
                >
                  <span className="bg-accent block size-4 rounded-full border-2 border-white shadow" />
                </Marker>
              ) : null}
            </Map>
          </div>
          {current ? (
            <>
              <label className="block space-y-2 font-medium">
                Shadow position
                <input
                  type="range"
                  min="0"
                  max={line.length - 1}
                  step="1"
                  aria-label="Time along the central line"
                  value={index ?? peakIndex}
                  onChange={(event) => setIndex(Number(event.target.value))}
                  className="accent-accent block w-full"
                />
              </label>
              <p className="text-sm tabular-nums">
                {KIND_LABEL[current.kind]} ·{" "}
                {(current.obscuration * 100).toFixed(1)}% covered ·{" "}
                {formatLatitude(current.latitudeDeg)},{" "}
                {formatLongitude(current.longitudeDeg)} ·{" "}
                <DateTime
                  datetime={current.time}
                  timeZone="UTC"
                  hour="2-digit"
                  minute="2-digit"
                  second="2-digit"
                  timeZoneName="short"
                />
              </p>
              <p className="text-fg-muted text-xs">
                The line is where the axis of the Moon's shadow meets the
                ground, one point a minute, colored by what a person standing
                there sees: gold for total, orange for annular.
              </p>
            </>
          ) : (
            <p className="text-fg-muted text-sm">
              No central line to draw: the Moon's shadow axis misses the Earth.
            </p>
          )}
        </div>
        <EclipseCard eclipse={eclipse} line={line} />
      </div>
    </div>
  );
}
