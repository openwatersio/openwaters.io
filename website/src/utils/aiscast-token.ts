// Reads the token /ais/token/ leaves in localStorage, for pages that want to
// fill a command in or greet a station by name. Browser-only and same-origin:
// the token page writes these keys, nothing here mints or sends anything.
//
// Two readers already needed the same expiry rule and the same private-mode
// guard (CodeBlock's `<token>` substitution and the AIS-catcher page's call to
// action), so it lives in one place rather than drifting between them.

export interface AiscastClaims {
  sub: string;
  exp?: number;
  role?: string;
}

export interface AiscastToken {
  token: string;
  claims: AiscastClaims;
  /** The station name the visitor chose, if the server accepted one. */
  name: string | null;
}

export const TOKEN_KEY = "aiscast.token";
export const NAME_KEY = "aiscast.name";

/** The literal the commands on our pages carry until a token replaces it. */
export const TOKEN_PLACEHOLDER = "<token>";

/**
 * The visitor's current token, or null if there isn't one, it's expired, or
 * localStorage is unavailable (Safari private mode throws rather than
 * returning null).
 */
export function readToken(): AiscastToken | null {
  try {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) return null;
    const { token, claims } = JSON.parse(saved) as {
      token?: unknown;
      claims?: AiscastClaims;
    };
    if (typeof token !== "string" || !token) return null;
    if (!claims || typeof claims.sub !== "string") return null;
    // exp of 0 means no expiry, which is what a personal token gets.
    if (claims.exp && claims.exp * 1000 <= Date.now()) return null;
    return { token, claims, name: localStorage.getItem(NAME_KEY) || null };
  } catch {
    return null;
  }
}

/**
 * The station's page on the live map. The id's colons and slashes are legal in
 * a path and the route is a splat, so this is left unencoded to match the
 * address the token page hands out.
 */
export function stationHref(claims: AiscastClaims, stations = "/ais/stations") {
  return `${stations}/station:${claims.sub}`;
}

/** What to call this station in a sentence: its name, else its id. */
export function stationLabel(t: AiscastToken) {
  return t.name || t.claims.sub;
}

/**
 * Calls back whenever the stored token might have changed: now, when another
 * tab writes it, and when this tab is looked at again. The create-a-token flow
 * sends people to another tab and back, so the last one is what makes the
 * commands fill themselves in on return.
 */
export function onTokenChange(apply: (t: AiscastToken | null) => void) {
  const run = () => apply(readToken());
  run();
  addEventListener("storage", (e) => {
    if (e.key === TOKEN_KEY || e.key === NAME_KEY) run();
  });
  addEventListener("visibilitychange", () => {
    if (!document.hidden) run();
  });
}
