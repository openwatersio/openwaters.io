import assert from "node:assert/strict";
import { test } from "node:test";

import { jsonLd, organization, place } from "./schema.ts";

test("jsonLd: a station name cannot close the script tag", () => {
  const html = jsonLd(
    place({ name: "</script><img src=x>", latitude: 1, longitude: 2 }),
  );
  assert.ok(!html.includes("</script>"));
  assert.ok(!html.includes("<img"));
  // Still valid JSON, and the name survives intact once parsed.
  assert.equal(JSON.parse(html).name, "</script><img src=x>");
});

test("place: geo carries the station position", () => {
  const schema = place({
    name: "HONOLULU",
    latitude: 21.3,
    longitude: -157.86,
  });
  assert.equal(schema.geo.latitude, 21.3);
  assert.equal(schema.geo.longitude, -157.86);
});

test("place: address is omitted rather than emitted empty", () => {
  assert.ok(!("address" in place({ name: "A121", latitude: 1, longitude: 2 })));
});

test("place: address carries whichever of region and country exist", () => {
  const schema = place({
    name: "BOSTON",
    latitude: 42.35,
    longitude: -71.05,
    region: "MA",
    country: "United States",
  });
  assert.deepEqual(schema.address, {
    "@type": "PostalAddress",
    addressRegion: "MA",
    addressCountry: "United States",
  });
});

test("organization: contactPoint carries the support email", () => {
  const schema = organization("hello@openwaters.io");
  assert.equal(schema.email, "hello@openwaters.io");
  assert.deepEqual(schema.contactPoint, {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "hello@openwaters.io",
    availableLanguage: "English",
  });
});
