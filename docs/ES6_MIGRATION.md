# ES6 Modules Migration Guide

## Overview

The AI Chat Exporter has been migrated from IIFE-based scrapers to a modern ES6 modules architecture. This migration brings significant improvements in code maintainability, extensibility, and eliminates function name collisions.

## Architecture

### Template Method Pattern

The new architecture uses the **Template Method Pattern** with a base scraper class that provides common functionality:

```
BaseScraper (abstract)
├── ChatGPTScraper
├── GeminiScraper
└── ClaudeScraper
```

### Directory Structure

```
src/
├── scrapers/
│   ├── base/
│   │   └── BaseScraper.js          # Abstract base class
│   ├── config/
│   │   ├── chatgpt.config.js       # ChatGPT selectors & settings
│   │   ├── gemini.config.js        # Gemini selectors & settings
│   │   └── claude.config.js        # Claude selectors & settings
│   ├── platforms/
│   │   ├── ChatGPTScraper.js       # ChatGPT-specific logic
│   │   ├── GeminiScraper.js        # Gemini-specific logic
│   │   └── ClaudeScraper.js        # Claude-specific logic
│   └── init.js                      # Platform detection & initialization
├── utils-modules/
│   ├── html.js                      # HTML escaping utilities
│   ├── mime.js                      # MIME type detection
│   ├── media.js                     # Media handling
│   └── markdown.js                  # Markdown conversion
└── content-script.js                # Entry point
```

## Key Benefits

### 1. **Code Reduction**
- **ChatGPTScraper**: 500+ lines → 154 lines (70% reduction)
- **GeminiScraper**: 550+ lines → 392 lines (29% reduction)
- **BaseScraper**: 534 lines of shared logic (reused by all platforms)

### 2. **No Function Collisions**
- Each scraper is an ES6 module with its own scope
- No global namespace pollution
- No risk of function name conflicts

### 3. **Easy Extensibility**
Adding a new platform (e.g., Claude) requires only ~180 lines:

```javascript
import { BaseScraper } from '../base/BaseScraper.js';
import { CLAUDE_CONFIG } from '../config/claude.config.js';

export class ClaudeScraper extends BaseScraper {
  constructor() {
    super(CLAUDE_CONFIG);
  }

  async extractAllMessages(container) {
    // Platform-specific extraction logic (~50 lines)
  }

  async extractPreviewDocuments(modelTurn) {
    // Platform-specific document extraction (~80 lines)
  }
}
```

### 4. **Standardized Helper Methods**

The BaseScraper provides reusable helpers:

```javascript
// Text extraction
extractTextFromElement(element, options)
extractUserText(element)
extractModelText(element)

// Image extraction
extractImagesFromElement(element, options)
extractUserMedia(element)
extractModelMedia(element)

// Utilities
waitForElement(selector, timeout)
waitForContainer()
scrollToLoadHistory(container)
findScrollContainer(element)
createMessage(params)
```

## Platform-Specific Overrides

Each platform scraper only overrides what's unique:

### ChatGPTScraper
```javascript
// Overrides:
- extractAllMessages()      // Progressive scroll extraction (lazy loading)
- extractModelText()         // Code block formatting
- extractModelMedia()        // Image-only response handling
```

### GeminiScraper
```javascript
// Overrides:
- waitForContainer()         // Nested container structure
- extractAllMessages()       // Message-set structure
- extractUserText()          // File preview removal
- findScrollContainer()      // Custom starting point
- extractUploadedFiles()     // File carousel extraction
- extractImmersiveDocuments() // Preview panel extraction
- extractUserUploadedDocuments() // Document panel extraction
```

### ClaudeScraper
```javascript
// Overrides:
- extractAllMessages()       // Message structure detection
- isUserMessage()            // Role detection heuristic
- extractPreviewDocuments()  // Artifact/preview extraction
```

## Module Loading

### Dynamic Imports
Due to Chrome's limited support for `type: "module"` in content scripts, we use dynamic imports:

```javascript
// content-script.js
async function loadScrapers() {
  const moduleUrl = browserAPI.runtime.getURL('src/scrapers/init.js');
  const module = await import(moduleUrl);
  module.initializeScrapers();
}
```

### Web Accessible Resources
Module files must be declared in manifest.json:

```json
"web_accessible_resources": [
  {
    "resources": [
      "src/scrapers/*.js",
      "src/scrapers/**/*.js",
      "src/utils-modules/*.js"
    ],
    "matches": [
      "https://chatgpt.com/*",
      "https://gemini.google.com/*",
      "https://claude.ai/*"
    ]
  }
]
```

## Adding a New Platform

### 1. Create Configuration File
```javascript
// src/scrapers/config/newplatform.config.js
export const NEWPLATFORM_CONFIG = {
  platform: 'NewPlatform',
  selectors: {
    CONTAINER: 'main',
    USER_CONTENT: '.user-message',
    MODEL_CONTENT: '.assistant-message',
    // ... platform-specific selectors
  },
  scrollConfig: {
    maxAttempts: 50,
    delay: 1500,
  },
};
```

### 2. Create Scraper Class
```javascript
// src/scrapers/platforms/NewPlatformScraper.js
import { BaseScraper } from '../base/BaseScraper.js';
import { NEWPLATFORM_CONFIG } from '../config/newplatform.config.js';

export class NewPlatformScraper extends BaseScraper {
  constructor() {
    super(NEWPLATFORM_CONFIG);
  }

  async extractAllMessages(container) {
    const messages = [];
    const turns = container.querySelectorAll(this.selectors.MESSAGE_TURN);

    for (const turn of turns) {
      const role = turn.getAttribute('data-role');
      const text = this.extractUserText(turn); // Reuse base class
      const media = this.extractUserMedia(turn); // Reuse base class

      if (text || media) {
        messages.push(this.createMessage({
          role: role,
          content: text,
          media: media,
        }));
      }
    }

    return messages;
  }
}
```

### 3. Register in init.js
```javascript
import { NewPlatformScraper } from './platforms/NewPlatformScraper.js';

const PLATFORM_PATTERNS = {
  // ... existing platforms
  NEWPLATFORM: {
    pattern: /^https:\/\/newplatform\.com\/chat\//,
    name: 'NewPlatform',
    ScraperClass: NewPlatformScraper,
    globalFunction: 'scrapeNewPlatform',
  },
};
```

### 4. Update Manifest
```json
"content_scripts": [{
  "matches": [
    "https://chatgpt.com/c/*",
    "https://gemini.google.com/app/*",
    "https://claude.ai/chat/*",
    "https://newplatform.com/chat/*"  // Add new platform
  ]
}]
```

## Best Practices

### 1. Use Base Class Methods
```javascript
// Good - reuses base class
extractUserText(element) {
  return super.extractUserText(element); // Call base if no override needed
}

// Better - only override if customization needed
extractUserText(element) {
  // Custom preprocessing
  const customElement = this.preprocess(element);
  // Delegate to base class
  return super.extractUserText(customElement);
}
```

### 2. Minimize Overrides
Only override methods when absolutely necessary. The base class handles:
- Container waiting
- Scrolling to load history
- Content stabilization
- Statistics calculation
- Result formatting
- Error handling

### 3. Use Configuration Over Code
```javascript
// Good - configuration-driven
const CLAUDE_CONFIG = {
  selectors: {
    PREVIEW_BUTTON: '[aria-label="Preview contents"]',
  }
};

// Bad - hardcoded
const button = element.querySelector('[aria-label="Preview contents"]');
```

### 4. Document Overrides
```javascript
/**
 * Extract preview documents
 * Override to handle Claude's artifact panels
 * @param {Element} modelTurnElement - Model turn element
 * @returns {Promise<Array|null>} Preview documents
 */
async extractPreviewDocuments(modelTurnElement) {
  // Implementation
}
```

## Migration Checklist

When migrating an old IIFE scraper:

- [ ] Extract selectors to config file
- [ ] Identify unique vs common logic
- [ ] Create platform scraper class extending BaseScraper
- [ ] Override only platform-specific methods
- [ ] Reuse base class helpers where possible
- [ ] Test extraction functionality
- [ ] Update init.js registration
- [ ] Update manifest.json matches
- [ ] Document any special behaviors

## Common Patterns

### Click-Extract-Close Pattern
```javascript
async extractDocuments(element) {
  const buttons = element.querySelectorAll(this.selectors.BUTTON);
  const documents = [];

  for (const button of buttons) {
    button.click();
    await this.sleep(2000); // Wait for panel

    const panel = document.querySelector(this.selectors.PANEL);
    if (panel) {
      const content = panel.innerText;
      documents.push({ content });

      // Close panel
      const closeBtn = panel.querySelector('[aria-label="Close"]');
      if (closeBtn) closeBtn.click();
      await this.sleep(500);
    }
  }

  return documents.length > 0 ? documents : null;
}
```

### Progressive Scroll Pattern
```javascript
async extractAllMessages(container) {
  const scrollContainer = this.findScrollContainer(container);
  const allMessages = new Map();

  let currentScroll = 0;
  const scrollIncrement = scrollContainer.clientHeight * 0.8;

  while (currentScroll < scrollContainer.scrollHeight) {
    const visible = scrollContainer.querySelectorAll('.message');

    for (const msg of visible) {
      const id = msg.getAttribute('data-id');
      if (!allMessages.has(id)) {
        allMessages.set(id, this.extractMessage(msg));
      }
    }

    currentScroll += scrollIncrement;
    scrollContainer.scrollTop = currentScroll;
    await this.sleep(500);
  }

  return Array.from(allMessages.values());
}
```

## Troubleshooting

### Module not loading
- Check `web_accessible_resources` in manifest.json
- Verify file paths in import statements
- Check browser console for module loading errors

### Scraper not detecting platform
- Verify URL pattern in `PLATFORM_PATTERNS`
- Check that URL matches one of the patterns
- Look for "No specific platform detected" in console

### Base class method not working
- Ensure selectors are correctly configured
- Check that container structure matches expectations
- Override the method if platform needs custom logic

## Performance Considerations

### Lazy Loading
ChatGPT uses lazy loading, requiring progressive extraction:
```javascript
// Extract while scrolling to handle lazy-loaded content
async extractAllMessages(container) {
  return await this.progressiveScrollExtract(container);
}
```

### All-in-DOM
Gemini loads everything upfront, simpler extraction:
```javascript
// Simple extraction, everything is in DOM
async extractAllMessages(container) {
  const messageSets = container.querySelectorAll('.message-set');
  return this.extractFromMessageSets(messageSets);
}
```

## Version History

- **v3.0.0**: ES6 modules architecture
  - Template method pattern with BaseScraper
  - Separate config files
  - Shared utility modules
  - Dynamic import loading
  - 70% code reduction

- **v2.0.0**: IIFE-based scrapers
  - Individual scraper files
  - Function name collisions possible
  - Significant code duplication
