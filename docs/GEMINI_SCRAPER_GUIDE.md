# Google Gemini Scraper Documentation

## Overview

This is a specialized scraper designed specifically for Google Gemini's chat interface. It extracts:
- ✅ User messages and AI responses
- ✅ Uploaded files (documents, images)
- ✅ Generated/embedded media
- ✅ Complete conversation structure
- ✅ Rich metadata and statistics

## Key Features

### 1. **Uploaded Files Detection** 🆕
Unlike the generic scraper, this version specifically extracts:
- User-uploaded documents (.md, .pdf, .docx, etc.)
- User-uploaded images
- File names and types
- Source attribution (user_upload vs. generated vs. linked)

### 2. **Auto-Scroll History Loading** 🆕
- Automatically finds the chat container
- Scrolls to the top to trigger lazy-loading of older messages
- Ensures complete conversation history is captured without manual scrolling

### 2. **Gemini-Specific Selectors**
Optimized for Gemini's unique DOM structure:
- `user-query` elements
- `model-response` elements
- `message-content` containers
- `user-query-file-preview` for uploads
- `data-test-id="uploaded-file"` for file detection

### 3. **Dual Extraction Strategy**
- **Primary**: Extract by `message-set` elements (structured turns)
- **Fallback**: Extract all `user-query` and `model-response` in order

### 4. **Smart Text Extraction**
- Removes file preview UI elements
- Excludes action buttons (copy, edit, etc.)
- Preserves formatting and structure
- Handles empty/whitespace-only messages

## Output Format

### Successful Response

```json
{
  "success": true,
  "messages": [
    {
      "role": "user",
      "content": "Can you analyze this document?",
      "uploaded_files": [
        {
          "name": "GAME_DESIGN_DOCUMENT.md",
          "type": "document",
          "source": "user_upload",
          "url": null
        }
      ],
      "media": null,
      "turn_index": 0
    },
    {
      "role": "model",
      "content": "I'll analyze the document...",
      "uploaded_files": null,
      "media": [
        {
          "url": "https://example.com/generated-chart.png",
          "type": "image",
          "name": "Chart showing analysis",
          "source": "generated"
        }
      ],
      "turn_index": 0
    }
  ],
  "count": 2,
  "statistics": {
    "total_messages": 2,
    "user_messages": 1,
    "model_messages": 1,
    "uploaded_files": 1,
    "generated_media": 1
  },
  "timestamp": "2024-12-07T12:00:00.000Z",
  "url": "https://gemini.google.com/app/...",
  "platform": "Google Gemini",
  "scraper_version": "2.0.0"
}
```

### Message Object Structure

#### User Message
```json
{
  "role": "user",
  "content": "Text of the user's message",
  "uploaded_files": [
    {
      "name": "document.pdf",
      "type": "pdf",
      "source": "user_upload",
      "url": null  // Gemini doesn't expose direct URLs
    }
  ],
  "media": null,  // Users don't generate media
  "turn_index": 0
}
```

#### Model Message
```json
{
  "role": "model",
  "content": "AI response text",
  "uploaded_files": null,  // Models don't upload files
  "media": [
    {
      "url": "https://...",
      "type": "image",
      "name": "Description",
      "source": "generated"
    }
  ],
  "turn_index": 0
}
```

## File/Media Sources

### `uploaded_files` (User Messages Only)
- **Source**: Files uploaded by the user
- **Types**: Documents, images, code files
- **URL**: Usually `null` (Gemini stores these server-side)
- **Detection**: Via `data-test-id="uploaded-file"` and `aria-label`

### `media` (Model Messages Only)
- **Source**: Content generated or linked by the AI
- **Types**: Images, charts, visualizations, linked documents
- **URL**: Usually available (publicly accessible)
- **Detection**: Via `<img>` tags and `<a>` links

## Supported File Types

### Documents
- `.md`, `.markdown` (Markdown)
- `.pdf` (PDF)
- `.doc`, `.docx` (Word)
- `.xls`, `.xlsx` (Excel)
- `.ppt`, `.pptx` (PowerPoint)
- `.txt`, `.log`, `.csv` (Text files)

### Code Files
- `.py`, `.js`, `.ts`, `.jsx`, `.tsx`
- `.java`, `.cpp`, `.c`, `.h`, `.hpp`
- `.go`, `.rs`, `.rb`, `.php`
- `.swift`, `.kt`, `.cs`

### Images
- `.jpg`, `.jpeg`, `.png`, `.gif`
- `.webp`, `.svg`, `.bmp`

### Other
- `.json`, `.xml`, `.yaml`, `.yml`
- `.html`, `.css`

## Configuration

### Selectors (Advanced)

```javascript
const GEMINI_CONFIG = {
  SELECTORS: {
    CHAT_CONTAINER: 'chat-app',
    MESSAGE_TURN: 'message-set',
    USER_QUERY: 'user-query',
    MODEL_RESPONSE: 'model-response',
    UPLOADED_FILE: '[data-test-id="uploaded-file"]',
    UPLOADED_IMG: '[data-test-id="uploaded-img"]',
    // ... more selectors
  }
};
```

### Timeouts

```javascript
const GEMINI_CONFIG = {
  ELEMENT_WAIT_TIMEOUT: 15000,  // Wait for elements (15s)
  CONTENT_STABLE_MS: 800,       // Content stability (800ms)
  CONTENT_TIMEOUT: 10000,       // Max wait for stability (10s)
  RENDER_DELAY: 500,            // Initial render delay (500ms)
};
```

## Usage

### In Chrome Extension

```javascript
// content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SCRAPE_PAGE") {
    runScrape()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
```

### Standalone

```javascript
// In browser console
await runScrape();
```

### Programmatic

```javascript
const result = await scrapeGeminiChat();
console.log(result.messages);
```

## How It Works

### 1. Element Detection
```
Wait for chat-app element
    ↓
Find conversation-container
    ↓
Wait for content to stabilize
```

### 2. Message Extraction
```
For each message-set:
    ↓
Extract user-query
    ├─ Get text content
    ├─ Find uploaded files
    └─ Store as user message
    ↓
Extract model-response
    ├─ Get text content
    ├─ Find generated media
    └─ Store as model message
```

### 3. File Detection
```
For user-query element:
    ↓
Find [data-test-id="uploaded-file"]
    ↓
Extract aria-label for file name
    ↓
Determine file type from extension
    ↓
Store as uploaded_file
```

## Differences from Generic Scraper

| Feature | Generic Scraper | Gemini Scraper |
|---------|----------------|----------------|
| **Platform** | Multiple AI sites | Gemini only |
| **Selectors** | Generic (share-turn-viewer) | Specific (user-query, model-response) |
| **File Detection** | Basic media extraction | Advanced uploaded file tracking |
| **File URLs** | Attempts to extract | Knows when URLs unavailable |
| **Source Attribution** | Single "media" array | Separate uploaded_files & media |
| **Statistics** | Basic counts | Detailed breakdown |
| **Platform ID** | Not specified | "Google Gemini" |

## Troubleshooting

### No uploaded files detected
**Cause**: Files may be in different DOM location
**Solution**: Check `data-test-id="uploaded-file"` exists
```javascript
document.querySelectorAll('[data-test-id="uploaded-file"]')
```

### Extracted text includes UI elements
**Cause**: Buttons/actions not properly filtered
**Solution**: Check button removal logic in `extractUserQueryText()`

### Missing messages
**Cause**: Messages still streaming/loading
**Solution**: Increase `CONTENT_STABLE_MS` or wait longer before scraping

### Empty content field
**Cause**: Message might be image-only or file-only
**Solution**: Check `uploaded_files` and `media` arrays

## Advanced Usage

### Custom File Type Detection

```javascript
// Extend getMediaType() function
function getMediaType(url) {
  // ... existing code ...
  
  // Add custom types
  if (/\.(sketch|fig|psd)$/i.test(cleanUrl)) {
    return 'design_file';
  }
  
  return null;
}
```

### Filter Specific Message Types

```javascript
const result = await runScrape();

// Only messages with uploaded files
const withFiles = result.messages.filter(m => m.uploaded_files);

// Only model messages with media
const withMedia = result.messages.filter(m => m.role === 'model' && m.media);
```

### Export to Different Formats

```javascript
const result = await runScrape();

// Convert to chat log format
const chatLog = result.messages.map(m => 
  `${m.role.toUpperCase()}: ${m.content}`
).join('\n\n');

// Convert to JSON with only text
const textOnly = result.messages.map(({ role, content }) => 
  ({ role, content })
);
```

## API Reference

### Main Functions

#### `runScrape()`
Entry point for scraping operation.
- **Returns**: `Promise<Object>` - Scraping result
- **Throws**: Never (errors returned in result object)

#### `scrapeGeminiChat()`
Core scraping logic.
- **Returns**: `Promise<Object>` - Scraping result with messages
- **Throws**: Never (errors caught and returned)

#### `extractUploadedFiles(userQueryElement)`
Extracts files uploaded by user.
- **Param**: `Element` - User query DOM element
- **Returns**: `Array|null` - Array of file objects or null

#### `extractMedia(element)`
Extracts generated/linked media.
- **Param**: `Element` - Model response DOM element
- **Returns**: `Array|null` - Array of media objects or null

### Utility Functions

#### `waitForElement(selector, timeout)`
Waits for DOM element to appear.
- **Params**: 
  - `selector` (string) - CSS selector
  - `timeout` (number) - Max wait time in ms
- **Returns**: `Promise<Element>`

#### `waitForStableContent(element, stableMs, timeout)`
Waits for text content to stop changing.
- **Params**:
  - `element` (Element) - Element to monitor
  - `stableMs` (number) - Stability duration
  - `timeout` (number) - Max wait time
- **Returns**: `Promise<boolean>`

#### `getMediaType(url)`
Determines file type from URL/filename.
- **Param**: `url` (string) - URL or filename
- **Returns**: `string|null` - Media type or null

## Best Practices

1. **Wait for Streaming**: AI responses stream in. Wait for stability.
2. **Handle Nulls**: Check `uploaded_files` and `media` before accessing.
3. **Verify Platform**: Only use on Gemini (check URL or platform field).
4. **Error Handling**: Always check `success` field in result.
5. **Privacy**: Uploaded files don't have URLs - respect user privacy.

## Changelog

### v2.0.0 (Current)
- ✨ Added uploaded files detection
- ✨ Added source attribution (upload/generated/linked)
- ✨ Added detailed statistics
- ✨ Improved text extraction (removes UI elements)
- ✨ Platform identification
- 🐛 Fixed empty content handling
- 🐛 Fixed duplicate media entries
- 📚 Comprehensive documentation

### v1.0.0
- Initial Gemini-specific scraper
- Basic message extraction
- Simple media detection

---

**Note**: This scraper is designed for Google Gemini. For other AI platforms (ChatGPT, Claude), use the generic scraper or create platform-specific versions.
