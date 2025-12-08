# Quick Start Guide

## Installation (3 minutes)

### Step 1: Download Files
Save all extension files to a folder:
- `manifest.json`
- `scraper.js`
- `content.js`
- `popup.html`
- `popup.js`

### Step 2: Load Extension
1. Open Chrome/Edge
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select your extension folder
6. Done! ✅

## Usage (30 seconds)

### Export a Conversation

1. **Navigate** to any AI chat page (Gemini, ChatGPT, Claude, etc.)
2. **Click** the extension icon in toolbar
3. **Click** "Export Current Page" button
4. **Wait** for extraction (usually 2-5 seconds)
5. **Choose** what to do:
   - 📋 Copy JSON to clipboard
   - 💾 Download as file
   - 👁️ View in popup

## What Gets Exported?

✅ **Conversation turns** (user + AI messages)
✅ **Text content** (all message text)
✅ **Images** (URLs to embedded images)
✅ **File links** (PDFs, docs, code files)
✅ **Timestamps** (when exported)
✅ **Metadata** (message counts, URL)

## Example Output

```json
{
  "success": true,
  "messages": [
    {
      "role": "user",
      "content": "What's the weather like?",
      "media": null,
      "turn_index": 0
    },
    {
      "role": "model",
      "content": "I can't check real-time weather...",
      "media": null,
      "turn_index": 0
    }
  ],
  "count": 2,
  "timestamp": "2024-12-07T10:30:00.000Z",
  "url": "https://gemini.google.com/..."
}
```

## Troubleshooting

### "No response from page"
**Solution**: Refresh the page and try again

### "Extraction failed"
**Solution**: Check console (F12) for specific error

### Extension icon not working
**Solution**: 
1. Go to `chrome://extensions/`
2. Find "AI Chat Exporter"
3. Click reload button
4. Refresh your AI chat page

## Tips

💡 **Best Practice**: Wait for AI to finish responding before exporting

💡 **Performance**: Large conversations (50+ messages) may take 5-10 seconds

💡 **Compatibility**: Works best with Gemini, ChatGPT, Claude

💡 **Privacy**: All processing happens locally - nothing sent to servers

## Support

🐛 **Found a bug?** Check the console logs (F12 → Console)

📝 **Need help?** See README.md for detailed docs

🔧 **Want to customize?** See TECHNICAL_GUIDE.md

---

**That's it! You're ready to export AI conversations.**
