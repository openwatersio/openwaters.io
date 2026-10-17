# Website analytics

`MainLayout.astro` loads `Analytics.astro` once. The component supplies the static Astro page paths to `utils/analytics.ts`, which configures the site's supported Plausible tracker before loading it. Tracking runs only on `openwaters.io` and `www.openwaters.io`; localhost and preview deployments do not load Plausible. No analytics API key belongs in the website bundle.

## Payload contract

`sanitizePayload` allows pageviews and the four custom events below. It constructs a new payload; unknown names, raw destination URLs, arbitrary properties, revenue, and metadata are excluded. Automatic outbound, download, and form collectors are disabled in the client configuration, even when enabled in Plausible's site settings. Pageviews retain Plausible's automatic collection, and its engagement requests inherit the sanitized page URL and empty page properties.

Static page paths come from the Astro page files. Identifying paths under `/ais/vessels/`, `/ais/stations/`, and `/tides/stations/` are grouped as `_redacted/`; unknown paths use `/404/`. Query parameters and fragments are removed except the enumerated acquisition values in `analytics.ts`. Only approved `utm_source`, `utm_medium`, `source`, and `ref` values survive. No campaign, content, or term values are approved. Add a new campaign value only after reviewing its data content and adding a privacy test.

External referrers are reduced to an approved site's root, including normalization of its subdomains. Unknown hosts are omitted. Same-site referrers use the same path redaction without acquisition parameters. This sacrifices attribution for unreviewed referrers to avoid transmitting arbitrary paths, hostnames, or search strings. The tracker script request uses a no-referrer policy; event requests use the browser's cross-origin referrer policy, which sends at most the site's origin.

Never send token/key material, claims, station/device identifiers or names, IPs, vessel identities or positions, bounding boxes, form contents, raw API responses/errors, or free text. This applies to URL, referrer, and automatic fields as well as explicit properties. The analytics helper never adds an identifier to an API request.

## Events

| Goal name                        | Trigger                                                                        | Properties                                             | Interpretation                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `ais_token_issued`               | A usable `/v1/keys` response is saved and displayed                            | `operation=initial` or `reissue`                       | Successful issuance in this browser; not a new person or globally new key                  |
| `ais_station_receiving_observed` | A successful station response reports a valid nonnegative age below `ACTIVE_S` | None                                                   | Recent contribution observed by the token page; not a first-ever or sustained contribution |
| `resource_handoff`               | Activation of an exact allowlisted external link                               | Fixed `resource` and `action` from the destination map | A handoff, not completed installation, transfer, or contribution                           |
| `contact_started`                | Activation of the site's email link                                            | `context=ais`, `ais-token`, `contact`, or `site`       | Email intent, not a sent or received inquiry                                               |

Issuance excludes button clicks, failed or malformed responses, failed persistence, cached restoration, and reopening the regeneration form. A station-name warning still counts when the token is saved and displayed. `initial` means no usable cached token immediately before the request; expired or corrupt cache is not a reissue. Token validation checks the service's `ak1` format and usable subject/expiry fields; signature verification remains the API's responsibility.

Receiving uses `station-status.ts` and emits at most once per page lifecycle. It excludes 404s, failed requests, invalid ages, stale data, and superseded checks. An already active returning station can produce it. Analytics exceptions never block token issuance, status rendering, or navigation.

The handoff map covers the AIS project and contributor guides, receiver tools, Signal K's package and README, crowd-depth, database releases, chart projects/manifests, and community links. Matching ignores query and fragment values and emits fixed labels. Same-origin documentation links remain ordinary pageviews; no internal campaign tags are added. Click, keyboard activation, modified clicks, and middle-clicks use the same delegated handler without delaying or preventing navigation. Canceled or right-button events do not count.

## Attribution boundaries

Use Plausible source and entry-page dimensions to compare the custom goals by organic landing cohort. Keep event totals separate from unique converting visitors; conversion rates need the same cohort and closed window on both sides. Reissues and receiving observations have different meanings from initial issuance.

GitHub, npm, release downloads, Signal K installation, UDP feeders, copied commands, and external API clients are outside this site's session. Signal K can create its own token and UDP can contribute without the browser flow. Anonymous API use is also valid adoption. Website map/demo traffic does not establish an installed client. Keep service activity aggregates separate; do not join browser visitors to server token holders. Received inquiries are counted in the private inbox or pipeline, never inferred from a mail link.

Dynamic AIS pages served by aiscast have their own layout and are outside `MainLayout`; the live viewer was inspected and loads its own basic Plausible script. This change sanitizes those URLs when received as referrers or custom locations on information/token pages, but does not change the viewer’s separate tracker. A same-origin link alone does not establish that the other application's analytics has the same contract. Markdown/agent downloads and clients without JavaScript do not run this browser tracker.

## Plausible setup and validation

Create custom-event goals with the exact four names above on the `openwaters.io` property. Enable the `operation`, `resource`, `action`, and `context` property keys for dashboard breakdowns. Goal configuration changes do not backfill unrecorded historical actions. The site-specific script identifier is public installation metadata, not an API credential.

Run `npm run build`, `npm test -w website`, and `npm run build -w api`. Tests exercise the actual token-page script with controlled API/storage responses and capture exact event names, counts, and ordering. Payload tests include credential/coordinate sentinels in page URLs, destinations, properties, and referrers. They also cover early event queues, duplicate initialization, and a throwing tracker.

For browser request capture, use a local controlled harness with the tracker script and event endpoint intercepted; never send test events to the production property. Verify keyboard and middle-click handoffs, initial issuance/reissue, cached restore, receiving polls, blocked analytics, pageview and engagement payloads. Check bodies and request URLs/referrers for sentinels. After release, verify delivery using real actions and the configured goals; capture the deployment date before starting a complete observation window.

References: [Plausible tracker options](https://plausible.io/docs/script-extensions), [custom locations and request transformation](https://plausible.io/docs/custom-locations), and [custom event goals](https://plausible.io/docs/custom-event-goals).
