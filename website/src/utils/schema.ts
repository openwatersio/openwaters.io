export const SITE = "https://openwaters.io";
const MIT = "https://opensource.org/licenses/MIT";

// Station names arrive from the API, so a name containing "</script>" would close the
// tag early. Escaping "<" is the standard mitigation and leaves the JSON valid.
export const jsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c");

export const publisher = {
  "@type": "Organization",
  name: "Open Waters",
  url: SITE,
};

// Emitted on every page by MainLayout. Takes the address rather than importing
// constants.ts, which reads import.meta.env and so cannot be loaded by node --test.
export const organization = (email: string) => ({
  "@context": "https://schema.org",
  ...publisher,
  email,
  description:
    "Open source tools and data for understanding and navigating the sea.",
  sameAs: ["https://github.com/openwatersio"],
});

// Every Open Waters project is MIT unless stated otherwise — see /license/. Projects
// whose licensing is genuinely per-source (Seascape's tiles) don't use this.
export const softwareSourceCode = (project: {
  name: string;
  description: string;
  path: string;
  codeRepository: string;
  programmingLanguage: string[];
}) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: project.name,
  description: project.description,
  url: `${SITE}${project.path}`,
  codeRepository: project.codeRepository,
  programmingLanguage: project.programmingLanguage,
  license: MIT,
  isAccessibleForFree: true,
  author: publisher,
});

export const place = (station: {
  name: string;
  latitude: number;
  longitude: number;
  region?: string;
  country?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Place",
  name: station.name,
  geo: {
    "@type": "GeoCoordinates",
    latitude: station.latitude,
    longitude: station.longitude,
  },
  // Omitted entirely when the catalogue has neither, rather than emitting empty fields.
  ...(station.region || station.country
    ? {
        address: {
          "@type": "PostalAddress",
          ...(station.region ? { addressRegion: station.region } : {}),
          ...(station.country ? { addressCountry: station.country } : {}),
        },
      }
    : {}),
});
