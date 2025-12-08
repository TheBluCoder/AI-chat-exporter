# AI Chat Exporter - Chrome Extension

A powerful Chrome extension for exporting conversations and media from AI web applications like Google Gemini, ChatGPT, Claude, and other AI chat interfaces.

## 🎯 Features

- **Smart Content Extraction**: Automatically detects and extracts conversation turns
- **Media Support**: Captures images, documents, and file links embedded in conversations
- **Multiple Export Options**: 
  - Copy to clipboard
  - Download as JSON
  - View formatted output
- **Robust Error Handling**: Graceful fallbacks and detailed error reporting
- **Performance Optimized**: Waits for dynamic content to fully load
- **Clean UI**: Modern, intuitive popup interface

## 📋 Installation

### Manual Installation (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the extension directory containing `manifest.json`

### Files Required

```
ai-chat-exporter/
├── manifest.json       # Extension configuration
├── scraper.js         # Core scraping logic
├── content.js         # Message handler
├── popup.html         # Popup UI
└── popup.js           # Popup logic
```

## 🚀 Usage

1. Navigate to an AI chat page (e.g., Gemini, ChatGPT)
2. Click the extension icon in the toolbar
3. Click "Export Current Page" button
4. Wait for extraction to complete
5. Choose to:
   - Copy JSON to clipboard
   - Download as a JSON file
   - View in the popup

## 📊 Export Format

The extension exports data in the following JSON structure:

```json
{
  "success": true,
  "messages": [
    {
      "role": "user",
      "content": "User message text",
      "media": [
        {
          "url": "https://example.com/image.png",
          "type": "image",
          "name": "Image description"
        }
      ],
      "media_type": ["image"],
      "turn_index": 0
    },
    {
      "role": "model",
      "content": "AI response text",
      "media": null,
      "media_type": null,
      "turn_index": 0
    }
  ],
  "count": 2,
  "timestamp": "2024-12-07T10:30:00.000Z",
  "url": "https://gemini.google.com/...",
  "containerFound": true
}
```

## 🏗️ Architecture

### Component Overview

#### 1. `manifest.json`
- Extension configuration and permissions
- Defines content scripts and popup
- Manifest V3 compliant

#### 2. `scraper.js`
Core scraping functionality:
- `waitForElement()`: Waits for DOM elements to appear
- `waitForStableContent()`: Ensures content has finished loading
- `getMediaType()`: Identifies file types from URLs
- `extractMedia()`: Extracts images and file links
- `scrapeGeminiContainer()`: Main scraping orchestrator
- `runScrape()`: Entry point for scraping

#### 3. `content.js`
Message handling between popup and scraper:
- Listens for `SCRAPE_PAGE` action
- Executes scraping asynchronously
- Returns results to popup

#### 4. `popup.html`
User interface with:
- Export button
- Loading indicator
- Statistics display
- Error handling
- Action buttons (copy/download)

#### 5. `popup.js`
UI logic and interactions:
- Tab communication
- Clipboard operations
- File downloads
- State management

## 🔧 Configuration

Adjust scraping behavior in `scraper.js`:

```javascript
const CONFIG = {
  ELEMENT_WAIT_TIMEOUT: 15000,  // Max wait for elements (ms)
  CONTENT_STABLE_MS: 800,       // Content stability duration (ms)
  CONTENT_TIMEOUT: 10000,       // Max wait for stable content (ms)
  RENDER_DELAY: 500,            // Initial render delay (ms)
};
```

## 🎨 Supported Media Types

- **Images**: JPG, PNG, GIF, WebP, SVG, BMP
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- **Code Files**: PY, JS, TS, Java, C/C++, Go, Rust, etc.
- **Text Files**: TXT, MD, CSV, JSON, XML, YAML, HTML, CSS

## 🐛 Troubleshooting

### Extension Not Working

1. **Refresh the page**: Content scripts load on page load
2. **Check permissions**: Ensure extension has access to the site
3. **View console**: Open DevTools and check for errors
4. **Reload extension**: Go to `chrome://extensions/` and reload

### No Response from Page

- The page may not have loaded the content script
- Try refreshing the page and waiting a few seconds
- Check if the page URL is accessible (not `chrome://` pages)

### Extraction Failed

- Page structure may differ from expected
- Check console for specific error messages
- Some sites may use different HTML structures

## 🔍 Debugging

Enable verbose logging:

```javascript
// In scraper.js, all logs are prefixed with [AI-Exporter]
console.log("[AI-Exporter] Custom debug message");
```

Check the console in:
- **Popup**: Right-click extension icon → Inspect popup
- **Content Script**: Open DevTools on the target page

## 📝 Development

### Making Changes

1. Edit source files
2. Go to `chrome://extensions/`
3. Click reload button on the extension
4. Refresh the target page
5. Test changes

### Adding New Selectors

To support additional AI chat platforms, modify `scrapeGeminiContainer()`:

```javascript
// Add new selector patterns
const container = await waitForElement("your-selector-here");
```

## 🔐 Privacy & Security

- **No data transmission**: All processing happens locally
- **No external connections**: Extension doesn't send data anywhere
- **Minimal permissions**: Only requires `activeTab` and `scripting`
- **Open source**: Code is fully auditable

## 📄 License

This project is open source. Feel free to modify and distribute.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🆘 Support

For issues, questions, or feature requests:
- Check existing issues on GitHub
- Open a new issue with detailed information
- Include console logs and error messages

## 🔄 Version History

### v1.1.0 (Current)
- Optimized scraping performance
- Enhanced error handling
- Improved UI/UX
- Added copy and download features
- Better media extraction
- Comprehensive documentation

### v1.0.0
- Initial release
- Basic scraping functionality
- Simple popup interface

---

**Note**: This extension is designed for personal use and data portability. Always respect the terms of service of the websites you're scraping from.
