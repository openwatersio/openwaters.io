---
layout: ../../../layouts/GuideLayout.astro
title: Feeder access for a UDP station
description: Your receiver already sends to ais.openwaters.io over UDP. Bind a token to it and the station earns the feeder tier, including the raw NMEA feed back.
---

This page is for anyone feeding `ais.openwaters.io:10110` over UDP: docker-shipfeeder, AIS-catcher with `-u`, ais-forwarder, or any other NMEA forwarder. The data is arriving, and you can see your station on the [live map](https://openwatersio.github.io/aiscast/). What you do not have yet is the feeder tier, because a UDP datagram carries no identity. The server cannot tell which token, if any, belongs to your receiver.

Binding fixes that. A token bound to your network address claims every UDP station sending from that address. Once the station has delivered 1,000 messages in the last 24 hours, every connection the token makes gets the feeder tier: 5 concurrent streams, 200 messages a second, any subscribed area, the [raw NMEA feed](/ais/streaming/nmea/), and history when it exists.

## Bind a token to your station

1. Open [openwaters.io/ais/token](/ais/token/) from a browser on the same network as your receiver. The bind uses the public address the request comes from, so a laptop at home works and a phone on mobile data does not.
2. Accept the contributor agreement and tick **Also bind this network address**.
3. Generate the token and keep it. It never expires, and the page gives you the same token again from the same browser.

If your station is already feeding, the tier applies at once. Otherwise it arrives when the message count crosses 1,000 in a day, which a receiver in any busy waterway does within an hour or two.

## Check that it worked

Connect to the stream with your token and read the first frame. It is a `welcome` frame that names the limits in effect. With websocat:

```sh
echo '{"type":"subscribe","bbox":[[51,-11,53,-8]]}' | websocat -n 'wss://ais.openwaters.io/v1/stream?key=<your token>'
```

A feeder token gets `"feeder":true` in the welcome and `"conns":5`. Without those, the station is not yet counted. Check its numbers at `https://ais.openwaters.io/v1/stations/<station id>` using the `udp:…` id shown on the map, and confirm `last_24h` is over 1,000.

## Things to know

- **The token only works from the bound address.** Use it from the receiver's network, or from a machine that shares its public IP.
- **A changed IP needs a new token.** If your provider rotates addresses, mint again from the same browser. The token page will reuse your keypair, so the station id stays the same.
- **Carrier-grade NAT shares your address with strangers.** Some mobile and fibre providers put many customers behind one public IP. A bound token then claims their stations too, and theirs claims yours. Switch to the authenticated path below instead.
- **The tier follows the feed.** Stop feeding and the tier lapses after a day. Start again and it returns. Nothing to renew, nobody to email.
- **UDP is the low-trust path.** Messages from a UDP station show on the map and in the stream at once, but they are forwarded to partners and the raw feed only after another source has heard the same vessel. Authenticated stations do not have that hold.

## Better: send with the token

Binding is a workaround for the fact that UDP carries no token. If your receiver runs AIS-catcher, send over HTTP with the token instead. It works from any network, behind any NAT, and credits your station under your own id:

```sh
AIS-catcher ... -H https://ais.openwaters.io/v1/receive USERPWD x:<your token> GZIP on INTERVAL 15
```

Signal K users get the same result from the [signalk-aiscast](https://github.com/openwatersio/aiscast/tree/main/signalk-plugin#readme) plugin, which mints and uses its own token.

Questions, or a station that will not count: [hello@openwaters.io](mailto:hello@openwaters.io).
