import { useSyncExternalStore } from "react";

const LIGHT_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const query =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

function subscribe(callback: () => void) {
  query?.addEventListener("change", callback);
  return () => query?.removeEventListener("change", callback);
}

function getSnapshot() {
  return query?.matches ? DARK_STYLE : LIGHT_STYLE;
}

function getServerSnapshot() {
  return LIGHT_STYLE;
}

export function useMapStyle() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
