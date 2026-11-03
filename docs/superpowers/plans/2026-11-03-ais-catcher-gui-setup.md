# AIS-catcher GUI setup implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan in the current session.

**Goal:** Connect an existing AIS-catcher receiver from the web GUI using a copied URL and explicit NMEA instructions.

**Architecture:** Keep token issuance and station status in the existing Astro script. Share static GUI directions across the token and contribution pages; preserve CLI and new-install configuration paths.

**Tech stack:** Astro, TypeScript, Tailwind, Node test runner, existing Playwright.

**Spec:** `docs/superpowers/specs/2026-11-03-ais-catcher-gui-setup-design.md`

## Constraints and review focus

- No dependencies, backend changes, or upstream preset.
- Keep token regeneration, restored tokens, and UDP setup working.
- Copy failure leaves a selectable URL; never send token-bearing URLs to analytics.
- Status failure is distinct from no reception; manual checks reuse the current station.
- Setup remains readable on mobile and keyboard accessible.

## Task 1: Receiver setup and confirmation

- [x] Extend `website/src/utils/token-page.test.ts` to verify copying the complete current URL, clipboard failure, status refresh after a manual check, in-flight button behavior, and missing/stale reception hints. Run the new tests and confirm failures before implementation.
- [x] Update `website/src/pages/ais/token.astro` with advanced UDP settings, Web GUI/Command line/New installation disclosures, copyable URL, reception status placement and Check now. Reuse `aiscatcherConfig(token)` for the URL so the download and GUI cannot diverge.
- [x] Add shared GUI directions in `website/src/components/ais/AisCatcherGuiSetup.astro`, with a URL slot, explicit NMEA guidance, verified navigation, and an annotated screenshot from a local reference instance.
- [x] Update `website/src/pages/ais/contribute.astro` and `website/src/pages/ais/ais-catcher.astro` to expose the GUI path and align UDP label references.
- [x] Run `npm test -w website`, `npm run build`, `npm run build -w api`, and `npm run check:gateway`; inspect desktop/mobile setup and exercise copy, fallback, and status behavior in a browser.
- [x] Review the complete diff and record any remaining limitations before reporting the work.

## Verification

All 174 website tests pass, including restored/regenerated URL copying, clipboard failure, manual status refresh, concurrent checks, and status error recovery. The website build, API build, gateway type check, Prettier check, and diff whitespace check pass. Chrome checks cover token generation with fixture responses, URL copying, clipboard denial and manual selection, private config download, screenshot loading, CLI disclosure, and desktop/mobile layout. Independent review found no actionable issues. Live receiver connectivity and screen-reader behavior remain untested.
