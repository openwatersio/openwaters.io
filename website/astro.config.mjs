import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  site: "https://openwaters.io",
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
    icon(),
  ],
  vite: {
    ssr: {
      noExternal: ["maplibre-gl"],
    },
  },
  adapter: vercel({}),
  output: "static",
});
