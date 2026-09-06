Point your receiver at `ais.openwaters.io` port 10110. No token, no sign-up. AIS-catcher, rtl-ais, and most other decoders can send UDP out of the box:

```
AIS-catcher -u ais.openwaters.io 10110
```

Send newline-separated NMEA (`!AIVDM`, `!AIVDO`, `!BSVDM`, and friends, TAG blocks welcome, lines up to 4 KB), at up to 500 sentences a second. Your station appears as `udp:<hash>` (never your address), or as `mmsi:<n>` once it has sent its own `!AIVDO` position.

**Want credit for what you feed?** Create a [personal token](#authentication) with `bind_ip: true` from the same address. The station then counts toward that token's feeder tier, which raises your stream limits and opens the raw NMEA feed.

UDP is unauthenticated, so it is the lowest-trust path. Your messages show on the map and in the streams with their `source`, but they are forwarded to AISHub and the raw NMEA feed only while a trusted source has heard the same vessel within the last hour, and a position implying more than 120 knots from the vessel's last known position is archived rather than shown.
