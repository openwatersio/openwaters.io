import type { APIRoute } from "astro";

import { API_HOST } from "../utils/constants";
import { openApiDocument } from "../utils/openapi";

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await openApiDocument(API_HOST), null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
