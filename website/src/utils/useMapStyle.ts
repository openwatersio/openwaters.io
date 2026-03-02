import type { StyleSpecification } from "react-map-gl/maplibre";

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
      ],
      tileSize: 256,
    },
    overlay: {
      type: "raster",
      tiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/overlay_bright_3857/default/g/{z}/{y}/{x}.png",
      ],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: "satellite",
      type: "raster",
      source: "satellite",
    },
    {
      id: "overlay",
      type: "raster",
      source: "overlay",
    },
  ],
};

export function useMapStyle() {
  return MAP_STYLE;
}
