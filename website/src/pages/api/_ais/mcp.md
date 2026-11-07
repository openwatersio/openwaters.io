Ask Claude, ChatGPT, or an agent of your own about ship traffic. `https://ais.openwaters.io/mcp` is an MCP (Model Context Protocol) server with six read-only tools: vessels by MMSI, vessels in an area, vessels near a point or another vessel, search by name, a vessel's track, and coverage. It uses Streamable HTTP, with no account and no key, and a [token](#authentication) in an `Authorization: Bearer` header raises the anonymous limits.

Claude has it in its [connector directory](https://claude.ai/directory/open-waters-ais). In Claude Code:

```
claude mcp add --transport http open-waters-ais https://ais.openwaters.io/mcp
```

Setup for ChatGPT, Cursor, VS Code, and Gemini CLI, the questions it answers, and every tool are on the [Open Waters AIS MCP server](/ais/mcp/) page. Not for navigation or collision avoidance: use onboard instruments and official charts.
