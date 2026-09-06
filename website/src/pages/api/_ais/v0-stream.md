Already using aisstream.io? Point your client at `wss://ais.openwaters.io/v0/stream` and use an Open Waters token as the `APIKey`. Nothing else changes: this endpoint is frozen to aisstream.io's wire format.

Send one subscribe message within 3 seconds of connecting:

```json
{
  "APIKey": "ak1....",
  "BoundingBoxes": [
    [
      [58.5, 9.5],
      [60.5, 11.5]
    ]
  ],
  "FiltersShipMMSI": ["257090090"],
  "FilterMessageTypes": ["PositionReport", "ShipStaticData"]
}
```

- `APIKey` and `BoundingBoxes` are required. Keys are case-insensitive.
- Each box is two `[lat, lon]` corners in any order, and several boxes are ORed together.
- `FiltersShipMMSI` takes up to 50 nine-digit strings (more if the token allows). With a list present, the boxes are not counted against the token's area cap, so a world box plus an MMSI list is fine on a personal token.
- `FilterMessageTypes` takes any of the 24 aisstream.io type names.
- Sending another subscribe message replaces the subscription.

Each frame is one decoded message in aisstream.io's shape:

```json
{
  "Message": {
    "PositionReport": {
      "Cog": 36.7,
      "Latitude": 49.47557666666667,
      "Longitude": 0.13138,
      "MessageID": 1,
      "NavigationalStatus": 0,
      "Sog": 0,
      "TrueHeading": 511,
      "UserID": 227006760,
      "Valid": true,
      "...": "..."
    }
  },
  "MessageType": "PositionReport",
  "MetaData": {
    "MMSI": 227006760,
    "MMSI_String": 227006760,
    "ShipName": "",
    "latitude": 49.47557666666667,
    "longitude": 0.13138,
    "time_utc": "2026-08-20 15:21:32.794168 +0000 UTC"
  }
}
```

`MetaData.latitude/longitude` are the vessel's last known position, which is how positionless messages such as static data reach your bounding box. Messages from vessels with no known position are not delivered. Decoded fields use go-ais naming and AIS sentinel values (`TrueHeading: 511`, `Cog: 360`, `Sog: 102.3`).

Errors close the connection with a single frame: `{"error": "Api Key Is Not Valid"}`, `{"error": "Subscription Object Is Malformed"}`, `{"error": "Bounding Box Not Allowed For This Key"}`, `{"error": "Too Many MMSI Filters For This Key"}`, or `{"error": "concurrent connections per user exceeded"}`. A client that cannot keep up is closed with code 1008 "client too slow".
