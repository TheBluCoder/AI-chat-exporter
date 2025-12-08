# AI Chat Exporter - Chrome Extension

A powerful Chrome extension for exporting conversations and media from AI web applications like Google Gemini. It supports both active chats and shared conversations, with robust media handling and multiple export formats.

## 🎯 Features

- **Smart Content Extraction**: Automatically detects and extracts conversation turns, handling both structured and linear chat layouts.
- **Media Support**: Captures images, generated assets, embedded documents, and user-uploaded files.
- **PDF Export with Embedded Images**: Generates clean, printable PDFs with images embedded directly (no broken links).
- **Auto-Scroll**: Automatically scrolls through chat history to ensure all messages are loaded before scraping.
- **Multiple Export Options**: 
  - Copy JSON to clipboard
  - Download as JSON
  - Download as Markdown
  - Export as PDF (Print-friendly)
- **Robust Error Handling**: Graceful fallbacks for various DOM structures.
- **Clean UI**: Modern popup interface with statistics and progress feedback.

## 📋 Installation

### Manual Installation (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the extension directory containing `manifest.json`

### Files Structure

```
ai-chat-exporter/
├── manifest.json         # Extension configuration
├── popup.html           # Popup UI
├── popup.js             # Popup logic & PDF generation
├── content.js           # Message bridge
├── scraper-router.js    # Directs specific URLs to correct scrapers
├── gemini-scraper.js    # Specialized scraper for active Gemini chats
├── gemini-shared.js     # Shared utilities & scraper for shared links
└── generic-scraper.js   # Fallback scraper for other sites
```

## 🚀 Usage

1. Navigate to an AI chat page (e.g., `gemini.google.com`)
2. Click the extension icon in the toolbar
3. Click **Export Current Page**
4. Wait for the extension to:
   - Auto-scroll to load full history
   - Extract messages and media
5. Once complete, choose your format:
   - **JSON**: Full raw data
   - **Markdown**: Formatted text
   - **PDF**: Visual document with images

## 📊 Export Format

The extension exports data in the following JSON structure:

```json
{
  "success": true,
  "platform": "Google Gemini",
  "messages": [
    {
      "role": "user",
      "content": "Analyze this code...",
      "uploaded_files": [
        {
           "name": "script.py", 
           "type": "code", 
           "source": "user_upload" 
        }
      ],
      "turn_index": 0
    },
    {
      "role": "model",
      "content": "Here is the analysis...",
      "media": [
        {
          "url": "https://...",
          "type": "image",
          "name": "Chart",
          "source": "generated"
        }
      ],
      "embedded_documents": [
        {
          "title": "Analysis Report",
          "content": "# Markdown Content...",
          "type": "text/markdown"
        }
      ],
      "turn_index": 0
    }
  ],
  "statistics": {
    "total_messages": 2,
    "user_messages": 1,
    "model_messages": 1,
    "uploaded_files": 1,
    "generated_media": 1
  },
  "timestamp": "2024-12-07T10:30:00.000Z",
  "url": "https://gemini.google.com/..."
}
```

## 🏗️ Architecture

### Component Overview

#### 1. `manifest.json`
- Defines permissions (`activeTab`, `scripting`).
- Injects all scraper scripts into pages to ensure availability.

#### 2. `scraper-router.js`
- The entry point for scraping.
- Detects the current URL (Active Chat vs Shared Chat vs Generic).
- Routes execution to the appropriate scraper function.

#### 3. `gemini-scraper.js`
- Specialized logic for active Gemini chat sessions.
- Handles complex UI elements like "Immersive Chips" (embedded docs) and File Carousels.
- Implements `autoScrollToTop` to ensure full history capture.

#### 4. `gemini-shared.js`
- Contains utility functions: `waitForElement`, `waitForStableContent`, `extractMedia`.
- Implements `scrapeGeminiSharedChat` for public shared links.

#### 5. `popup.js`
- Manages the UI state.
- Handles export format logic.
- **PDF Generation**: Fetches image URLs and converts them to Base64 to ensure they render correctly in the print view.

## 🔧 Configuration

Scraping parameters (timeouts, scroll behavior) are defined in `gemini-scraper.js` (for active chats) and `gemini-shared.js` (for shared tools):

```javascript
const GEMINI_CONFIG = {
  ELEMENT_WAIT_TIMEOUT: 15000,
  CONTENT_STABLE_MS: 800,
  MAX_SCROLL_ATTEMPTS: 20, // For auto-scrolling history
  // ... selectors ...
};
```

## 🐛 Troubleshooting

### Images not showing in PDF?
The extension attempts to fetch images and embed them. If an image fails to load, it might be due to stricter CORS policies on the specific asset. The PDF will still generate with a placeholder or link.

### "Timeout waiting for selector"
The page structure might have changed. Check the console logs (right-click page -> Inspect -> Console) for `[AI-Exporter]` messages.

## 📝 Development

### Adding a New Platform
1. Create a new scraper file (e.g., `claude-scraper.js`).
2. Add it to `manifest.json`.
3. Update `scraper-router.js` to detect the URL pattern and call your new scraper.
4. Implement the scraper function following the pattern in `gemini-scraper.js`.

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a PR.

## 📄 License
Open Source.
