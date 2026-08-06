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

// astro dev, build, and check all share Vite's default cache directory
// (node_modules/.vite), and Astro hardcodes it rather than deriving it from its own
// cacheDir option. Building or type checking while a dev server is running re-optimizes
// dependencies there, invalidating the content-hashed chunks the running workerd module
// runner still resolves against, so routes 500 until the server restarts. Moving only
// the dev server leaves builds and CI on the default cache.
const cacheDir =
  process.argv[2] === "dev" ? "node_modules/.vite-dev" : undefined;

// https://astro.build/config
export default defineConfig({
  site: "https://openwaters.io",
  integrations: [react(), icon()],
  vite: {
    cacheDir,
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
