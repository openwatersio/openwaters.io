# AIS-catcher receiver setup

Existing AIS-catcher users can connect a working receiver through its web GUI without downloading or editing a configuration file.

The token page leads with an expanded Web GUI path, followed by expandable Command line and New installation paths. A selectable, read-only MQTT URL includes the station token and explicit port 443, with a copy button and manual-copy fallback. Shared GUI instructions explain the Control entry, the Statistics → System route in older versions, Output → MQTT → Add, NMEA message format, and saving/applying the output. An annotated screenshot illustrates the relevant controls without exposing a real token.

UDP address binding is unchecked inside an advanced disclosure. Its copy explains UDP credit, the restriction to the current public IP address, and that MQTT/HTTP users should leave it unchecked. All guides referring to the checkbox use its new label.

The existing station reception indicator follows the AIS-catcher setup paths. Check now refreshes it without reissuing a token; an in-flight check marks the button unavailable without dropping keyboard focus. Missing/stale reception offers checks for local traffic, an enabled output, and NMEA format without claiming to diagnose the cause. Automatic polling remains once per minute.

Approaches considered: documentation alone leaves the URL trapped in a download; a website GUI path supplies the exact values and confirmation; an upstream preset would automate more but depends on another project. The user selected the website changes and deferred the preset.

Keep the existing Astro, Tailwind, token identity, station endpoint, agreement, and new-install configuration. Add no dependencies or server changes. GUI labels can vary by AIS-catcher version; the builder verifies a current reference and states any mismatch. Clipboard failure and unavailable station status must leave the token and URL usable.

The screenshot uses the upstream AIS-catcher frontend at `9c2e08b9ac19330cf3b8915c3cf814cb2e7fb3fc`, rendered locally with a fixture configuration and `YOUR_TOKEN` placeholder. Browser annotations highlight the URL, Advanced settings, and NMEA controls.
