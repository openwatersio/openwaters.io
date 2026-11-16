You can read without a token, within the anonymous tier in [Limits](#limits). A token raises those limits and lets you send data in.

**Send a `User-Agent`** that names your app, its version, and a URL or email address, such as `my-app/1.2 (you@example.org)`. Starting in 2027, requests without one are refused. Browsers send their own and need nothing. Station ingest, `/mcp` and `/v0/stream` aren't checked. See the [User-Agent policy](/api/user-agent/).

**Get a token.** Create a personal token [in the browser](/ais/token/), or via the API with [`POST /v1/keys`](#post-v1-keys). Tokens never expire. See [Limits](#limits) for what a personal token allows.

**Send the token** as `Authorization: Bearer <token>`, as `?key=<token>` on the URL, as the `APIKey` field on the aisstream.io-compatible stream, as an HTTP Basic password (`anything:<token>`, which is what AIS-catcher's `USERPWD` sends), or as the MQTT `CONNECT` password (`wssmqtt://x:<token>@…`). A token that is invalid, expired, revoked, used from outside its `cidr`, or short of the role for the action is refused. It never falls back to anonymous access.
