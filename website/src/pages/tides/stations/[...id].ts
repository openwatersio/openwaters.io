import type { APIRoute } from "astro";
import targets from "virtual:station-redirects";

import { stationRedirect } from "../../../utils/station-redirects";

// On demand, so the Worker answers every station id rather than only the ones that
// exist at build time. It is also the site's only on-demand route: without one,
// Astro builds no server bundle and src/worker.ts has nothing to run.
export const prerender = false;

// The route only matches /tides/stations/, which stationRedirect always answers.
export const GET: APIRoute = ({ url }) => stationRedirect(url, targets)!;
