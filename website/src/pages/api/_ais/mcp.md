Five read-only tools over the same vessel cache as `/v1/vessels`, for Claude, ChatGPT, Cursor, VS Code, Claude Code, and any other client that speaks the Model Context Protocol. No sign-in. The server describes itself on connect, so an assistant learns the coverage caveats and the credit line before its first question.

| Tool                     | Answers                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `get_vessels`            | Current position and details for a list of MMSIs, and which of them have not been heard in the last 30 minutes.   |
| `find_vessels_in_area`   | What is inside a bounding box, newest report first, with optional kind and ship-type filters.                     |
| `find_vessels_near`      | What is within a radius of up to 50 NM of a point or of another vessel, nearest first, with distance and bearing. |
| `search_vessels_by_name` | Vessels whose name contains the text, to turn a name into an MMSI.                                                |
| `get_coverage`           | Which sources and stations are delivering, how fresh they are, and whether a box has any coverage at all.         |

Every row carries decoded labels (`type_name`, `nav_status_name`) beside the codes, `seen` and `age_s` for freshness, and every result an `attribution` map with the credit line per source. A result says when it cut the list, so the assistant can narrow the question.

**Limits.** The tiers in [Limits](#limits) apply per call. Anonymous callers may cover 100 square degrees and look up 10 MMSIs at a time; a personal token allows 400 and 50. A call returns at most 200 rows, 50 unless asked, and calls share the 120-per-minute HTTP limit. To use a token, put it in an `Authorization: Bearer` header in the client's server configuration, never in the URL.

**Connect.** Claude Code:

```
claude mcp add --transport http aiscast https://ais.openwaters.io/mcp
```

Claude.ai and Claude Desktop: Settings, Connectors, Add custom connector, paste `https://ais.openwaters.io/mcp`, and leave authentication empty. A free plan allows one custom connector.

ChatGPT: Settings, Connectors, turn on Developer mode, then add the URL with no authentication.

Cursor (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "aiscast": { "type": "http", "url": "https://ais.openwaters.io/mcp" }
  }
}
```

VS Code (`.vscode/mcp.json`) takes the same entry under `servers` instead of `mcpServers`. Gemini CLI (`~/.gemini/settings.json`) takes `{ "mcpServers": { "aiscast": { "httpUrl": "https://ais.openwaters.io/mcp" } } }`.

Any other client: Streamable HTTP, stateless, plain JSON responses. One request with no session works:

```
curl -X POST https://ais.openwaters.io/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"find_vessels_near","arguments":{"lat":59.9,"lon":10.7,"radius_nm":5}}}'
```

**Try asking.** What is in Oslo harbour right now? Is there a tanker within 20 miles of Hanko? Where is Viking Cinderella? Do you cover the Gulf of Mexico?

The server holds no history, ports, weather, or ownership data, and an assistant asks one question at a time. For continuous updates use the [WebSocket](#stream-v1).
