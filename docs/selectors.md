# Browser Selectors Strategy

To prevent the gateway from breaking whenever Qwen Chat Web updates its front-end UI, we implement a **layered selector strategy**.

## Selector Resolution Order

```
[1] Environment Override (e.g. QWEN_SELECTOR_CHAT_INPUT)
                     |
                     v
[2] Accessibility Roles (e.g. getByRole('textbox'))
                     |
                     v
[3] Text / Placeholder Searches (e.g. getByPlaceholder(/Qwen/i))
                     |
                     v
[4] Conservative CSS Fallbacks (e.g. "textarea")
                     |
                     v
[5] Raise "qwen_selector_not_found" error
```

---

## Overriding Selectors via Environment Variables

If Qwen changes their markup, you can override any selector at launch using environment variables in your `.env` file or terminal execution without modifying the source code.

| Configuration Key | Selector Target | Example Override |
| :--- | :--- | :--- |
| `QWEN_SELECTOR_CHAT_INPUT` | Chat input textarea | `QWEN_SELECTOR_CHAT_INPUT="#custom-input"` |
| `QWEN_SELECTOR_SEND_BUTTON` | Send button | `QWEN_SELECTOR_SEND_BUTTON="button[data-testid='send']"` |
| `QWEN_SELECTOR_IMAGE_MODE_BUTTON` | Image generation toggle | `QWEN_SELECTOR_IMAGE_MODE_BUTTON=".image-mode"` |
| `QWEN_SELECTOR_VIDEO_MODE_BUTTON` | Video generation toggle | `QWEN_SELECTOR_VIDEO_MODE_BUTTON=".video-mode"` |
| `QWEN_SELECTOR_WEB_SEARCH_BUTTON` | Web search toggle | `QWEN_SELECTOR_WEB_SEARCH_BUTTON="button.search-active"` |
| `QWEN_SELECTOR_THINKING_MODE_BUTTON` | Thinking mode button | `QWEN_SELECTOR_THINKING_MODE_BUTTON="text=Thinking"` |
| `QWEN_SELECTOR_FAST_MODE_BUTTON` | Fast mode button | `QWEN_SELECTOR_FAST_MODE_BUTTON="text=Fast"` |
| `QWEN_SELECTOR_AUTO_MODE_BUTTON` | Auto mode button | `QWEN_SELECTOR_AUTO_MODE_BUTTON="text=Auto"` |
| `QWEN_SELECTOR_UPLOAD_BUTTON` | Upload attachment button | `QWEN_SELECTOR_UPLOAD_BUTTON="input[type='file']"` |
| `QWEN_SELECTOR_DOWNLOAD_BUTTON` | Media download button | `QWEN_SELECTOR_DOWNLOAD_BUTTON=".download-icon"` |
| `QWEN_SELECTOR_RESPONSE_CONTAINER` | Text bubble content container | `QWEN_SELECTOR_RESPONSE_CONTAINER=".markdown-body"` |

---

## Troubleshooting UI Changes

1. **Enable the Visible Browser**: Ensure `QWEN_BROWSER_HEADLESS=false` is set in your `.env` file.
2. **Inspect the DOM**:
   - Open Developer Tools in the browser window (`F12` or `Option+Cmd+I`).
   - Find the CSS selector or text value of the button/textarea that is failing.
3. **Set the Override**:
   - Add the new CSS selector to your `.env` file (e.g. `QWEN_SELECTOR_CHAT_INPUT="[contenteditable='true']"`).
   - Restart the gateway server (`qwen-gateway serve`).
