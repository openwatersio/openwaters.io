interface Env {
  TIDES: Fetcher;
  BATHYMETRY: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

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
