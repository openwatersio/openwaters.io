// Served on api, tiles and data. Their responses are JSON, tiles and raw
// data with no search value, and crawlers fetching map tiles cost requests.
// The pages that cite this data, and the API docs at openwaters.io/api/, stay
// open under https://openwaters.io/robots.txt.
const ROBOTS_TXT = "User-agent: *\nDisallow: /\n";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/robots.txt") {
      return new Response(ROBOTS_TXT, {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=86400",
        },
      });
    }

    // The TIDES worker serves both slackwater route groups: tides and currents.
    if (
      pathname === "/tides" ||
      pathname.startsWith("/tides/") ||
      pathname === "/currents" ||
      pathname.startsWith("/currents/")
    ) {
      return env.TIDES.fetch(request);
    }

    if (pathname === "/bathymetry" || pathname.startsWith("/bathymetry/")) {
      return env.BATHYMETRY.fetch(request);
    }

    if (pathname === "/") {
      return Response.json({
        name: "Open Waters API",
        documentation: "https://openwaters.io/api",
      });
    }

    if (pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
