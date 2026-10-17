const ORIGIN = "https://openwaters.io";
const TRACKER = "https://plausible.io/js/pa-CnBZo6s5P3gQNuI-h-gdb.js";

const sources = [
  "google",
  "bing",
  "duckduckgo",
  "yahoo",
  "github",
  "linkedin",
  "chatgpt",
  "perplexity",
  "newsletter",
  "discord",
  "facebook",
  "reddit",
  "bluesky",
];
const campaigns: Record<string, readonly string[]> = {
  utm_source: sources,
  source: sources,
  ref: sources,
  utm_medium: ["organic", "social", "referral", "email", "newsletter"],
};
const referrers = [
  "google.com",
  "google.ca",
  "google.co.uk",
  "google.de",
  "google.fr",
  "bing.com",
  "duckduckgo.com",
  "yahoo.com",
  "github.com",
  "linkedin.com",
  "chatgpt.com",
  "perplexity.ai",
  "facebook.com",
  "reddit.com",
  "bsky.app",
  "discord.com",
  "cruisersforum.com",
  "npmjs.com",
];

const resources: Record<string, { resource: string; action: string }> = {
  "https://github.com/openwatersio/aiscast": {
    resource: "aiscast-project",
    action: "project",
  },
  "https://github.com/openwatersio/aiscast/blob/main/CONTRIBUTING.md": {
    resource: "aiscast-contributing",
    action: "guide",
  },
  "https://github.com/openwatersio/aiscast/blob/main/docs/contributor-agreement.md":
    { resource: "aiscast-agreement", action: "guide" },
  "https://github.com/openwatersio/aiscast/tree/main/signalk-plugin": {
    resource: "signalk-guide",
    action: "guide",
  },
  "https://github.com/openwatersio/aiscast/discussions": {
    resource: "aiscast-discussions",
    action: "community",
  },
  "https://www.npmjs.com/package/signalk-aiscast": {
    resource: "signalk-package",
    action: "package",
  },
  "https://github.com/jvde-github/AIS-catcher": {
    resource: "ais-catcher",
    action: "project",
  },
  "https://github.com/sdr-enthusiasts/docker-shipfeeder": {
    resource: "docker-shipfeeder",
    action: "project",
  },
  "https://github.com/hkapanen/ais-forwarder": {
    resource: "ais-forwarder",
    action: "project",
  },
  "https://github.com/openwatersio/crowd-depth": {
    resource: "crowd-depth",
    action: "project",
  },
  "https://github.com/openwatersio/crowd-depth/blob/main/README.md": {
    resource: "crowd-depth-guide",
    action: "guide",
  },
  "https://github.com/openwatersio/slackwater-database": {
    resource: "tide-database",
    action: "project",
  },
  "https://github.com/openwatersio/slackwater-database/releases": {
    resource: "tide-database-releases",
    action: "download",
  },
  "https://github.com/openwatersio/seamap": {
    resource: "seamap",
    action: "project",
  },
  "https://github.com/openwatersio/seamap/blob/main/style/README.md": {
    resource: "seamap-guide",
    action: "guide",
  },
  "https://github.com/openwatersio/seascape": {
    resource: "seascape",
    action: "project",
  },
  "https://tiles.openwaters.io/seamap/tiles.json": {
    resource: "seamap-manifest",
    action: "manifest",
  },
  "https://tiles.openwaters.io/seascape/manifest.json": {
    resource: "seascape-manifest",
    action: "manifest",
  },
  "https://discord.gg/HTdZ4s9unG": { resource: "discord", action: "community" },
};

type EventName =
  | "resource_handoff"
  | "contact_started"
  | "ais_token_issued"
  | "ais_station_receiving_observed";
type Action = { name: EventName; props: Record<string, string> };
type Payload = Record<string, unknown>;

function pageUrl(
  value: string,
  pages: readonly string[],
  acquisition = false,
): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !["openwaters.io", "www.openwaters.io"].includes(url.host) ||
      url.username ||
      url.password
    )
      return null;
    let path = url.pathname;
    if (!path.endsWith("/")) path += "/";
    if (!pages.includes(path)) {
      const group = [
        "/ais/vessels/",
        "/ais/stations/",
        "/tides/stations/",
      ].find((prefix) => path.startsWith(prefix));
      path = group ? `${group}_redacted/` : "/404/";
    }
    const clean = new URL(path, ORIGIN);
    if (acquisition)
      for (const [key, allowed] of Object.entries(campaigns)) {
        const value = url.searchParams.get(key)?.toLowerCase();
        if (value && allowed.includes(value))
          clean.searchParams.set(key, value);
      }
    return clean.href;
  } catch {
    return null;
  }
}

function referrer(value: unknown, pages: readonly string[]): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    if (["openwaters.io", "www.openwaters.io"].includes(url.host))
      return pageUrl(value, pages);
    const host = referrers.find(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
    return host ? `https://${host}/` : null;
  } catch {
    return null;
  }
}

function properties(
  name: unknown,
  props: Record<string, unknown>,
): Record<string, string> | null {
  if (name === "pageview" || name === "ais_station_receiving_observed")
    return {};
  if (
    name === "ais_token_issued" &&
    ["initial", "reissue"].includes(String(props.operation))
  )
    return { operation: String(props.operation) };
  if (
    name === "contact_started" &&
    ["ais", "ais-token", "contact", "site"].includes(String(props.context))
  )
    return { context: String(props.context) };
  if (name === "resource_handoff") {
    const resource = Object.values(resources).find(
      (item) =>
        item.resource === props.resource && item.action === props.action,
    );
    if (resource) return { ...resource };
  }
  return null;
}

// Engagement inherits the sanitized page URL and properties from the preceding pageview.
export function sanitizePayload(
  payload: Payload,
  pages: readonly string[],
): Payload | null {
  const props = properties(
    payload.n,
    (payload.p && typeof payload.p === "object" ? payload.p : {}) as Record<
      string,
      unknown
    >,
  );
  const url = typeof payload.u === "string" && pageUrl(payload.u, pages, true);
  if (!props || !url) return null;
  return {
    n: payload.n,
    v: typeof payload.v === "number" ? payload.v : 36,
    d: "openwaters.io",
    u: url,
    r: referrer(payload.r, pages),
    ...(Object.keys(props).length ? { p: props } : {}),
  };
}

export function handoff(href: string, path: string): Action | null {
  try {
    const url = new URL(href, ORIGIN);
    if (url.protocol === "mailto:" && url.pathname === "hello@openwaters.io") {
      const context =
        path === "/ais/token/"
          ? "ais-token"
          : path === "/ais/"
            ? "ais"
            : path === "/contact/"
              ? "contact"
              : "site";
      return { name: "contact_started", props: { context } };
    }
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const resource = resources[url.origin + url.pathname.replace(/\/$/, "")];
    return resource
      ? { name: "resource_handoff", props: { ...resource } }
      : null;
  } catch {
    return null;
  }
}

type Tracker = ((
  name: string,
  options?: { props: Record<string, string> },
) => void) & {
  q?: unknown[][];
  o?: Record<string, unknown>;
};
declare global {
  interface Window {
    plausible?: Tracker;
  }
}

function tracker(): Tracker {
  if (!window.plausible) {
    const queued: Tracker = (...args) => {
      queued.q!.push(args);
    };
    queued.q = [];
    window.plausible = queued;
  }
  return window.plausible;
}

export function track(
  name: EventName,
  props: Record<string, string> = {},
): void {
  try {
    tracker()(name, { props });
  } catch {
    /* Analytics must not interrupt product actions. */
  }
}

let started = false;
export function startAnalytics(pages: readonly string[]): void {
  if (
    started ||
    !["openwaters.io", "www.openwaters.io"].includes(window.location.hostname)
  )
    return;
  started = true;
  try {
    // Configure before loading: site settings must never enable raw URL collectors.
    tracker().o = {
      outboundLinks: false,
      fileDownloads: false,
      formSubmissions: false,
      hashBasedRouting: false,
      transformRequest: (payload: Payload) => sanitizePayload(payload, pages),
    };
    const script = document.createElement("script");
    script.src = TRACKER;
    script.async = true;
    script.referrerPolicy = "no-referrer";
    document.head.append(script);
    const activated = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        (event.type === "click" ? event.button !== 0 : event.button !== 1)
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      const action = handoff(link.href, window.location.pathname);
      if (action) track(action.name, action.props);
    };
    document.addEventListener("click", activated);
    document.addEventListener("auxclick", activated);
  } catch {
    /* A blocked tracker must not affect navigation. */
  }
}
