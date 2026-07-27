# Cloudflare migration plan

Goal: run the entire openwaters.io site (site + APIs) on Cloudflare and **retire
Vercel**.

Ordering follows a standard production migration: get everything running on
Cloudflare under its own generated hostnames while Vercel stays live, automate
deploys, clean up the hacks, then flip DNS once, verify, and only then reap the
old services.

## Current state (July 2026)

- **On Vercel** (team `openwaters`, Hobby — hitting the Fluid Active CPU limit):
  - `openwaters-io` — Astro site (not fully static: station pages use dynamic
    routing; `@astrojs/vercel`).
  - `api-openwaters-io` — Express tides API (`api.openwaters.io`).
  - `crowd-depth` — Express API (`depth.openwaters.io`), separate repo.
- **DNS**: the `openwaters.io` zone is already on Cloudflare. `apex`, `api`,
  `depth` are DNS-only records pointing at Vercel; `tiles.*` is proxied to a
  Worker (gebco). So cutover = repointing existing records — reversible.
- **Deploys run off PR builds** (pkg.pr.new: tide-database#103, neaps#293) via a
  temporary `overrides` block in the root `package.json`. Fine for the whole
  migration; releasing them is cleanup (step 3), not a prerequisite.

## 1. Get everything running on Cloudflare (generated URLs)

Everything live on Cloudflare's own hostnames (`*.workers.dev` / `*.pages.dev`),
Vercel still serving production. No custom domains, no DNS changes yet.

- [x] **Tides API** — Worker at `openwaters-api.brandon-782.workers.dev`, verified
      live (predictions, subordinate stations, search). Bundle 5.15 MB gz.
- [x] **Website** — Worker at `openwaters-io.brandon-782.workers.dev`, verified
      (home, prerendered pages, SSR station routes incl. subordinate + 404s).
      `@astrojs/cloudflare` v12 (Astro 5), selected via `DEPLOY_TARGET=cloudflare`
      so the Vercel build keeps working from `main` until cutover. Site worker is
      1.5 MB gz — the station pages only fetch from the API (the tide-database
      import is type-only), so no 5 MB bundle.
      - **Gotcha (error 1042)**: a Worker can't fetch another Worker on the same
        account via `workers.dev`, so the site couldn't reach the API's generated
        URL. Fix: temp custom domain `api-cf.openwaters.io` on the api worker
        (cross-zone fetch is fine); `PUBLIC_TIDES_API_URL` defaults to it in
        `website/wrangler.jsonc`. Replaced by `api.openwaters.io` at cutover.

## 2. Automate deployment

CI so Cloudflare deploys happen on merge — running alongside Vercel, which stays
live until cutover. PR previews come along for free: worker *versions* get their
own `<hash>-<worker>.workers.dev` preview URLs, serve no production traffic, and
are inert artifacts — no teardown needed (better than Vercel's ephemeral
deploys). Preview versions share the production worker's env/secrets/bindings;
fine here since both workers are pure compute.

- [ ] **First choice: Workers Builds** (Cloudflare git integration, dashboard
      config, no CI code) — connect the repo; it builds every PR, comments the
      preview URL, and deploys `main` to production. Configure both workers
      (api + website) against the monorepo.
- [ ] **Fallback** (if the monorepo build config fights us): GitHub Actions +
      `cloudflare/wrangler-action` with `CLOUDFLARE_API_TOKEN` /
      `CLOUDFLARE_ACCOUNT_ID` secrets — PRs run `wrangler versions upload` and
      comment the preview URL; merges to `main` run `wrangler deploy`.

## 3. Cleanup (code / hacks / PRs)

Get it all "right" — no temporary hacks — before the flip.

- [ ] Publish the dependency PRs and swap the root `package.json` `@neaps/*` deps
      + tide-database `overrides` from pkg.pr.new to released versions:
      tide-database#103 (off-heap pack); neaps#292 (`s-maxage`) + #293
      (workers-compat) — both edit `@neaps/api`'s `index.ts`, so reconcile them.
      Re-`npm install` and re-verify.
- [ ] **Edge caching**: confirm `s-maxage` ships (from #292) and/or add a
      Cloudflare **Cache Rule** on the API — the live worker currently sends
      `max-age=3600` only, so the edge doesn't cache and every request runs a
      prediction. Predictions with explicit `start`/`end` are immutable → high
      value.
- [ ] Remove any transitional shims (e.g. the dual-adapter selection) once no
      longer needed.

## 4. Cutover (DNS)

The flip. Records already live in the CF zone → attach custom domains and change
targets. Fast and reversible.

- [ ] Attach custom domains: `api.openwaters.io` → api worker; `openwaters.io` +
      `www` → website. Then drop the temp `api-cf.openwaters.io` domain and point
      `PUBLIC_TIDES_API_URL` at `api.openwaters.io`.
- [ ] Set production `PUBLIC_TIDES_API_URL=https://api.openwaters.io` and redeploy
      the website.
- [ ] Repoint the DNS records from Vercel to Cloudflare for each host.

## 5. Verification

- [ ] Each host live on its real domain: endpoints, station pages, TLS, cache
      headers, predictions (reference + subordinate).
- [ ] Watch Workers analytics/logs for errors; sanity-check against the Vercel
      baseline. Let it bake before reaping.

## 6. Reap legacy (Vercel)

- [ ] Delete/pause the migrated Vercel projects (`openwaters-io`,
      `api-openwaters-io`); disconnect their git integration. (crowd-depth stays
      on Vercel until its follow-up, so keep the team for now.)
- [ ] Strip Vercel bits: `website/vercel.json`, `api/vercel.json`,
      `@astrojs/vercel` + the dual-adapter shim, `VERCEL_*` env usage, `.vercel/`
      dirs.

## Follow-up (deferred)

- **crowd-depth** (`depth.openwaters.io`) — migrate the separate Express repo to a
  Worker; inventory it first for a real DB / stateful deps (unlike the tides API,
  which is pure compute). It stays on Vercel until then, so the Vercel team can't
  be fully closed yet. Tracked outside this plan.

## Risks & rollback

- **DNS is reversible** — keep Vercel live until each host is verified on
  Cloudflare, then repoint back if needed.
- **tide-database node-build asset**: the node build `readSync`s the pack file.
  Cloudflare (api worker + site SSR) uses the **browser** build and avoids this;
  the concern is only for any Node runtime lingering in the transition.
- **Worker size limit** (paid 10 MB gz): api worker is 5.15 MB; the site Worker
  also carries the browser build if the station pages import it — watch the
  total. The R2 range-read source (`tide-database/docs/lazy-loading.md`) is the
  escape hatch.
- **Express-on-workerd** via `cloudflare:node` `httpServerHandler` is relatively
  new; fine for now, a native `fetch` handler is a later option.
