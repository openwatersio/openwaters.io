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

export const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Open Waters",
  alternateName: "openwaters.io",
  url: `${SITE}/`,
};

// Emitted on every page by MainLayout. Takes the address rather than importing
// constants.ts, which reads import.meta.env and so cannot be loaded by node --test.
export const organization = (email: string) => ({
  "@context": "https://schema.org",
  ...publisher,
  email,
  address: {
    "@type": "PostalAddress",
    streetAddress: "411 Walnut St #15547",
    addressLocality: "Green Cove Springs",
    addressRegion: "FL",
    postalCode: "32043",
    addressCountry: "US",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email,
    availableLanguage: "English",
  },
  description:
    "Open source tools and data for understanding and navigating the sea.",
  sameAs: ["https://github.com/openwatersio"],
  makesOffer: [
    {
      "@type": "Offer",
      name: "Free Tides API",
      price: 0,
      priceCurrency: "USD",
      url: `${SITE}/api/tides/`,
      description:
        "Free tide predictions without authentication, subject to published rate limits and source data licenses.",
      itemOffered: { "@type": "Service", name: "Open Waters Tides API" },
    },
    {
      "@type": "Offer",
      name: "Open Waters AIS free personal access",
      price: 0,
      priceCurrency: "USD",
      url: `${SITE}/ais/#limits`,
      description:
        "Real-time vessel data from coastal authorities and volunteer receivers, free for personal use through an aisstream-compatible API. Anonymous and Personal tiers have published usage limits; contributing receiver data earns the free Contributor tier. Source data terms apply.",
      itemOffered: { "@type": "Service", name: "Open Waters AIS" },
    },
    {
      "@type": "Offer",
      name: "Free chart tiles",
      price: 0,
      priceCurrency: "USD",
      url: `${SITE}/charts/`,
      description:
        "Free Seamap and Seascape chart tiles with the attribution required on each chart's page. Not for navigation.",
      itemOffered: { "@type": "Service", name: "Open Waters chart tiles" },
    },
    {
      "@type": "Offer",
      name: "Open Waters AIS Commercial",
      url: `${SITE}/contact/`,
      description:
        "Paid AIS access for products, fleets, or support. Pricing is arranged by email; contact us for a quote.",
      itemOffered: { "@type": "Service", name: "Open Waters AIS Commercial tier" },
    },
  ],
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
