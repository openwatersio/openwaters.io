import assert from "node:assert/strict";
import { test } from "node:test";

import { faqPage, jsonLd, organization, website } from "./schema.ts";

test("jsonLd: a value cannot close the script tag", () => {
  const html = jsonLd({ name: "</script><img src=x>" });
  assert.ok(!html.includes("</script>"));
  assert.ok(!html.includes("<img"));
  // Still valid JSON, and the name survives intact once parsed.
  assert.equal(JSON.parse(html).name, "</script><img src=x>");
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

test("organization: public service offers distinguish free access from paid commercial plans", () => {
  const offers = organization("hello@openwaters.io").makesOffer;
  assert.ok(offers.length > 0);
  for (const offer of offers) {
    assert.equal(offer["@type"], "Offer");
    assert.equal(offer.itemOffered["@type"], "Service");
    assert.ok(offer.itemOffered.name);
    assert.ok(offer.url.startsWith("https://openwaters.io/"));
  }
  const free = offers.filter((offer) => "price" in offer);
  assert.equal(free.length, 4);
  for (const offer of free) {
    assert.equal(offer.price, 0);
    assert.equal(offer.priceCurrency, "USD");
  }
  const commercial = offers.find(
    (offer) => offer.name === "Open Waters AIS Commercial",
  )!;
  assert.ok(commercial);
  assert.ok(!("price" in commercial));
  assert.match(commercial.description, /Paid.*\$49/);
  assert.equal(commercial.url, "https://openwaters.io/ais/pricing/");
});

test("website: names Open Waters and keeps the domain as a fallback", () => {
  assert.deepEqual(website, {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Open Waters",
    alternateName: "openwaters.io",
    url: "https://openwaters.io/",
  });
});

test("faqPage: absolute url and one Question per item", () => {
  assert.deepEqual(faqPage("/ais/", [{ q: "Is it free?", a: "Yes." }]), {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: "https://openwaters.io/ais/",
    publisher: {
      "@type": "Organization",
      name: "Open Waters",
      url: "https://openwaters.io",
    },
    mainEntity: [
      {
        "@type": "Question",
        name: "Is it free?",
        acceptedAnswer: { "@type": "Answer", text: "Yes." },
      },
    ],
  });
});
