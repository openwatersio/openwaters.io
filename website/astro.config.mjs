import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import pagefind from "astro-pagefind";

// https://astro.build/config
export default defineConfig({
  site: "https://openwaters.io",
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
    pagefind(),
  ],
  vite: {
    ssr: {
      noExternal: ["maplibre-gl"],
    },
  },
  output: "hybrid",
});
