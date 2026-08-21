import { defineCollection } from "astro:content";

// The AISCast API reference is maintained in the aiscast repo and rendered here
// as-is. Fetched from GitHub rather than ais.openwaters.io so a server outage
// cannot fail a site build.
const AIS_API_MD =
  "https://raw.githubusercontent.com/openwatersio/aiscast/main/docs/API.md";

const ais = defineCollection({
  loader: {
    name: "aiscast-docs",
    load: async ({ store, renderMarkdown }) => {
      // A GitHub hiccup must not fail the site build: fall back to a stub.
      const body = await fetch(AIS_API_MD)
        // The page supplies its own title; drop the document's h1.
        .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
        .then((md) => md.replace(/^# .*\n+/, ""))
        .catch((err) => {
          console.warn(`[ais] ${AIS_API_MD}: ${err}; using stub`);
          return `The reference is temporarily unavailable here; read it on [GitHub](${AIS_API_MD.replace("raw.githubusercontent.com/openwatersio/aiscast/main", "github.com/openwatersio/aiscast/blob/main")}).`;
        });
      // Rendered as trusted HTML: same-org repo, maintainers are the authors.
      store.set({
        id: "api",
        data: {},
        body,
        rendered: await renderMarkdown(body),
      });
    },
  },
});

export const collections = { ais };
