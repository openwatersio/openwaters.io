import { useState, useCallback, useRef } from "react";
import {
  Map,
  Source,
  Layer,
  Popup,
  GeolocateControl,
  type MapMouseEvent,
  NavigationControl,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { stations } from "@neaps/tide-database";
import type { GeoJSONSource } from "maplibre-gl";
import { StationSearch } from "./StationSearch";

interface StationFeature {
  type: "Feature";
  properties: {
    id: string;
    name: string;
    type: string;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

// Component for the cluster layer
function ClusterLayer() {
  return (
    <>
      <Layer
        id="clusters"
        type="circle"
        source="stations"
        filter={["has", "point_count"]}
        paint={{
          "circle-color": "#0ea5e9",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            20,
            100,
            30,
            750,
            40,
          ],
          "circle-opacity": 0.7,
        }}
      />
      <Layer
        id="cluster-count"
        type="symbol"
        source="stations"
        filter={["has", "point_count"]}
        layout={{
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": 12,
        }}
        paint={{
          "text-color": "#ffffff",
        }}
      />
    </>
  );
}

// Component for individual station markers
function StationPointsLayer() {
  return (
    <Layer
      id="stations-point"
      type="circle"
      source="stations"
      filter={["!", ["has", "point_count"]]}
      paint={{
        "circle-color": [
          "match",
          ["get", "type"],
          "subordinate",
          "#facc15",
          "#0284c7",
        ],
        "circle-radius": 6,
        "circle-opacity": 0.8,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 1,
      }}
    />
  );
}

// Component for station popup
interface StationPopupProps {
  longitude: number;
  latitude: number;
  name: string;
  onClose: () => void;
}

function StationPopup({
  longitude,
  latitude,
  name,
  onClose,
}: StationPopupProps) {
  return (
    <Popup longitude={longitude} latitude={latitude} onClose={onClose}>
      <div className="text-sm font-semibold">{name}</div>
    </Popup>
  );
}

export function StationsMap() {
  const mapRef = useRef<any>(null);
  const [hoveredPopup, setHoveredPopup] = useState<{
    name: string;
    longitude: number;
    latitude: number;
  } | null>(null);
  const [cursor, setCursor] = useState<string>("auto");

  // Create GeoJSON features from stations
  const features: StationFeature[] = stations.map((station) => ({
    type: "Feature" as const,
    properties: {
      id: station.id,
      name: station.name,
      type: station.type || "reference",
    },
    geometry: {
      type: "Point" as const,
      coordinates: [station.longitude, station.latitude],
    },
  }));

  const geojsonData = {
    type: "FeatureCollection" as const,
    features,
  };

  const handleClick = async (event: MapMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) return;

    // Handle cluster click - zoom in
    if (feature.properties.cluster_id !== undefined) {
      const geojsonSource: GeoJSONSource = mapRef.current.getSource("stations");
      const zoom = await geojsonSource.getClusterExpansionZoom(
        feature.properties.cluster_id,
      );

      mapRef.current.easeTo({
        center:
          "coordinates" in feature.geometry ? feature.geometry.coordinates : [],
        zoom: zoom + 2,
        duration: 300,
      });
    }

    // Handle station click - navigate
    if (feature.properties?.id) {
      window.location.href = `/tides/stations/${feature.properties.id}`;
    }
  };

  const handleMouseMove = useCallback((e: MapMouseEvent) => {
    if (!e.features || e.features.length === 0) {
      setCursor("auto");
      setHoveredPopup(null);
      return;
    }

    const feature = e.features[0];

    // Only show popup for individual stations, not clusters
    if (feature.properties?.cluster_id === undefined) {
      setCursor("pointer");
      if (feature.geometry.type === "Point") {
        setHoveredPopup({
          name: feature.properties?.name || "Station",
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
        });
      }
    } else {
      setCursor("pointer");
      setHoveredPopup(null);
    }
  }, []);

  const handleMouseLeave = useCallback((e: MapMouseEvent) => {
    console.log("mouse leave", e);
    setCursor("auto");
    setHoveredPopup(null);
  }, []);

  return (
    <Map
      ref={mapRef}
      hash={true}
      initialViewState={{
        longitude: 0,
        latitude: 20,
        zoom: 1,
      }}
      style={{ width: "100%", height: "600px" }}
      mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
      attributionControl={false}
      interactiveLayerIds={["clusters", "stations-point"]}
      cursor={cursor}
      onClick={handleClick}
      onMouseEnter={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <StationSearch />
      <GeolocateControl fitBoundsOptions={{ maxZoom: 9 }} />
      <NavigationControl showCompass={false} visualizePitch={false} />
      <Source
        id="stations"
        type="geojson"
        data={geojsonData}
        cluster
        clusterMaxZoom={8}
        clusterRadius={50}
      >
        <ClusterLayer />
        <StationPointsLayer />
      </Source>

      {hoveredPopup && (
        <StationPopup {...hoveredPopup} onClose={() => setHoveredPopup(null)} />
      )}
    </Map>
  );
}
