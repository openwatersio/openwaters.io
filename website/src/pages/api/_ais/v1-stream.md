Connect to `wss://ais.openwaters.io/v1/stream`, send a `subscribe` frame, and every AIS message from the area or vessels you asked for arrives as a JSON text frame. Add `?key=<token>` or `Authorization: Bearer` for higher limits and publishing.

### Messages you send

#### `subscribe`

Subscribe to bounding boxes, a list of MMSIs, or both. A message matches if it is inside any box or from any listed vessel, and MMSI matches include positionless messages such as static data. No events arrive until the first subscribe, and sending another replaces the subscription.

```json
{"type": "subscribe", "bbox": [[41.2, -71.2, 42.0, -70.0], [58.5, 9.5, 60.5, 11.5]]}
{"type": "subscribe", "mmsi": [368168720, 257090090]}
{"type": "subscribe", "bbox": [[41.2, -71.2, 42.0, -70.0]], "mmsi": [368168720], "snapshot": true}
```

Bounding boxes are `[minLat, minLon, maxLat, maxLon]`. Total box area and the number of MMSIs are capped by your tier (see Limits); a subscription over the cap gets an `error` frame and leaves the current subscription unchanged. Omitting both `bbox` and `mmsi` means everything, which only a token without an `area` cap may do.

Add `snapshot: true` to start with the last known state of every vessel that already matches: positions held up to 30 minutes, plus a static message when a name or ship type is known. Replayed frames keep their original `time` and do not count against your rate. Live events interleave with the replay, so a vessel can appear in both, but nothing falls in the gap. When the original message is no longer held, the frame is rebuilt from the vessel cache and marked `synthesized: true` with no `nmea` and no `id`.

#### `unsubscribe`

```json
{ "type": "unsubscribe" }
```

Stops events and keeps the socket open for publishing.

#### `register`

Creates a personal token in-band, equivalent to [`POST /v1/keys`](#post-v1-keys). Works on an anonymous socket only and shares that endpoint's rate limit.

```json
{
  "type": "register",
  "pubkey": "<base64url Ed25519 public key>",
  "bind_ip": false
}
```

The reply is a `key` frame, and the connection is upgraded to the token's tier in place with a fresh `welcome`.

#### `publish`

Send what your receiver hears on the same socket. Needs a token. Each frame is answered in order with an `ack`.

```json
{"type": "publish", "nmea": ["!AIVDM,1,1,,A,13HOI:0P0000VOHLCnHQKwvL05Ip,0*23", "\\s:st1,c:1787234980*03\\!AIVDM,..."]}
{"type": "publish", "replay": true, "nmea": ["\\c:1787234980123*2A\\!AIVDM,..."]}
```

At most 1,000 sentences per frame and 6,000 per minute per key. Set `replay: true` when sending an offline backlog: sentences whose TAG `c:` time is more than 60 s old are archived and credited but not emitted live. Publishing is acceptance of the contributor agreement linked from `welcome.terms`.

### Messages you receive

#### `welcome`

The first frame on every connection, with the limits in effect, so you can size boxes and pace reconnects without discovering limits by error.

```json
{
  "type": "welcome",
  "sub": "ed25519:abc...",
  "role": "personal",
  "feeder": false,
  "terms": "https://github.com/openwatersio/aiscast/blob/main/docs/contributor-agreement.md",
  "limits": {
    "conns": 2,
    "rate": 50,
    "area": 400,
    "mmsis": 50,
    "publish": true,
    "publish_per_min": 6000,
    "publish_frame": 1000,
    "connects_per_min": 20
  }
}
```

`conns` is concurrent streams, `rate` is messages a second per stream (excess events are thinned, and the stream stays up), `mmsis` is vessels followed by MMSI per subscription, and `area` is the total subscribed box area in square degrees (a 20°×20° box is 400, and MMSI-only subscriptions do not count). An absent limit is unlimited, and a `bbox` list, when present, names the boxes every subscription must fit inside. `feeder: true` means a personal token is currently earning the feeder tier. On an anonymous socket, `conns` and `connects_per_min` are shared by everyone behind your address.

#### `event`

One per decoded message, deduplicated across every receiver that heard it.

```json
{
  "type": "event",
  "id": "15f3d25469c1de49dbcb36baea34eed6",
  "time": "2026-08-20T15:25:54.342871Z",
  "source": "kystverket",
  "station": "kystverket/2573010",
  "channel": "A",
  "nmea": [
    "\\s:2573010,c:1787234980*03\\!BSVDM,1,1,,B,13noH:00000H@P@RSPEakGK@0D33,0*43"
  ],
  "mmsi": 257090090,
  "msg_type": "PositionReport",
  "lat": 59.88693333333333,
  "lon": 10.749376666666667,
  "message": {
    "MessageID": 1,
    "RepeatIndicator": 0,
    "UserID": 257090090,
    "Valid": true,
    "NavigationalStatus": 5,
    "...": "..."
  },
  "synthesized": false
}
```

- `msg_type` is the aisstream.io type name and `message` is the decoded payload, using go-ais field names (`UserID` is the MMSI).
- `lat`/`lon` are the vessel's last known position, present on static messages too, so you can place every message on a map. Absent until a position has been heard.
- `time` is when the message was transmitted: the source's timestamp when it is within 30 s of our receive time, else our receive time.
- `id` identifies the content, not the event. A static message rebroadcast unchanged every few minutes shares one `id`, so key events on `(id, time)`. Deduplicating on `id` alone drops the rebroadcasts.
- `source` and `station` say where it was heard: an open feed (`kystverket`, `barentswatch`, `digitraffic`, `aishub`, `aisstream`), an authenticated station (`http:<station>`, `v1:<sub>`), or a volunteer UDP receiver (`udp:<hash>`, or `mmsi:<n>` once it has sent its own position). `channel` is `A` or `B`, or empty when the source was not NMEA.
- `nmea` holds the sentences as received, or a re-encoded `!AIVDM` when the source was JSON rather than NMEA.
- `synthesized` is `true` for anything not heard over VHF: a message rebuilt from a JSON source, a vessel's own GPS report, or a snapshot reconstruction. Skip these if you only want receptions.

#### `ack`

One per `publish` frame, in order, with the number of sentences accepted.

```json
{ "type": "ack", "n": 2 }
```

#### `key`

The reply to `register`: the new token and its claims.

```json
{ "type": "key", "token": "ak1....", "claims": { "...": "..." } }
```

#### `error`

```json
{ "type": "error", "error": "bbox not allowed for this key" }
```

A bad token or too many concurrent connections is followed by close 1008. A subscription or publish the tier does not allow is not; the socket stays open and the current subscription is unchanged. Inbound frames are limited to 256 KB, and a client that cannot keep up is closed with 1008 "client too slow".
