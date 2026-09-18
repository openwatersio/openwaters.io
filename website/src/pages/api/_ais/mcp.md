Ask Claude, ChatGPT, or an agent of your own about ship traffic. Open Waters AIS is an MCP (Model Context Protocol) server at `https://ais.openwaters.io/mcp`, with no account and no key. The assistant learns the coverage caveats and the credit line when it connects, then answers from the same live positions the rest of the API serves.

### What you can ask

**Track your fleet.** Where is MMSI 257123000 right now? Where is Viking Cinderella going, and when does she arrive? What flag is IMO 9319466 under, and how long is she? Which of these ten vessels has not reported in the last half hour?

**Monitor your waters.** What is in the port of Rotterdam right now? List the tankers in the Great Belt. Is anything within five miles of 59.9 N, 10.7 E? What is around the ferry Pearl Seaways?

**Check coverage.** Do you cover the Gulf of Mexico? How fresh is the data around Helsinki? Which stations hear Bergen?

Every answer is the last report heard, up to 30 minutes old, and says when it was heard. The assistant answers one question at a time; for continuous updates use the [WebSocket](#stream-v1). Not for safety of navigation.

### Enable it

**Ask your assistant.** Most agents that can edit their own configuration will do this for you. Tell Claude Code, Cursor, or whatever you use: "Add the Open Waters AIS MCP server at https://ais.openwaters.io/mcp". Check that it chose the Streamable HTTP transport with no authentication. The manual steps below are for clients that cannot, and for anyone who wants to see what changes.

**Claude Code:**

```
claude mcp add --transport http open-waters-ais https://ais.openwaters.io/mcp
```

**Claude.ai and Claude Desktop:** Settings, Connectors, Add custom connector, paste `https://ais.openwaters.io/mcp`, and leave the OAuth fields empty. A free Claude plan allows one custom connector.

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

Without a token the assistant gets the anonymous limits, which cover most questions: an area of up to 100 square degrees, about 10° by 10°, or up to 10 vessels by MMSI per call. A [personal token](#authentication) raises that to 400 square degrees and 50 vessels, and the tool says so when a question exceeds the limit. Contributor and commercial tokens work the same way with their own limits; see [Limits](#limits).

Send the token as an `Authorization: Bearer` header. Where to put it depends on the client:

- **Claude Code:** add `--header "Authorization: Bearer <token>"` to the `claude mcp add` command.
- **Cursor, VS Code, and Gemini CLI:** add `"headers": { "Authorization": "Bearer <token>" }` to the server entry.
- **Claude.ai, Claude Desktop, and ChatGPT:** custom connectors take no headers, so these run at the anonymous limits.

Never put the token in the URL. A credential in a query string ends up in logs and browser history, and the MCP specification forbids it.

Each tool call is one request against the 120-per-minute HTTP limit, and a call returns at most 200 rows, 50 unless asked.

### Tools

Five read-only tools, so a client that asks before running write tools never prompts for these.

| Tool                     | Answers                                                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_vessels`            | Position and particulars for a list of MMSIs or IMO numbers: destination, ETA, draught, dimensions, call sign, flag, and which identifiers matched nothing in the last 30 minutes. |
| `find_vessels_in_area`   | What is inside a bounding box, newest report first, with optional kind and ship-type filters.                                                                                      |
| `find_vessels_near`      | What is within a radius of up to 50 NM of a point or of another vessel, nearest first, with distance and bearing.                                                                  |
| `search_vessels_by_name` | Vessels whose name contains the text, to turn a name into an MMSI.                                                                                                                 |
| `get_coverage`           | Which sources and stations are delivering, how fresh they are, and whether a box has any coverage at all.                                                                          |

Every row carries decoded labels (`type_name`, `nav_status_name`) beside the codes, `seen` and `age_s` for freshness, the flag from the MMSI, the source and station it came from, and, once the vessel's static data has been heard, its IMO number, call sign, destination, ETA, draught, length, and beam. The area, radius, and name searches take a `flag` filter. Every result carries an `attribution` map with the credit line per source, and says when it cut the list so the assistant can narrow the question.
