import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { stationsNear } from "neaps";
import type { Station } from "@neaps/tide-database";

interface Props {
  station: Station;
}

interface NearbyStationWithDistance extends Station {
  distance?: number;
}

export function StationMap({ station }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [nearbyStations, setNearbyStations] = useState<
    NearbyStationWithDistance[]
  >([]);
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);

  useEffect(() => {
    // Get nearby stations
    const nearby = stationsNear(station);
    setNearbyStations(nearby as NearbyStationWithDistance[]);
  }, [station]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      center: [station.longitude, station.latitude],
      zoom: 11,
      attributionControl: false,
    });

    // Add a circle source to show the current station area
    map.current.on("load", () => {
      if (!map.current) return;

      // Add marker for current station
      const currentPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 15,
      }).setHTML(
        `<strong>${station.name}</strong><br/><span class="text-xs text-navy-600">Current Station</span>`,
      );

      const currentMarker = new maplibregl.Marker({ color: "#0ea5e9" })
        .setLngLat([station.longitude, station.latitude])
        .addTo(map.current);

      const currentMarkerElement = currentMarker.getElement();
      currentMarkerElement.style.cursor = "pointer";

      currentMarkerElement.addEventListener("mouseenter", () => {
        currentPopup
          .setLngLat([station.longitude, station.latitude])
          .addTo(map.current!);
      });
      currentMarkerElement.addEventListener("mouseleave", () => {
        currentPopup.remove();
      });
    });

    // Add markers for nearby stations
    nearbyStations.forEach((nearby) => {
      if (map.current) {
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 15,
        }).setHTML(
          `<strong>${nearby.name}</strong><br/>Distance: ${(nearby.distance || 0).toFixed(1)} km`,
        );

        const marker = new maplibregl.Marker({ color: "#075985" })
          .setLngLat([nearby.longitude, nearby.latitude])
          .addTo(map.current);

        // Store marker reference
        markers.current.set(nearby.id, marker);

        const markerElement = marker.getElement();
        markerElement.style.cursor = "pointer";

        // Show popup on hover
        markerElement.addEventListener("mouseenter", () => {
          popup
            .setLngLat([nearby.longitude, nearby.latitude])
            .addTo(map.current!);
        });
        markerElement.addEventListener("mouseleave", () => {
          popup.remove();
        });

        // Navigate on click
        markerElement.addEventListener("click", () => {
          window.location.href = `/tides/stations/${nearby.id}`;
        });
      }
    });

    return () => {
      markers.current.clear();
      map.current?.remove();
    };
  }, [station, nearbyStations]);

  // Handle map panning when hovering list items
  useEffect(() => {
    if (hoveredStationId) {
      const hoveredStation = nearbyStations.find(
        (s) => s.id === hoveredStationId,
      );
      if (hoveredStation && map.current) {
        map.current.panTo([hoveredStation.longitude, hoveredStation.latitude], {
          duration: 500,
        });
      }
    } else if (map.current) {
      map.current.panTo([station.longitude, station.latitude], {
        duration: 500,
      });
    }
  }, [hoveredStationId, nearbyStations, station]);

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={mapContainer}
        className="aspect-video w-full rounded-lg border border-navy-200"
      />

      <div className="space-y-2">
        <h6 className="font-semibold text-navy-900">Nearby Stations</h6>
        {nearbyStations.length > 0 ? (
          <div className="divide-y rounded-md border border-navy-200">
            {nearbyStations
              .filter((s) => s.id !== station.id)
              .map((nearby) => (
                <a
                  key={nearby.id}
                  href={`/tides/stations/${nearby.id}`}
                  className="flex flex-nowrap items-baseline gap-2 text-nowrap p-3 transition-colors hover:bg-ocean-50"
                  onMouseEnter={() => setHoveredStationId(nearby.id)}
                  onMouseLeave={() => setHoveredStationId(null)}
                >
                  <p className="flex-grow overflow-hidden text-ellipsis text-nowrap text-navy-900 hover:text-ocean-700">
                    {nearby.name}
                  </p>
                  <p className="w-10 text-right text-xs text-navy-600">
                    {(nearby.distance! / 1000 || 0).toFixed(1)} km
                  </p>
                </a>
              ))}
          </div>
        ) : (
          <p className="text-sm text-navy-600">No nearby stations found</p>
        )}
      </div>
    </div>
  );
}
