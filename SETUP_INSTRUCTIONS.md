# Setup Instructions - Router-Based Extension

## 🎯 What You're Setting Up

A **smart AI chat scraper** that automatically detects which platform you're on and uses the best scraper for that platform.

## 📦 Required Files

You need these 6 files for the extension to work:

1. **manifest-v2.json** (rename to manifest.json)
2. **scraper.js** (generic scraper)
3. **gemini-scraper.js** (Gemini-specific scraper)
4. **scraper-router.js** (automatic platform detection)
5. **content.js** (message handler)
6. **popup.html** (user interface)
7. **popup.js** (UI logic)

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create Extension Folder

```bash
mkdir ai-chat-exporter
cd ai-chat-exporter
```

### Step 2: Copy Files

Copy these files into the folder:
- manifest-v2.json (rename to **manifest.json**)
- scraper.js
- gemini-scraper.js
- scraper-router.js
- content.js
- popup.html
- popup.js

Your folder should look like:
```
ai-chat-exporter/
├── manifest.json
├── scraper.js
├── gemini-scraper.js
├── scraper-router.js
├── content.js
├── popup.html
└── popup.js
```

### Step 3: Load in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle top-right)
4. Click **"Load unpacked"**
5. Select your `ai-chat-exporter` folder
6. Done! ✅

### Step 4: Test It

1. Visit a Gemini chat: `https://gemini.google.com/app/...`
2. Click the extension icon
3. Click "Export Current Page"
4. Should detect "Google Gemini (Active Chat)" and use specialized scraper

## 🎨 How It Works

### Automatic Platform Detection

```
Visit any AI chat URL
    ↓
Router detects platform
    ↓
gemini.google.com/app/* → Use gemini-scraper.js (specialized)
gemini.google.com/share/* → Use scraper.js (generic)
claude.ai/chat/* → Use claude-scraper.js (coming soon)
chatgpt.com/* → Use chatgpt-scraper.js (coming soon)
meta.ai/* → Use metaai-scraper.js (coming soon)
    ↓
Extract conversation
    ↓
Display results
```

## 📊 Current Platform Support

| Platform | Active Chat | Shared Chat | Status |
|----------|-------------|-------------|--------|
| **Gemini** | ✅ Specialized | ✅ Generic | Working |
| **Claude** | 🚧 Planned | 🚧 Planned | Coming Soon |
| **ChatGPT** | 🚧 Planned | 🚧 Planned | Coming Soon |
| **Meta AI** | 🚧 Planned | N/A | Coming Soon |

## 🧪 Testing

### Test on Gemini Active Chat

1. Go to: `https://gemini.google.com/app/abc123`
2. Open browser console (F12)
3. Look for: `[Scraper-Router] Detected platform: Google Gemini (Active Chat)`
4. Click extension, export
5. Result should include:
   ```json
   {
     "detected_platform": "Google Gemini (Active Chat)",
     "scraper_type": "gemini",
     "uploaded_files": [...],  // If you uploaded files
     "statistics": {...}
   }
   ```

### Test on Gemini Shared

1. Go to: `https://gemini.google.com/share/xyz789`
2. Look for: `[Scraper-Router] Detected platform: Google Gemini (Shared)`
3. Click extension, export
4. Result should use generic scraper

### Check Platform Detection

In browser console:
```javascript
window.getPlatformInfo()
```

Should return:
```json
{
  "url": "https://gemini.google.com/app/...",
  "platform_name": "Google Gemini (Active Chat)",
  "scraper_type": "gemini",
  "scraper_available": true
}
```

## 🔧 Configuration

### manifest.json Structure

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],  // Works on all sites
      "js": [
        "scraper.js",           // Generic scraper (loaded first)
        "gemini-scraper.js",    // Gemini scraper
        "scraper-router.js",    // Router (selects scraper)
        "content.js"            // Message handler
      ],
      "run_at": "document_idle"  // Wait for page to load
    }
  ]
}
```

**Important:** File order matters! Router must load after scrapers.

## 🎓 Understanding the Output

### Gemini Active Chat Output

```json
{
  "success": true,
  "messages": [
    {
      "role": "user",
      "content": "Analyze this document",
      "uploaded_files": [
        {
          "name": "document.pdf",
          "type": "pdf",
          "source": "user_upload"
        }
      ]
    }
  ],
  "statistics": {
    "uploaded_files": 1,
    "generated_media": 0
  },
  "detected_platform": "Google Gemini (Active Chat)",
  "scraper_type": "gemini"
}
```

### Gemini Shared Output

```json
{
  "success": true,
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "media": null
    }
  ],
  "count": 1,
  "detected_platform": "Google Gemini (Shared)",
  "scraper_type": "generic"
}
```

**Key Difference:** Active chat includes `uploaded_files` and `statistics`.

## 🐛 Troubleshooting

### Extension Not Loading

**Symptom:** Extension doesn't appear in toolbar
**Fix:**
1. Check all 7 files are in folder
2. Check manifest.json is valid JSON
3. Try removing and re-adding extension

### Wrong Scraper Being Used

**Symptom:** Console shows "Using generic scraper" for active Gemini chat
**Fix:**
1. Check URL matches pattern
2. Look for: `gemini.google.com/app/`
3. Check console for router logs

### No Platform Detected

**Symptom:** Console shows "No specific platform detected"
**Fix:**
1. Check URL in PLATFORM_CONFIG (scraper-router.js)
2. Verify pattern regex matches your URL

### Uploaded Files Not Detected

**Symptom:** `uploaded_files` is null even though files were uploaded
**Fix:**
1. Ensure using gemini-scraper.js (check console logs)
2. Verify files are in `[data-test-id="uploaded-file"]` elements
3. Check Gemini hasn't changed DOM structure

### Console Errors

**Common errors:**
- `scrapeGeminiChat is not defined`: Router loaded before scraper
- `runScrape is not defined`: Router not loaded properly
- `chrome.runtime.sendMessage error`: Normal for popup closing

## 🔍 Debugging

### Enable Verbose Logging

All scrapers and router log to console. Look for:
- `[Scraper-Router]` - Platform detection
- `[AI-Exporter]` - Generic scraper
- `[Gemini-Scraper]` - Gemini scraper

### Check Loaded Scripts

In console:
```javascript
console.log('Router:', typeof window.runScrape !== 'undefined');
console.log('Generic:', typeof window.scrapeGeminiContainer !== 'undefined');
console.log('Gemini:', typeof window.scrapeGeminiChat !== 'undefined');
```

All should be `true`.

### Test Scrapers Directly

```javascript
// Test generic scraper
const result1 = await window.scrapeGeminiContainer();

// Test Gemini scraper
const result2 = await window.scrapeGeminiChat();

// Test router
const result3 = await window.runScrape();
```

## 📚 Additional Resources

- **ROUTER_GUIDE.md** - Complete router documentation
- **GEMINI_SCRAPER_GUIDE.md** - Gemini scraper details
- **TECHNICAL_GUIDE.md** - Architecture deep dive
- **SCRAPER_COMPARISON.md** - Compare scrapers

## 🚧 Future Platforms

### Adding Claude Support (Coming Soon)

When claude-scraper.js is ready:
1. Add file to extension folder
2. Add to manifest.json content_scripts
3. Router will automatically detect and use it

### Adding ChatGPT Support (Coming Soon)

Similar process - just add chatgpt-scraper.js when ready.

## ✅ Success Checklist

- [ ] All 7 files in folder
- [ ] manifest-v2.json renamed to manifest.json
- [ ] Extension loaded in Chrome
- [ ] Extension icon appears in toolbar
- [ ] Tested on Gemini active chat
- [ ] Tested on Gemini shared
- [ ] Console shows correct platform detection
- [ ] Export works correctly

## 🎉 You're Done!

Your extension now:
- ✅ Automatically detects AI platforms
- ✅ Uses optimized scraper for each platform
- ✅ Tracks uploaded files on Gemini
- ✅ Works on active and shared chats
- ✅ Ready for future platforms (Claude, ChatGPT, Meta AI)

**Next:** Test it on different AI platforms and enjoy smart scraping! 🚀
