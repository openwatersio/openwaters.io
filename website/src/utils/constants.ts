export const API_HOST =
  import.meta.env.PUBLIC_TIDES_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : "https://api.openwaters.io");

export const CONTACT_EMAIL =
  import.meta.env.PUBLIC_CONTACT_EMAIL || "hello@openwaters.io";
