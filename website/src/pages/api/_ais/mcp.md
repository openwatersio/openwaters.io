Ask Claude, ChatGPT, or an agent of your own about ship traffic. Open Waters AIS is an MCP (Model Context Protocol) server at `https://ais.openwaters.io/mcp`, with no account and no key. The assistant can look up the last report from a vessel, trace its route, or check which receivers have heard traffic in an area.

Coverage depends on what the receivers hear. Check the time of each report. For navigation and collision avoidance, use onboard instruments and official charts.

### What you can ask

**Track your fleet.** Where was MMSI 257123000 last heard? What destination and ETA did Viking Cinderella report? Where did she sail yesterday? Which of these ten vessels has not reported in the last half hour?

**Monitor your waters.** What is in the port of Rotterdam right now? List the tankers in the Great Belt. Is anything within five miles of 59.9 N, 10.7 E? What is around the ferry Pearl Seaways?

**Check coverage.** Do you cover the Gulf of Mexico? How fresh is the data around Helsinki? Which stations hear Bergen?

Area and radius searches show vessels heard in the last 30 minutes. Searches by name or MMSI can return older reports. For continuous updates, use the [WebSocket](#stream-v1).

### Enable it

**Ask your assistant.** Most agents that can edit their own configuration will do this for you. Tell Claude Code, Cursor, or whatever you use: "Add the Open Waters AIS MCP server at https://ais.openwaters.io/mcp". Check that it chose the Streamable HTTP transport with no authentication. The manual steps below are for clients that cannot, and for anyone who wants to see what changes.

**Claude Code:**

```
claude mcp add --transport http open-waters-ais https://ais.openwaters.io/mcp
```

**Claude.ai and Claude Desktop:** In Customize → Connectors, add a custom web connector named **Open Waters AIS**. Enter `https://ais.openwaters.io/mcp` and choose **No sign-in** if prompted. On Team and Enterprise plans, an organization owner can add it in organization settings. [Claude’s custom connector guide](https://claude.com/docs/connectors/custom/add-unlisted)

**ChatGPT:** Settings, Connectors, turn on Developer mode, then add `https://ais.openwaters.io/mcp` with no authentication.

**Cursor:** [Install in Cursor](https://cursor.com/en/install-mcp?name=open-waters-ais&config=eyJ1cmwiOiJodHRwczovL2Fpcy5vcGVud2F0ZXJzLmlvL21jcCJ9), or edit `~/.cursor/mcp.json` and add an entry to `mcpServers`:

```json
{
  "mcpServers": {
    "open-waters-ais": {
      "type": "http",
      "url": "https://ais.openwaters.io/mcp"
    }
  }
}
```

**VS Code:** [Install in VS Code](https://vscode.dev/redirect/mcp/install?name=open-waters-ais&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fais.openwaters.io%2Fmcp%22%7D), or edit `.vscode/mcp.json` and add an entry to `servers`:

```json
{
  "servers": {
    "open-waters-ais": {
      "type": "http",
      "url": "https://ais.openwaters.io/mcp"
    }
  }
}
```

**Gemini CLI:** Edit `~/.gemini/settings.json`, and add an entry to `mcpServers`:

```json
{
  "mcpServers": {
    "open-waters-ais": { "httpUrl": "https://ais.openwaters.io/mcp" }
  }
}
```

**Any other client:** Streamable HTTP, stateless, plain JSON responses. One request with no session works, which is also the quickest way to see what a tool returns:

```
curl -X POST https://ais.openwaters.io/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"find_vessels_near","arguments":{"lat":59.9,"lon":10.7,"radius_nm":5}}}'
```

### Authentication

Anonymous calls can search an area of up to 100 square degrees (about 10° by 10°) or look up 10 MMSIs at a time. A [personal token](#authentication) raises those limits to 400 square degrees and 50 MMSIs. Lookup by IMO number requires feeder or partner access. Every tier can see the IMO number when a vessel reports one. See [Limits](#limits) for the access tiers.

Send the token as an `Authorization: Bearer` header. Where to put it depends on the client:

- **Claude Code:** add `--header "Authorization: Bearer <token>"` to the `claude mcp add` command.
- **Cursor, VS Code, and Gemini CLI:** add `"headers": { "Authorization": "Bearer <token>" }` to the server entry.
- **Claude.ai and Claude Desktop:** if your custom connector has a **Request headers** section, choose **No sign-in** and set `Authorization` to `Bearer <token>`. Otherwise, use anonymous access.
- **ChatGPT:** use anonymous access.

Never put the token in the URL. A credential in a query string ends up in logs and browser history, and the MCP specification forbids it.

Each tool call counts toward the HTTP limit of 120 requests per minute. Area, radius, and name searches return up to 50 vessels by default, and tracks return up to 50 positions. Set `limit` to request up to 200.

### Tools

The server provides six read-only tools.

| Tool                     | Answers                                                                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_vessels`            | Last report and available particulars by MMSI, including destination and ETA. Lists identifiers the network has never heard. Feeder and partner access also allow lookup by IMO number. |
| `find_vessels_in_area`   | What is inside a bounding box, newest report first, with optional kind and ship-type filters.                                                                                           |
| `find_vessels_near`      | What is within a radius of up to 50 NM of a point or of another vessel, nearest first, with distance and bearing.                                                                       |
| `search_vessels_by_name` | MMSIs and last known positions for vessels whose names contain the search text, regardless of when they last reported.                                                                  |
| `get_vessel_track`       | Positions heard from one vessel, oldest first, with gaps marked in the default track. Covers the last 24 hours by default or a requested span of up to 366 days.                        |
| `get_coverage`           | Reporting sources and stations, feed delays, and vessel counts for an area. Counts cover the last 30 minutes by default. Use `max_age` to include older reports.                        |

Vessel rows carry `seen` and `age_s` for freshness, plus the source and station that heard the report. When available, they include the flag, ship type, navigational status, IMO number, call sign, destination, ETA, draught, and dimensions. The area, radius, and name searches take a `flag` filter, an ISO 3166-1 alpha-2 code such as `NO` or `MH`. When displaying vessels or tracks, include the source credits in `attribution`. For registered particulars from `get_vessels`, `provenance` identifies the source of each field and `sources` supplies its credit and license.
