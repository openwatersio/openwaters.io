You can read without a token, within the anonymous tier in [Limits](#limits). A token raises those limits and lets you send data in.

**Get a token.** Create a personal token [in the browser](/ais/token/), or via the API with [`POST /v1/keys`](#post-v1-keys). Tokens never expire. See [Limits](#limits) for what a personal token allows.

**Send the token** as `Authorization: Bearer <token>`, as `?key=<token>` on the URL, as the `APIKey` field on the aisstream.io-compatible stream, or as an HTTP Basic password (`anything:<token>`, which is what AIS-catcher's `USERPWD` sends). A token that is invalid, expired, revoked, used from outside its `cidr`, or short of the role for the action is refused. It never falls back to anonymous access.
