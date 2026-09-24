import { fileURLToPath } from "node:url";
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

// MapLibre only renders once src/utils/maplibre.ts has set its worker URL. Resolve every
// client import of maplibre-gl to that module, including imports inside dependencies such
// as @vis.gl/react-maplibre, and fail the build if anything still reaches it directly.
const mapLibreSetup = fileURLToPath(
  new URL("./src/utils/maplibre.ts", import.meta.url),
);
const mapLibreWorkerUrl = {
  name: "openwaters:maplibre-worker-url",
  enforce: "pre",
  applyToEnvironment: (environment) => environment.name === "client",
  resolveId(source, importer) {
    if (source === "maplibre-gl" && importer !== mapLibreSetup) {
      return mapLibreSetup;
    }
  },
  async generateBundle() {
    const mapLibre = await this.resolve("maplibre-gl", mapLibreSetup);
    const info = mapLibre && this.getModuleInfo(mapLibre.id);
    if (!info) return;
    const bypassing = [...info.importers, ...info.dynamicImporters].filter(
      (id) => id !== mapLibreSetup,
    );
    if (bypassing.length > 0) {
      this.error(
        `maplibre-gl imported without src/utils/maplibre.ts, so its worker will 404: ${bypassing.join(", ")}`,
      );
    }
  },
};

// Every prerendered page gets a Markdown sibling (index.md) that src/worker.ts serves
// for `Accept: text/markdown`. Written after the build so it sees the final HTML.
const markdownPages = {
  name: "openwaters:markdown-pages",
  hooks: {
    "astro:build:done": async ({ dir, pages, logger }) => {
      const { pageToMarkdown } = await import("./src/utils/markdown.ts");
      const { readFile, writeFile } = await import("node:fs/promises");
      let count = 0;
      for (const { pathname } of pages) {
        // Astro writes the error page as 404.html, not 404/index.html.
        const file = pathname === "404/" ? "404" : `${pathname}index`;
        const html = await readFile(new URL(`${file}.html`, dir), "utf8");
        await writeFile(new URL(`${file}.md`, dir), pageToMarkdown(html));
        count++;
      }
      logger.info(`wrote ${count} Markdown pages`);
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: "https://openwaters.io",
  redirects: {
    // The engine docs page followed the Neaps → Slackwater rename.
    "/tides/neaps": "/tides/slackwater",
  },
  integrations: [react(), icon(), markdownPages],
  vite: {
    cacheDir,
    plugins: [tailwindcss(), optimizeSsrDeps, mapLibreWorkerUrl],
    optimizeDeps: {
      // Pre-bundling separates MapLibre from the worker it loads relative to itself, so dev
      // maps reached through dependencies like @vis.gl/react-maplibre would request a 404.
      exclude: ["maplibre-gl"],
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
      // Includes @slackwater/react and all its dependencies (which live in the slackwater workspace
      // and have ESM extensionless imports that Node.js can't resolve natively).
      noExternal: [
        "@slackwater/react",
        // @slackwater/react dependencies (and their transitive deps that use ESM
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
