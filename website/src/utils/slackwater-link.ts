/**
 * A slackwater.xyz URL tagged with the openwaters.io placement that links to it.
 *
 * Plausible on slackwater.xyz only sees the referring domain, so without a tag
 * every visit from here reads as "openwaters.io". `utm_source` keeps that source
 * name and `utm_content` says which link was followed. slackwater.xyz pages carry
 * a canonical URL, so the tagged variants are not indexed separately.
 */
export function slackwaterLink(path: string, placement: string): string {
  const url = new URL(path, "https://slackwater.xyz");
  url.searchParams.set("utm_source", "openwaters.io");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_content", placement);
  return url.toString();
}
