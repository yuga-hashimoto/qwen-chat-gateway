# Qwen Chat Gateway

Qwen Chat Gateway is built to help developers discover and integrate Qwen's high-quality chat, image, video, and artifact-generation capabilities into local workflows, while avoiding stealth, bypass, or abuse-oriented automation.

It is an unofficial local browser gateway that wraps your visible, logged-in browser session into a standard OpenAI-compatible API and a Model Context Protocol (MCP) server.

---

## Why Qwen?

Qwen is still less widely adopted than some other AI chat platforms, but it offers a surprisingly strong set of capabilities: high-quality chat, reasoning modes, image generation, video generation, file understanding, web search, slides, and artifact-style creation.

This project focuses on Qwen because we believe more developers should be able to discover and use these capabilities in real development workflows. Qwen Chat Gateway makes Qwen easier to integrate with local tools, automation workflows, and Claude Code by wrapping the user's own visible Qwen Chat Web session in a lightweight local gateway.

The goal is not to exploit Qwen or bypass paid APIs. The goal is to make Qwen more accessible, more useful, and easier to adopt for developers who already use Qwen Chat in their browser.

Qwen Chat Gateway is built as a local productivity and integration tool. It is not designed for abuse, mass automation, account farming, hidden API scraping, CAPTCHA bypassing, rate-limit circumvention, or evading Qwen's protections.

---

## Responsible Use

Qwen Chat Gateway is an unofficial local browser gateway for Qwen Chat. It uses the user's own visible, persistent Qwen Chat Web session and exposes local API and MCP interfaces for personal development workflows.

This project does not bypass CAPTCHA, login requirements, rate limits, provider protections, or account restrictions. It does not implement stealth automation, proxy rotation, account rotation, hidden token extraction, or hidden API scraping.

Users are responsible for complying with Qwen's terms of service, applicable laws, and any usage limits that apply to their account.

The purpose of this project is to promote legitimate and respectful use of Qwen, help developers integrate Qwen into their local workflows, and make Qwen's high-quality chat, image, video, and artifact-generation capabilities easier to access.

This project is **not** intended to abuse Qwen or bypass protections.

---

## How It Compares to CatGPT-Gateway

Like GautamVhavle/CatGPT-Gateway, Qwen Chat Gateway runs a local gateway controlling a logged-in browser session using the user's existing web account and exposes local endpoints.

### Why it is Lighter:
1. **No Express/Fastify**: Uses Node's built-in `node:http` module to serve requests, removing large dependency trees.
2. **No Bundled Playwright Browsers**: Uses `playwright-core` to reuse your existing Chrome/Edge installation instead of forcing a massive browser package download.
3. **No Database/Ledgers**: Runs purely in memory and files, with no database, tracking state, daily limits, or complicated database ledgers.
4. **No Stealth Plugins**: Standard automation without spoofing fingerprints or evading provider security controls.

---

## Installation

```bash
# Clone the repository
git clone https://github.com/yuga-hashimoto/qwen-chat-gateway.git
cd qwen-chat-gateway

# Install dependencies
npm install

# Build the project
npm run build

# Link binary globally
npm link
```

---

## First Browser Login

Before you start using the gateway, you must open the browser once to log in manually:
```bash
qwen-gateway browser open
```
This launches a browser page navigated to Qwen Chat Web. Log in manually. Once logged in, close the browser. Your login session will persist inside `./browser_data/qwen`.

---

## CLI Usage

Start the gateway server:
```bash
qwen-gateway serve --port 8787
```

Check browser context health:
```bash
qwen-gateway browser doctor
```

Ask Qwen directly:
```bash
qwen-gateway chat "What is quantum computing?" --mode thinking
```

Generate an image:
```bash
qwen-gateway image "A vintage car driving on a coastal road during sunset" --response-format path
```

---

## API Server Endpoints

Once `qwen-gateway serve` is running, the server exposes the following routes:

### 1. `GET /health`
```json
{
  "status": "ok",
  "version": "0.1.0",
  "name": "Qwen Chat Gateway",
  "provider": "qwen-chat-web"
}
```

### 2. `POST /v1/chat/completions` (OpenAI-compatible)
```bash
curl -X POST http://127.0.0.1:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-web",
    "messages": [{"role": "user", "content": "Explain async/await"}],
    "extra_body": {
      "mode": "thinking",
      "web_search": true
    }
  }'
```

### 3. `POST /v1/images/generations` (OpenAI-compatible)
Generates an image, saves it to `artifacts/images/YYYY-MM-DD/`, and deletes original browser temp files.
```json
{
  "created": 1717311100,
  "data": [
    {
      "path": "./artifacts/images/2026-06-02/qwen-image-img-xyz.png",
      "url": "http://127.0.0.1:8787/artifacts/images/2026-06-02/qwen-image-img-xyz.png"
    }
  ]
}
```

### 4. `POST /v1/videos/generations` (Custom Endpoint)
```json
{
  "id": "vid-xyz",
  "object": "video.generation",
  "created": 1717311100,
  "status": "completed",
  "data": [
    {
      "path": "./artifacts/videos/2026-06-02/qwen-video-vid-xyz.mp4",
      "url": "http://127.0.0.1:8787/artifacts/videos/2026-06-02/qwen-video-vid-xyz.mp4"
    }
  ]
}
```

---

## Claude Code MCP Setup

Add the following to your `~/.claude.json` configuration file:
```json
{
  "mcpServers": {
    "qwen-chat-gateway": {
      "command": "qwen-gateway",
      "args": ["mcp", "serve"],
      "env": {
        "QWEN_WEB_URL": "https://chat.qwen.ai",
        "QWEN_BROWSER_USER_DATA_DIR": "./browser_data/qwen"
      }
    }
  }
}
```

---

## Selector Troubleshooting

If Qwen's UI changes, you do not need to modify code. You can override specific DOM selectors via environment variables in `.env`:
- `QWEN_SELECTOR_CHAT_INPUT` (defaults to `textarea`)
- `QWEN_SELECTOR_SEND_BUTTON` (defaults to `button[type="submit"]`)
- `QWEN_SELECTOR_DOWNLOAD_BUTTON` (defaults to `button:has-text("Download")`)

See [docs/selectors.md](file:///Volumes/MOVESPEED/Documents/GitHub/qwen-chat-gateway/docs/selectors.md) for more details.

---

## Limitations

- **UI Sensitivity**: Changes in Qwen's front-end code might temporarily break element targeting. Set environment variables to override broken selectors.
- **No Daily Limits**: There is no daily limit constraint built in. However, to protect accounts, concurrency is locked to 1 with an active rate-limiting interval between runs.
- **Challenge Pauses**: If CAPTCHA or safety blocks appear, manual intervention in the visible browser is required to resolve it.

---

## FAQ

#### Can I run this headlessly?
Yes, set `QWEN_BROWSER_HEADLESS=true` in `.env`, but manual logins and CAPTCHAs will not be visible and will cause the gateway to pause with an error.

#### What happens to my downloaded files?
When downloading images/videos, the gateway reads files into buffer, saves them to the configured `QWEN_ARTIFACTS_DIR` path, and deletes the browser's original temp download files to prevent local disk clutter.