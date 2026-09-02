import { negotiate, quality, REPRESENTATIONS } from "./accept.ts";

// The Markdown sibling the build writes next to every prerendered page.
export const markdownPath = (pathname: string) => `${pathname}index.md`;

// A page URL: directory-style, no file extension. Everything else (assets, feeds,
// the API spec) has exactly one representation and is passed straight through.
export const isPage = (pathname: string) =>
  pathname.endsWith("/") && !/\.[a-z0-9]+$/i.test(pathname);

type Fetch = (request: Request) => Promise<Response>;

const withHeaders = (response: Response, set: Record<string, string>) => {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(set)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const vary = (headers: Headers) => {
  const current = headers.get("vary");
  if (!current) return "Accept";
  return /(^|,)\s*accept\s*(,|$)/i.test(current)
    ? current
    : `${current}, Accept`;
};

/**
 * Serves a page in the representation the client asked for.
 *
 * - `page` renders the HTML (the Astro handler);
 * - `asset` fetches a static file (the ASSETS binding), used for the Markdown sibling.
 *
 * Only GET/HEAD requests for page URLs are negotiated; everything else goes to `page`
 * untouched.
 */
export async function serve(
  request: Request,
  page: Fetch,
  asset: Fetch,
): Promise<Response> {
  const url = new URL(request.url);
  if (!isPage(url.pathname) || !["GET", "HEAD"].includes(request.method)) {
    return page(request);
  }

  const chosen = negotiate(request.headers.get("accept"));
  const sibling = new Request(new URL(markdownPath(url.pathname), url), {
    method: request.method,
    headers: request.headers,
  });

  if (chosen === null) return notAcceptable(request);

  if (chosen === "text/markdown") {
    const markdown = await asset(sibling);
    if (markdown.ok) {
      return withHeaders(markdown, {
        "content-type": "text/markdown; charset=utf-8",
        vary: vary(markdown.headers),
      });
    }
    // No Markdown for this page: it is an on-demand route, or it does not exist.
    const html = await page(request);
    if (html.ok && quality(request.headers.get("accept"), "text/html") === 0) {
      return notAcceptable(request);
    }
    return withHeaders(html, { vary: vary(html.headers) });
  }

  const html = await page(request);
  const headers: Record<string, string> = { vary: vary(html.headers) };
  if (html.ok) {
    const probe = await asset(new Request(sibling, { method: "HEAD" }));
    if (probe.ok) {
      headers.link = `<${markdownPath(url.pathname)}>; rel="alternate"; type="text/markdown"`;
    }
  }
  return withHeaders(html, headers);
}

const notAcceptable = (request: Request) =>
  new Response(
    `Not Acceptable\n\nThis resource is available in:\n${REPRESENTATIONS.map((t) => `- ${t}`).join("\n")}\n\nYou requested: ${request.headers.get("accept")}\n`,
    {
      status: 406,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        vary: "Accept",
        "cache-control": "no-store",
      },
    },
  );
