The same events over plain HTTP, for `curl`, a browser's `EventSource`, or anything that would rather not carry a WebSocket library. Same tokens, same limits, subscribe only.

```
curl -N 'https://ais.openwaters.io/v1/stream?bbox=41.2,-71.2,42.0,-70.0&mmsi=368168720&snapshot=1'
```

The subscription comes from the query string and is fixed for the life of the connection: `bbox=minLat,minLon,maxLat,maxLon` (repeatable), `mmsi=<mmsi>,<mmsi>,...`, `snapshot=1`, and `key=<token>`. They match the way the WebSocket `subscribe` frame does.

Every frame is one `data:` line holding the same JSON the WebSocket sends, a `welcome` first and then `event` frames. Tell them apart by their `type` field; there is no SSE event name, so `EventSource.onmessage` sees all of them:

```
data: {"type":"welcome","sub":"anon:203.0.113.4","role":"anonymous","terms":"https://github.com/openwatersio/aiscast/blob/main/docs/contributor-agreement.md","limits":{"conns":2,"rate":20,"area":100,"mmsis":10,"publish":false,"connects_per_min":20}}

data: {"type":"event","id":"15f3d254...","time":"2026-08-20T15:25:54.342871Z","mmsi":257090090,"...":"..."}

```

Good to know:

There is no resume on reconnect. Use `snapshot=1` to rebuild current state instead. A `:` comment arrives every 30 seconds while the stream is idle, so proxies do not drop a quiet subscription.

Send `Accept-Encoding: gzip` and the stream is compressed, flushed per event.

A bad request is an HTTP status, not a frame: `400` for a malformed or over-limit subscription (an unparseable MMSI is refused rather than dropped), `401` for a bad token, `429` for the connect or concurrent-connection caps. A client that falls behind receives `{"type":"error","error":"client too slow"}` and the stream ends.
