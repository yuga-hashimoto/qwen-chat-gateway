# Qwen Chat Features

This document explains why Qwen is a powerful platform for automation and integration, details the currently supported gateway features, and maps out future capabilities.

---

## Why Qwen?

While OpenAI, Claude, and Gemini dominate Western developers' mindshares, **Qwen** (developed by Alibaba) represents a highly competitive alternative. Key highlights include:
1. **Outstanding Reasoning**: The "Thinking Mode" enables Qwen to detail step-by-step logic, often matching or exceeding other reasoning models.
2. **Built-in Multimodal Features**: Offers high-quality image generation and video generation natively from chat prompt instructions.
3. **No-Cost Generous Tier**: Provides robust access to advanced features directly via their browser interface.
4. **Strong Code and Multilingual Understanding**: Highly proficient in Japanese, Chinese, English, and various coding syntaxes.

---

## Feature Matrix

Here is how Qwen Chat Web capabilities map to **Qwen Chat Gateway**:

| Web Feature | Gateway Status | API / MCP Endpoint | Notes |
| :--- | :--- | :--- | :--- |
| **Standard Chat** | Fully Supported | `/v1/chat/completions` / `qwen_chat` | Native text response. |
| **Thinking Mode** | Fully Supported | `extra_body.mode="thinking"` | Toggles thinking UI toggle on-page. |
| **Fast Mode** | Fully Supported | `extra_body.mode="fast"` | Toggles fast UI toggle on-page. |
| **Web Search** | Fully Supported | `extra_body.web_search=true` | Toggles Web Search toggle. |
| **Image Gen** | Fully Supported | `/v1/images/generations` | Automatically downloads resulting image. |
| **Video Gen** | Fully Supported | `/v1/videos/generations` | Automatically downloads resulting video. |
| **File Upload** | Fully Supported | `qwen_chat_with_file` | Uploads local images/documents. |
| **Deep Research**| Scaffolded | TODO | Future research flow integration. |
| **Slides Creator**| Scaffolded | TODO | Future slide generation attachment. |
| **Learn / Travel**| Scaffolded | TODO | Future specialized Qwen features. |

---

## Future Feature Scaffolds (v0.2+)

Methods for optional features (e.g., deep research, slides creation) are designed to be cleanly added as Qwen continues to update its portal.

- **Web Development / Artifacts**: Future iterations can parse and export react/html code widgets directly from Qwen's custom visual artifact panels.
- **Deep Research**: Can be configured to wait for multi-step Qwen agent loops before retrieving results.
