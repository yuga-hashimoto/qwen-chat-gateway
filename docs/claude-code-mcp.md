# Claude Code MCP Integration

This document outlines how to integrate **Qwen Chat Gateway** with **Claude Code** (or any other MCP-compatible client) using the Model Context Protocol (MCP).

## Configuration Steps

### 1. Show the Configuration Snippet
Run the CLI helper to print the JSON structure needed for your configuration:
```bash
qwen-gateway mcp install-config
```

Example Output:
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

### 2. Add to Claude Code Config
Add the snippet above to your Claude Code global configuration file (typically located at `~/.claude.json` or `~/.config/claude/config.json` depending on your environment):

```bash
# Edit your claude config and insert the server structure under "mcpServers"
```

## Available MCP Tools

Once connected, the following tools will be exposed to your LLM workspace:

### 1. `qwen_chat`
- **Purpose**: Prompts Qwen Chat Web for a text response.
- **Arguments**:
  - `prompt` (string, required): Input prompt.
  - `mode` (string, optional): `'auto'` | `'thinking'` | `'fast'`.
  - `webSearch` (boolean, optional): Toggle web search.

### 2. `qwen_chat_with_file`
- **Purpose**: Uploads a local file and sends a chat prompt.
- **Arguments**:
  - `prompt` (string, required)
  - `filePath` (string, required): Absolute path to the file.
  - `mode` (string, optional)

### 3. `qwen_generate_image`
- **Purpose**: Generates an image and returns metadata including the local absolute path.
- **Arguments**:
  - `prompt` (string, required)
  - `size` (string, optional): e.g. `'1024x1024'`.
  - `responseFormat` (string, optional): `'path'` | `'url'` | `'b64_json'`.

### 4. `qwen_generate_video`
- **Purpose**: Generates a video and returns job status or finished MP4 path.
- **Arguments**:
  - `prompt` (string, required)
  - `duration` (number, optional): Default: `5` seconds.
  - `wait` (boolean, optional): Wait for generation completion.

### 5. `qwen_import_latest_image` / `qwen_import_latest_video`
- **Purpose**: Imports the latest downloaded image/video from Downloads, saves it to artifacts, and **deletes the original downloaded file** to keep things clean.
- **Arguments**:
  - `downloadsDir` (string, optional): Custom Downloads path.

### 6. `qwen_browser_doctor`
- **Purpose**: Returns diagnostic info (browser path, login state, challenge state).
