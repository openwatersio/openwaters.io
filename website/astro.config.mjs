import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";

import icon from "astro-icon";

// astro dev and preview run the site in workerd, which cannot evaluate CommonJS.
// astro-icon's iconify dependencies still ship CJS entries, so without pre-bundling
// them for the SSR environment every route that renders an <Icon> fails with
// "module is not defined". The build is unaffected: the Cloudflare adapter sets
// `ssr.noExternal = true` there, which bundles them already.
// https://docs.astro.build/en/guides/integrations-guide/cloudflare/
const optimizeSsrDeps = {
  name: "openwaters:optimize-ssr-deps",
  configEnvironment(name) {
    if (name === "client") return;
    return { optimizeDeps: { include: ["@iconify/utils", "@iconify/tools"] } };
  },
};

// https://astro.build/config
export default defineConfig({
  site: "https://openwaters.io",
  integrations: [react(), icon()],
  vite: {
    plugins: [tailwindcss(), optimizeSsrDeps],
    optimizeDeps: {
      include: ["maplibre-gl"],
      esbuildOptions: {
        target: "es2022",
      },
    },
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
  adapter: cloudflare(),
  output: "static",
});
