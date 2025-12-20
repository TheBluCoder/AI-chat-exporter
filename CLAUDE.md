# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI Chat Exporter** is a Manifest V3 browser extension that exports conversations from AI platforms (ChatGPT, Gemini, Claude, and planned Meta AI support). The project uses a modern ES6 modules architecture with the Template Method Pattern to minimize code duplication across platform scrapers.

**Key Facts:**
- Pure JavaScript (ES6+ modules) - no build process required
- Browser Extension (Chrome, Edge, Firefox, Safari compatible)
- Current version: 3.0.0
- Privacy-first: All processing happens client-side

## Architecture

### Template Method Pattern

The codebase uses an abstract base class (`BaseScraper`) that implements the template method pattern:

```
BaseScraper (534 lines of shared logic)
├── ChatGPTScraper (~154 lines)
├── GeminiScraper (~392 lines)
└── ClaudeScraper (~180 lines)
```

Each platform scraper extends `BaseScraper` and only overrides platform-specific methods, resulting in 70% less code duplication.

### Standardized Message Format

All scrapers enforce this structure:
```javascript
{
  role: "user" | "assistant" | "model",
  content: string,
  media: Array | null,
  uploaded_files: Array | null,
  embedded_documents: Array | null,
  timestamp: string
}
```

### Module Loading

Due to Chrome's limited ES6 module support in content scripts, the extension uses **dynamic imports**:
- `content-script.js` is the entry point
- It dynamically imports `src/scrapers/init.js`
- Platform detection happens in `init.js` based on URL patterns
- Appropriate scraper is instantiated and executed

All ES6 module files must be declared in `manifest.json` under `web_accessible_resources`.

## Key Directories

```
src/
├── popup/                      # Extension UI
│   ├── popup.html
│   └── popup.js               # Export logic, format conversion
├── scrapers/
│   ├── base/
│   │   └── BaseScraper.js     # Abstract template (534 lines)
│   ├── config/
│   │   ├── chatgpt.config.js  # Platform selectors & settings
│   │   ├── gemini.config.js
│   │   └── claude.config.js
│   ├── platforms/
│   │   ├── ChatGPTScraper.js  # Progressive scroll extraction
│   │   ├── GeminiScraper.js   # Document/file extraction
│   │   └── ClaudeScraper.js   # Artifact/preview extraction
│   └── init.js                # Platform detection & routing
├── utils-modules/             # Shared ES6 utilities
│   ├── html.js               # HTML escaping
│   ├── mime.js               # MIME type detection
│   ├── media.js              # URL → Base64 conversion
│   └── markdown.js           # Code block formatting
├── content-script.js         # Entry point (dynamic import loader)
└── lib/
    └── browser-polyfill.js   # Cross-browser API compatibility
```

## Development Workflow

### No Build Process

This extension loads directly from source files - there is no npm build step, webpack, or bundler:

```bash
# Setup
git clone <repo>
cd chatExport

# Load in browser
# Chrome: chrome://extensions → Enable "Developer mode" → "Load unpacked"
# Firefox: about:debugging → "Load Temporary Add-on"
# Safari: Use Safari Web Extensions Converter

# Testing changes
# 1. Make code changes
# 2. Click "Reload" button in browser extensions page
# 3. Navigate to AI chat page and test
```

### Git Workflow

Current branch: `add-claude-scraper` (feature branch)

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation changes

## Common Development Tasks

### Testing a Scraper

1. Load extension in browser
2. Navigate to target AI platform (ChatGPT, Gemini, or Claude)
3. Open DevTools Console
4. Click extension icon
5. Click "Export Current Page"
6. Verify:
   - All messages extracted
   - Media embedded correctly
   - No console errors
   - Exports work (JSON, MD, PDF)

Use test files in `test-files/` for validation.

### Adding a New Platform

To add support for a new AI platform (e.g., Meta AI):

**1. Create config file:** `src/scrapers/config/metaai.config.js`
```javascript
export const METAAI_CONFIG = {
  platform: 'MetaAI',
  selectors: {
    CONTAINER: 'main',
    USER_MESSAGE: '.user-message',
    MODEL_MESSAGE: '.assistant-message',
    // ... other selectors
  },
  scrollConfig: {
    maxAttempts: 50,
    delay: 1500,
  },
};
```

**2. Create scraper:** `src/scrapers/platforms/MetaAIScraper.js`
```javascript
import { BaseScraper } from '../base/BaseScraper.js';
import { METAAI_CONFIG } from '../config/metaai.config.js';

export class MetaAIScraper extends BaseScraper {
  constructor() {
    super(METAAI_CONFIG);
  }

  // Only override methods that need platform-specific logic
  async extractAllMessages(container) {
    // Custom extraction logic (~50-150 lines)
  }
}
```

**3. Register in init.js:**
```javascript
import { MetaAIScraper } from './platforms/MetaAIScraper.js';

const PLATFORM_PATTERNS = {
  // ... existing platforms
  METAAI: {
    pattern: /^https:\/\/www\.meta\.ai\/c\//,
    name: 'MetaAI',
    ScraperClass: MetaAIScraper,
    globalFunction: 'scrapeMetaAI',
  },
};
```

**4. Update manifest.json:**
- Add URL pattern to `content_scripts.matches`
- Add URL pattern to `web_accessible_resources.matches`

Expected code: ~180-400 lines total for a new platform.

### Debugging Scrapers

Common issues and solutions:

**Module not loading:**
- Check `web_accessible_resources` in manifest.json
- Verify file paths in import statements
- Look for module loading errors in console

**Platform not detected:**
- Verify URL pattern in `PLATFORM_PATTERNS`
- Check console for "No specific platform detected"
- Ensure current URL matches a pattern

**Messages not extracting:**
- Verify selectors in config file match actual DOM
- Check if platform uses lazy loading (may need progressive extraction)
- Use browser DevTools to inspect element structure
- Add console.log statements in scraper methods

## BaseScraper Template Methods

The `BaseScraper` provides the scraping workflow:

```javascript
async scrape() {
  1. waitForContainer()          // Wait for chat container
  2. scrollToLoadHistory()       // Auto-scroll to load lazy content
  3. waitForStableContent()      // Wait for DOM to stabilize
  4. extractAllMessages()        // Extract all messages
  5. calculateStatistics()       // Count messages, media, etc.
  6. formatResult()              // Return standardized result
}
```

**Methods commonly overridden by platform scrapers:**
- `extractAllMessages(container)` - Main extraction logic
- `extractUserText(element)` - Extract user message text
- `extractModelText(element)` - Extract assistant message text
- `extractUserMedia(element)` - Extract user images/media
- `extractModelMedia(element)` - Extract assistant images/media
- `waitForContainer()` - Custom container waiting logic
- `findScrollContainer(element)` - Find scrollable container

**Reusable helper methods (use these!):**
- `extractTextFromElement(element, options)` - Generic text extraction
- `extractImagesFromElement(element, options)` - Generic image extraction
- `createMessage(params)` - Create standardized message object
- `sleep(ms)` - Async delay
- `waitForElement(selector, timeout)` - Wait for DOM element

## Platform-Specific Patterns

### ChatGPT - Progressive Scroll Extraction
ChatGPT uses lazy loading, requiring progressive extraction while scrolling:
```javascript
async extractAllMessages(container) {
  // Incrementally scroll and extract visible messages
  // Use Map to track unique messages by ID
}
```

### Gemini - Document Extraction
Gemini has uploaded files, immersive documents, and embedded content:
```javascript
async extractUploadedFiles(userTurn)
async extractImmersiveDocuments(modelTurn)
async extractUserUploadedDocuments(userTurn)
```

### Claude - Artifact/Preview Extraction
Claude has preview panels (artifacts) that require clicking to reveal:
```javascript
async extractPreviewDocuments(modelTurn) {
  // 1. Find preview buttons
  // 2. Click to open panel
  // 3. Extract content
  // 4. Close panel
  // 5. Repeat
}
```

## Utilities

**Media handling** (`utils-modules/media.js`):
- `urlToBase64(url, mimeType)` - Convert image URL to base64 data URI
- Used extensively to embed images in exports

**MIME detection** (`utils-modules/mime.js`):
- `detectMimeType(url)` - Detect MIME type from file extension/URL
- `getMimeFromSignature(uint8Array)` - Detect from file signature

**Markdown formatting** (`utils-modules/markdown.js`):
- `formatCodeBlock(content, language)` - Format code with proper backticks
- `escapeMarkdown(text)` - Escape special markdown characters

**HTML utilities** (`utils-modules/html.js`):
- `escapeHtml(text)` - Escape HTML entities
- `formatParagraphs(text)` - Format paragraphs with line breaks

## Best Practices

### Use Configuration Over Hardcoding
```javascript
// Good - uses config
const button = element.querySelector(this.selectors.PREVIEW_BUTTON);

// Bad - hardcoded
const button = element.querySelector('[aria-label="Preview"]');
```

### Minimize Overrides
Only override BaseScraper methods when platform needs custom logic. Reuse base class methods whenever possible.

### Document Overrides
Add JSDoc comments explaining why you're overriding:
```javascript
/**
 * Extract messages from container
 * Override: Claude uses different message structure than base
 */
async extractAllMessages(container) {
  // ...
}
```

### Handle Errors Gracefully
Scrapers should return `{ success: false, error: string }` on failure, not throw errors.

## Important Files to Read

When working on scrapers, read these in order:
1. `docs/ES6_MIGRATION.md` - Architecture overview
2. `src/scrapers/base/BaseScraper.js` - Template method implementation
3. Platform config (e.g., `src/scrapers/config/chatgpt.config.js`)
4. Platform scraper (e.g., `src/scrapers/platforms/ChatGPTScraper.js`)
5. `src/scrapers/init.js` - Platform detection logic

## Current Work

The repository is on the `add-claude-scraper` branch with uncommitted changes to `ClaudeScraper.js`. Recent commits show ongoing work to improve Claude scraper robustness and code block formatting.

## Browser Compatibility

- Chrome >= 88 (Full support)
- Edge >= 88 (Full support)
- Firefox >= 109 (Full support)
- Safari >= 14 (Requires Web Extensions Converter)

Uses `browser-polyfill.js` for cross-browser API compatibility.

- **Invoke the feature-dev:code-reviewer** agent to review your work and  make implement suggestions where needed
- Iterate on the review process where needed.
