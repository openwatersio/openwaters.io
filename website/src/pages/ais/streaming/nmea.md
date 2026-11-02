---
layout: ../../../layouts/GuideLayout.astro
title: Raw NMEA to a plotter or Signal K
description: Feeders get everything aiscast hears back as NMEA sentences. Here is how to put that stream on a chartplotter, Signal K, or any other NMEA 0183 consumer.
---

`wss://ais.openwaters.io/v1/nmea` is the deduplicated stream as raw NMEA. It needs a token with the feeder tier, which a [personal token earns by feeding](/ais/contributing/udp/), or a commercial token. Anonymous and personal connections are refused.

Each WebSocket text frame is one AIS message: its sentences joined by CRLF, each with a NMEA 4.10 TAG block in front. The TAG block names the station that heard it (`s:`), the time (`c:`, unix seconds), and the licence the source publishes under (`t:`):

```
\s:2573010,c:1787234980,t:NLOD-2.0*2E\!BSVDM,1,1,,B,13noH:00000H@P@RSPEakGK@0D33,0*43
```

## Look at it first

[websocat](https://github.com/vi/websocat) prints frames as lines. Add a `bbox` of `minLat,minLon,maxLat,maxLon` to keep it to your waters. Repeat the parameter for more than one box, or leave it off for everything.

```sh
websocat -t 'wss://ais.openwaters.io/v1/nmea?key=<your token>&bbox=51,-11,53,-8'
```

## Bridge it to UDP

Chartplotters and Signal K read NMEA 0183 over UDP, not WebSockets. websocat bridges the two in one command, sending each frame as one datagram to a local port:

```sh
websocat -t 'wss://ais.openwaters.io/v1/nmea?key=<your token>&bbox=51,-11,53,-8' udp:127.0.0.1:10110
```

Then point the consumer at that port:

- **OpenCPN**: Options → Connections → Add Connection → Network, protocol UDP, address `0.0.0.0`, port `10110`. OpenCPN ignores everything before the `!` on each line, so the TAG blocks do no harm.
- **Signal K**: Server → Data Connections → Add, type NMEA 0183, source UDP, port `10110`. Signal K's NMEA 0183 parser accepts TAG blocks.
- **AIS-catcher, another aggregator client, or anything else that takes NMEA over UDP**: same port.

Run the bridge on the machine that runs the consumer, or replace `127.0.0.1` with the consumer's address on your LAN.

## Keep it running

websocat exits when the connection drops. A systemd unit restarts it:

```ini
[Unit]
Description=aiscast raw NMEA to local UDP
After=network-online.target

[Service]
ExecStart=/usr/bin/websocat -t 'wss://ais.openwaters.io/v1/nmea?key=<your token>&bbox=51,-11,53,-8' udp:127.0.0.1:10110
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Save it as `/etc/systemd/system/aiscast-nmea.service`, then `systemctl enable --now aiscast-nmea`. Keep `RestartSec` at a few seconds or more: the server allows 20 connections a minute per address and refuses a client that reconnects faster.

## What is in the feed

- **Everything aiscast hears**, from coastal authorities, partner aggregates, and volunteer receivers, with duplicates removed. A message heard by three stations arrives once.
- **`t:` tells you where it came from.** Receiver data is public domain (`CC0-1.0`). Government feeds carry their own licence tags. Messages rebuilt from a non-NMEA source (AISHub rows, Digitraffic JSON) are re-encoded as `!AIVDM` and tagged with the source's terms. Filter on `t:` if you only want data heard over VHF.
- **UDP stations arrive with a delay in trust.** A message from an unauthenticated UDP station is forwarded only after a trusted source has heard the same vessel in the last hour. Your own station's traffic reaches you faster if you feed with a token.
- **Your limits apply.** The feeder tier allows 5 concurrent streams and 200 messages a second per stream. Above the rate the stream is thinned, not cut. A whole-world subscription is roughly 90 messages a second today.

If a consumer rejects lines that start with a backslash, strip the TAG block on the way through instead of using websocat's UDP output:

```sh
websocat -t 'wss://ais.openwaters.io/v1/nmea?key=<your token>' | sed 's/^\\[^\\]*\\//' | nc -u 127.0.0.1 10110
```

The feed stops with a `401` when the token loses the feeder tier, which happens a day after its station stops feeding. It comes back when the station does.
