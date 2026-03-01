import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

import icon from "astro-icon";

// Derive API URL for Vercel preview deployments
if (
  !process.env.PUBLIC_TIDES_API_URL &&
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_BRANCH_URL
) {
  process.env.PUBLIC_TIDES_API_URL = `https://api-${process.env.VERCEL_BRANCH_URL}`;
}

// https://astro.build/config
export default defineConfig({
  site: "https://openwaters.io",
  integrations: [react(), icon()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // Deduplicate React to ensure a single instance across the file: symlink boundary.
      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
    ssr: {
      // Process these through Vite's bundler for SSR (instead of externalizing to Node)
      // so that resolve.dedupe applies to React, and browser-only packages don't fail.
      // Includes @neaps/react and all its dependencies (which live in the neaps workspace
      // and have ESM extensionless imports that Node.js can't resolve natively).
      noExternal: [
        "@neaps/react",
        // @neaps/react dependencies (and their transitive deps that use ESM
        // extensionless imports, which Node.js can't resolve natively)
        /^@visx\//,
        "@tanstack/react-query",
        "astronomy-engine",
        "d3-array",
        "date-fns",
        // map dependencies
        "maplibre-gl",
        "react-map-gl",
      ],
    },
  },
  adapter: vercel({}),
  output: "static",
});
