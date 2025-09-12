Playwright MCP Server Setup

Overview
- This project includes the official Playwright MCP server (`@playwright/mcp`).
- It exposes a Model Context Protocol server that MCP-capable clients (e.g., Claude Desktop, Codex MCP) can connect to and drive a real browser.

Install
- Already installed as a dev dependency: `@playwright/mcp` and `@playwright/test`.
- Browsers: `npx playwright install chromium` was run locally. Install others as needed.

Run locally
- Start the server:
  - `npm run mcp:playwright`
  - Defaults used here: headless, Chrome channel, SSE on port 3344.
  - Run `npx mcp-server-playwright --help` for available options (device emulation, timeouts, proxy, etc.).

Client configuration examples
1) Claude Desktop (servers section):
```
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["mcp-server-playwright", "--headless", "--browser=chrome", "--port=3344"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

2) Generic MCP client connecting over SSE:
- Connect to `http://localhost:3344/` per your client’s configuration.

Suggested usage for analytics verification
- Use MCP to:
  - Navigate to `/listings` with various filters.
  - Intercept network requests to Mixpanel endpoints.
  - Assert payloads for page_view, listing_view, listing_click, filters_change/apply.

Notes
- Device emulation: add `--device="iPhone 15"` to test mobile.
- Allowed/blocked origins: see `--allowed-origins` and `--blocked-origins` to constrain external loading.
- Traces: `--save-trace` and `--output-dir .playwright-traces` can help debugging.

