import { useRef, useCallback, useMemo } from "react";
import {
  NeapsProvider,
  StationsMap,
  NearbyStations,
  createQueryClient,
  type StationSummary,
} from "@neaps/react";
import { hydrate, type DehydratedState } from "@tanstack/react-query";
import type { MapRef } from "react-map-gl/maplibre";
import "@neaps/react/styles.css";
import { API_HOST } from "../../utils/constants";
import { useMapStyle } from "../../utils/useMapStyle";

interface Props {
  stationId: string;
  latitude: number;
  longitude: number;
  dehydratedState?: DehydratedState;
}

export function NearbyStationsIsland({
  stationId,
  latitude,
  longitude,
  dehydratedState,
}: Props) {
  const queryClient = useMemo(() => {
    const client = createQueryClient();
    if (dehydratedState) {
      hydrate(client, dehydratedState);
    }
    return client;
  }, [dehydratedState]);

  const mapStyle = useMapStyle();
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
    <NeapsProvider baseUrl={API_HOST} queryClient={queryClient}>
      <div className="flex flex-col gap-4">
        <StationsMap
          ref={mapRef}
          mapStyle={mapStyle}
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
          className="aspect-video overflow-hidden rounded-lg border border-(--border)"
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
