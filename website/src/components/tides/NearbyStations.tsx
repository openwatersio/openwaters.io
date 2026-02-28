import { useRef, useCallback } from "react";
import {
  NeapsProvider,
  StationsMap,
  NearbyStations,
  type StationSummary,
} from "@neaps/react";
import type { MapRef } from "react-map-gl/maplibre";
import "@neaps/react/styles.css";
import { API_HOST } from "../../utils/constants";
import { preferredUnits } from "../../utils/units";

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

interface Props {
  stationId: string;
  latitude: number;
  longitude: number;
}

export function NearbyStationsIsland({
  stationId,
  latitude,
  longitude,
}: Props) {
  const mapRef = useRef<MapRef>(null);

  const handleStationSelect = useCallback((station: StationSummary) => {
    window.location.href = `/tides/stations/${station.id}`;
  }, []);

  const handleHover = useCallback((station: StationSummary) => {
    mapRef.current?.panTo([station.longitude, station.latitude]);
  }, []);

  const handleHoverEnd = useCallback(() => {
    mapRef.current?.panTo([longitude, latitude]);
  }, [longitude, latitude]);

  return (
    <NeapsProvider baseUrl={API_HOST} units={preferredUnits}>
      <div className="flex flex-col gap-4">
        <StationsMap
          ref={mapRef}
          mapStyle={MAP_STYLE}
          initialViewState={{
            longitude,
            latitude,
            zoom: 11,
          }}
          focusStation={stationId}
          clustering={false}
          showGeolocation={false}
          popupContent="simple"
          onStationSelect={handleStationSelect}
          className="border-navy-200 aspect-video w-full overflow-hidden rounded-lg border"
        />
        <NearbyStations
          stationId={stationId}
          onStationSelect={handleStationSelect}
          onHover={handleHover}
          onHoverEnd={handleHoverEnd}
        />
      </div>
    </NeapsProvider>
  );
}
