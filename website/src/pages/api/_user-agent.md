Requests to `api.openwaters.io`, `ais.openwaters.io`, `tiles.openwaters.io` and `stillwell.openwaters.io` need a `User-Agent` header that names your app, its version, and a URL or email address where its author can be reached:

```
my-app/1.2 (https://example.org/my-app)
my-app/1.2 (you@example.org)
```

`stillwell.openwaters.io` refuses requests without one. `api.openwaters.io`, `ais.openwaters.io` and `tiles.openwaters.io` start refusing them in 2027.

The contact lets us reach you about a change that affects your app, or about traffic that causes trouble, before we have to block it. Use one name per app, and keep it the same across releases.

## Browsers

A web page needs nothing. Browsers send their own `User-Agent` and don't let a page change it, so a request with an `Origin`, `Referer` or `Sec-Fetch-Site` header isn't checked. That covers `fetch` from a page, map tiles loaded by a map library, and opening a URL in the browser.

A server that renders pages, such as an Astro, Next.js or Remix server, isn't a browser, and sets its own header.

## What is refused

- No `User-Agent`, or an empty one.
- A library's default, such as `python-requests/2.32`, `Python-urllib/3.12`, `okhttp/4.12`, `Go-http-client/2.0`, `node` or `duckdb/v1.1.3`.
- A name with no version, or no URL or email address.

`curl` and `wget` may send their own default. Polars can't change its `User-Agent`, so `stillwell.openwaters.io` accepts its `polars/<version>`.

Station ingest, `/mcp` and `/v0/stream` on `ais.openwaters.io` aren't checked, and neither are `/health`, `/metrics`, `/robots.txt`, `/openapi.json` and `/favicon.ico`.

## The error

A refused request gets a `403` with a JSON body that says what to change and links to this page. A `429` is a rate limit, never this check.

## Setting it

curl:

```sh
curl -A "my-app/1.2 (you@example.org)" https://stillwell.openwaters.io/sources.json
```

JavaScript, in Node, Deno or Bun:

```js
await fetch(url, { headers: { "User-Agent": "my-app/1.2 (you@example.org)" } });
```

Python:

```python
import requests

requests.get(url, headers={"User-Agent": "my-app/1.2 (you@example.org)"})
```

DuckDB, for files on `stillwell.openwaters.io`:

```sql
CREATE SECRET (TYPE http, EXTRA_HTTP_HEADERS MAP {'User-Agent': 'my-app/1.2 (you@example.org)'});
```

pandas:

```python
pd.read_parquet(url, storage_options={"User-Agent": "my-app/1.2 (you@example.org)"})
```

A native map, such as MapLibre Native on iOS or Android, sets it on the map's own network layer, since the map makes its tile requests itself.

Questions go to [hello@openwaters.io](mailto:hello@openwaters.io).
