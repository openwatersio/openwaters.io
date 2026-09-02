import { handle } from "@astrojs/cloudflare/handler";

import { serve } from "./utils/negotiate.ts";

type Env = Parameters<typeof handle>[1] & {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
};

// Every page is served as HTML or Markdown depending on Accept (acceptmarkdown.com).
// wrangler.jsonc's run_worker_first routes page requests here instead of straight to
// the asset store, so the negotiation runs for prerendered pages too.
export default {
  fetch: (request: Request, env: Env, ctx: Parameters<typeof handle>[2]) =>
    serve(
      request,
      (req) => handle(req, env, ctx),
      (req) => env.ASSETS.fetch(req),
    ),
};
