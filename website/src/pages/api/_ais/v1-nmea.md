Raw NMEA sentences for a chartplotter, OpenCPN, or your own decoder: every message Open Waters hears, deduplicated across all receivers, on `wss://ais.openwaters.io/v1/nmea`. It needs a token at the feeder tier or above, which a personal token earns by feeding 1,000 messages a day. Add `?bbox=minLat,minLon,maxLat,maxLon` (repeatable) to limit it to an area.

[websocat](https://github.com/vi/websocat) prints frames as lines:

```sh
websocat -t 'wss://ais.openwaters.io/v1/nmea?key=<your token>&bbox=51,-11,53,-8'
```

Chartplotters and Signal K read NMEA 0183 over UDP, not WebSockets. The same command bridges the two, sending each frame as one datagram to a local port. Point OpenCPN or Signal K at UDP port 10110 on that machine:

```sh
websocat -t 'wss://ais.openwaters.io/v1/nmea?key=<your token>&bbox=51,-11,53,-8' udp:127.0.0.1:10110
```

One text frame per message, sentences joined by CRLF. Each carries a NMEA 4.10 TAG block naming the station (`s:`), the time it was heard (`c:`, unix seconds), and the license its source publishes under (`t:`):

```
\s:2573010,c:1787234980,t:NLOD-2.0*2E\!BSVDM,1,1,,B,13noH:00000H@P@RSPEakGK@0D33,0*43
```

Messages from JSON sources (Digitraffic, AISHub, aisstream.io) are re-encoded as `!AIVDM` with `t:` naming their terms. Filter on `t:` if you only want receiver data. A message heard only by an unauthenticated UDP receiver is included once a trusted source has heard the same vessel.
