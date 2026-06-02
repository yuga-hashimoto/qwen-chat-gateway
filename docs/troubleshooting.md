# Troubleshooting Guide

This guide helps resolve common issues encountered when setting up or running **Qwen Chat Gateway**.

---

## 1. Browser Executable Not Found

### Symptom
An error like `browser_launch_failed` is thrown, or the console complains:
`Could not locate Chrome or Edge installation.`

### Resolution
- The gateway automatically searches default installation locations on MacOS, Windows, and Linux.
- If your browser is installed in a non-standard directory, manually specify the executable path in `.env`:
  ```bash
  QWEN_BROWSER_EXECUTABLE_PATH="/path/to/your/chrome/or/edge"
  ```
- Alternatively, pass it on startup:
  ```bash
  qwen-gateway serve --browser-executable "/path/to/chrome"
  ```

---

## 2. Login Required

### Symptom
An error like `qwen_not_logged_in` (Status 401) is returned.

### Resolution
- The gateway **does not** automate login to protect your credentials.
- Run `qwen-gateway browser open` to spin up a persistent visible browser session.
- Log in to your Qwen account manually inside this window.
- Once logged in, close the browser or keep it open, and restart the gateway server. Your login session will persist in the directory defined by `QWEN_BROWSER_USER_DATA_DIR` (default: `./browser_data/qwen`).

---

## 3. Challenge / CAPTCHA Detected

### Symptom
The gateway halts execution and throws `qwen_challenge_detected` (Status 403).

### Resolution
- When Qwen triggers a security challenge (e.g. Cloudflare Turnstile, a puzzle slide, or verification prompt), the gateway stops automatically to prevent account suspension.
- Look at the visible browser session. Solve the puzzle or enter the requested verification code manually.
- The gateway will automatically resume processing requests once the screen clears.

---

## 4. Download Not Found

### Symptom
You get a `qwen_download_not_found` or `qwen_generation_timeout` error during image/video generation.

### Resolution
- The download manager waits for Playwright's download event.
- Ensure the Qwen UI actually triggered a download file. If the DOM download buttons changed, configure an override for:
  ```bash
  QWEN_SELECTOR_DOWNLOAD_BUTTON=".new-download-btn"
  ```
- Use `qwen-gateway import latest --type image` as a fallback command to pull your manually downloaded files from your Downloads folder.

---

## 5. Artifact Serving Errors

### Symptom
You get `Access Denied: Path Traversal Detected` or static files under `/artifacts` fail to load.

### Resolution
- The static file server strictly blocks path traversals using relative paths (e.g. `../`).
- Ensure the requested path is underneath your configured `QWEN_ARTIFACTS_DIR` (default: `./artifacts`).
- If you're running on Windows, make sure you configure your host and port correctly so that absolute URLs are generated with valid slashes.
