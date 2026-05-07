# How to Use AI Chat Exporter

If you prefer video:

- Watch tutorial: [https://youtu.be/tUQnVepnIu4](https://youtu.be/1etNXLYsViU)

---

## Quick Start

1. Open a supported conversation page (ChatGPT, Gemini, or Claude).
2. Click the extension icon.
3. Pick one of these modes:
   - **Export Current Page**: export the full conversation.
   - **Export Selected**:
     - Click once to enter selection mode.
     - Click one or more messages in the chat.
     - Click **Export Selected** again to export:
       - 1 selected message: export from that point to latest.
       - 2+ selected messages: export only selected messages in original chat order.

4. Use output buttons:
   - **Copy JSON**
   - **Download JSON**
   - **Download MD**
   - **Export PDF**

## Settings Explained

- **Include images in exports (larger files)**  
  Turn on if you want images embedded directly in MD/PDF output.  
  Leave off for smaller output files that use links instead.

- **Allow extra permission for image extraction (enable if image missing)**  
  Optional fallback. Enable only if some images are missing in export.

- **Remember last export in this extension**  
  Keeps the last export result in extension storage for quick reuse.

- **Clear cache**  
  Removes stored export data.

- **Revoke broad access**  
  Removes previously granted optional broad host access.

## Troubleshooting

- If export fails, refresh the chat tab and try again.
- If some images are missing, enable extra permission and retry.
- If you are on Gemini but not in an active conversation, open/send a message first, then export.

## Report an Issue

- GitHub Issues: https://github.com/TheBluCoder/AI-chat-exporter/issues

