import { useState, useEffect } from "react";
import type {
  StyleSpecification,
  LayerSpecification,
} from "react-map-gl/maplibre";

const SATELLITE_SOURCE = {
  type: "raster" as const,
  tiles: [
    "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
  ],
  tileSize: 256,
  maxzoom: 15,
  attribution:
    '&copy; <a href="https://s2maps.eu">Sentinel-2 cloudless</a> by EOX',
};

const VECTOR_SOURCE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const SATELLITE_LAYER: LayerSpecification = {
  id: "satellite",
  type: "raster",
  source: "satellite",
};

// Satellite-only fallback while the vector label style loads
const FALLBACK: StyleSpecification = {
  version: 8,
  sources: { satellite: SATELLITE_SOURCE },
  layers: [SATELLITE_LAYER],
};

// Module-level cache so the style is built only once
let cached: StyleSpecification | null = null;
let promise: Promise<StyleSpecification> | null = null;

function buildStyle(): Promise<StyleSpecification> {
  if (!promise) {
    promise = fetch(VECTOR_SOURCE_URL)
      .then((r) => r.json())
      .then((style: StyleSpecification) => {
        // Keep only labels and boundary/road lines — no fills or backgrounds
        const overlayLayers = style.layers.filter(
          (l: LayerSpecification) => l.type === "symbol" || l.type === "line",
        );

        const composite: StyleSpecification = {
          ...style,
          sources: { ...style.sources, satellite: SATELLITE_SOURCE },
          layers: [SATELLITE_LAYER, ...overlayLayers],
        };

        cached = composite;
        return composite;
      })
      .catch(() => FALLBACK);
  }
  return promise;
}

// Start fetching immediately on module load
if (typeof window !== "undefined") {
  buildStyle();
}

export function useMapStyle(): StyleSpecification {
  const [style, setStyle] = useState<StyleSpecification>(cached ?? FALLBACK);

  useEffect(() => {
    if (!cached) {
      buildStyle().then(setStyle);
    }
  }, []);

  return style;
}
