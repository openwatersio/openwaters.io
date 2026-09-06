To keep the service sustainable, we have limits on how much data you can request. The limits are based on the token you use to access the service. If you read without a token, you are on the anonymous tier. See [Authentication](#authentication).

**Feeder** is a personal token whose stations delivered at least 1,000 messages in the last 24 hours. It is treated as the feeder tier for as long as they keep feeding. The tier lapses when the station stops and comes back when it resumes.

**Need more?** [Email us](mailto:hello@openwaters.io) with what you are building.

|                                        | Anonymous     | Personal | Feeder    | Partner / admin |
| -------------------------------------- | ------------- | -------- | --------- | --------------- |
| Concurrent streams                     | 2 per address | 2        | 5         | as issued       |
| Messages/s per stream (excess thinned) | 20            | 50       | 200       | as issued       |
| Subscribed area (sq °)                 | 100           | 400      | unlimited | as issued       |
| Vessels followed by MMSI per stream    | 10            | 50       | 200       | as issued       |
| Raw NMEA feed                          | no            | no       | yes       | yes             |
| Publish                                | no            | yes      | yes       | yes             |

- 32 concurrent streams per network address across all tokens, and 20 WebSocket connects per minute per address.
- 120 requests per minute per address on the HTTP endpoints, and 10 per minute on `POST /v1/keys` and in-band `register`.
- 500 UDP sentences a second per source address.
- A client that falls 1,024 events behind is disconnected.
- Publishing: 6,000 sentences a minute and 1,000 per frame on the WebSocket, 600 posts a minute and 1 MB per post on `/v1/receive`.
