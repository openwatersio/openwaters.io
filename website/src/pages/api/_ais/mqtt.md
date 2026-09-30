The realtime path for a receiver. AIS-catcher's MQTT output publishes each message as it is decoded, where its HTTP output batches on an interval, so this is how a station gets its data in with no delay and with credit. Needs a token.

```
AIS-catcher -Q wssmqtt://x:<token>@ais.openwaters.io:443/v1/stream MSGFORMAT NMEA
```

The port is required: AIS-catcher does not default it for `wssmqtt://`. `MSGFORMAT NMEA_TAG` also works and carries the receive time in a TAG block.

The same address as the [JSON stream](#stream-v1): a socket that negotiates the `mqtt` WebSocket subprotocol (binary frames) gets a receive-only MQTT 3.1.1 session instead of JSON frames. Any MQTT client that speaks WebSocket can publish to it:

- `CONNECT` carries the token as the password, or the socket carries it as `?key=` or a header like any `/v1/stream` connection. The username and client id are ignored. `CONNACK` answers `0x04` for a token that does not verify and `0x05` for one that may not publish or is used from outside its `cidr`, then the connection closes.
- `PUBLISH` payloads are newline-separated NMEA sentences, TAG blocks welcome, on any topic. QoS 0 is accepted silently, QoS 1 gets a `PUBACK`, and QoS 2 completes the handshake. Duplicate deliveries dedupe like any repeat.
- `SUBSCRIBE` is refused with `0x80` per filter. Read from the [streams](#live-traffic) instead.
- `PINGREQ` is answered. A keep-alive is honored when set; with none, the WebSocket ping keeps the session alive.
- Connects are limited per token, 20 a minute, applied once `CONNECT` has named the token. Over the limit, `CONNACK` answers `0x03` (server unavailable) and the connection closes.

Your station is your token's `sub`, and your messages appear with `source: station:<sub>` on the map, in the streams, and at `/v1/stations`, the same station as the HTTP and WebSocket paths. 6,000 sentences a minute per token, 1 MB per packet. Publishing is acceptance of the [contributor agreement](https://github.com/openwatersio/aiscast/blob/main/docs/contributor-agreement.md), linked from the upgrade response's `Link: rel="terms-of-service"` header.
