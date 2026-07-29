interface Env {
  TIDES: Fetcher;
  // BATHYMETRY: Fetcher; // bind once the crowd-depth worker is deployed
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/tides" || pathname.startsWith("/tides/")) {
      return env.TIDES.fetch(request);
    }

    if (pathname === "/bathymetry" || pathname.startsWith("/bathymetry/")) {
      // return env.BATHYMETRY.fetch(request);
      return Response.json(
        { error: "Bathymetry API coming soon" },
        { status: 501 },
      );
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
