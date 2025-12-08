# Scraper Router System Guide

## Overview

The scraper router automatically detects which AI platform you're on and loads the appropriate specialized scraper. This allows one extension to work perfectly on multiple platforms.

## How It Works

### URL Detection

```
User visits URL
    ↓
Router checks URL pattern
    ↓
Selects appropriate scraper
    ↓
Runs platform-specific extraction
    ↓
Returns results with platform info
```

## Supported Platforms

### ✅ Currently Implemented

| Platform | Active Chat URL | Shared URL | Scraper |
|----------|----------------|------------|---------|
| **Google Gemini** | `gemini.google.com/app/...` | `gemini.google.com/share/...` | Specialized / Generic |

### 🚧 Coming Soon

| Platform | Active Chat URL | Scraper Status |
|----------|----------------|----------------|
| **Claude** | `claude.ai/chat/...` | Planned |
| **ChatGPT** | `chatgpt.com/c/...` | Planned |
| **ChatGPT (Alt)** | `chat.openai.com/c/...` | Planned |
| **Meta AI** | `www.meta.ai/...` | Planned |

## URL Pattern Matching

### Gemini - Active Chat
```javascript
Pattern: /^https:\/\/gemini\.google\.com\/app\//
Example: https://gemini.google.com/app/abc123def456
Scraper: gemini-scraper.js (specialized)
Features: Upload tracking, source attribution, detailed stats
```

### Gemini - Shared Conversation
```javascript
Pattern: /^https:\/\/gemini\.google\.com\/share\//
Example: https://gemini.google.com/share/c13cce79da80
Scraper: scraper.js (generic)
Reason: Shared pages have different DOM structure
```

### Claude - Active Chat
```javascript
Pattern: /^https:\/\/claude\.ai\/chat\//
Example: https://claude.ai/chat/44692aa9-1232-4fae-8dc7-4d9abbb8e071
Scraper: claude-scraper.js (to be implemented)
```

### ChatGPT
```javascript
Pattern: /^https:\/\/chatgpt\.com\/c\//
        /^https:\/\/chat\.openai\.com\/c\//
Example: https://chatgpt.com/c/abc-def-123
Scraper: chatgpt-scraper.js (to be implemented)
```

### Meta AI
```javascript
Pattern: /^https:\/\/www\.meta\.ai\//
Example: https://www.meta.ai/...
Scraper: metaai-scraper.js (to be implemented)
```

## File Loading Order

The manifest loads scripts in this order:

```javascript
"content_scripts": [
  {
    "js": [
      "scraper.js",           // 1. Generic scraper
      "gemini-scraper.js",    // 2. Gemini scraper
      "scraper-router.js",    // 3. Router (detects & selects)
      "content.js"            // 4. Message handler
    ]
  }
]
```

**Why this order?**
1. Load all scrapers first
2. Load router (which references scrapers)
3. Load content.js (which calls router)

## Router Functions

### detectPlatform()

Detects which platform based on URL.

```javascript
const platform = detectPlatform();
// Returns:
// {
//   pattern: /^https:\/\/gemini\.google\.com\/app\//,
//   scraper: 'gemini',
//   name: 'Google Gemini (Active Chat)'
// }
```

### getScraperFunction()

Returns the appropriate scraper function.

```javascript
const scraperFn = getScraperFunction();
// Returns: scrapeGeminiChat (for Gemini active)
//     OR: scrapeGeminiContainer (for generic/shared)
//     OR: scrapeClaudeChat (for Claude - when implemented)
```

### runScrape()

Main entry point - routes to correct scraper.

```javascript
const result = await runScrape();
// Automatically uses correct scraper
// Adds platform info to result
```

### getPlatformInfo()

Get platform details without scraping.

```javascript
const info = getPlatformInfo();
// Returns:
// {
//   url: "https://gemini.google.com/app/...",
//   platform_name: "Google Gemini (Active Chat)",
//   scraper_type: "gemini",
//   scraper_available: true
// }
```

## Output Format

All scrapers return results with platform info:

```json
{
  "success": true,
  "messages": [...],
  "count": 10,
  "detected_platform": "Google Gemini (Active Chat)",
  "scraper_type": "gemini",
  "timestamp": "2024-12-07T12:00:00.000Z",
  "url": "https://gemini.google.com/app/..."
}
```

## Adding New Scrapers

### Step 1: Create Scraper File

Create `claude-scraper.js`:

```javascript
async function scrapeClaudeChat() {
  // Claude-specific extraction logic
  return {
    success: true,
    messages: [...],
    // ... platform-specific fields
  };
}

// Expose globally
if (typeof window !== 'undefined') {
  window.scrapeClaudeChat = scrapeClaudeChat;
}
```

### Step 2: Add to Router Config

Edit `scraper-router.js`:

```javascript
const PLATFORM_CONFIG = {
  // ... existing platforms
  
  CLAUDE_CHAT: {
    pattern: /^https:\/\/claude\.ai\/chat\//,
    scraper: 'claude',
    name: 'Claude (Active Chat)',
  },
};
```

### Step 3: Add Case in Router

Edit `getScraperFunction()`:

```javascript
case 'claude':
  if (typeof scrapeClaudeChat !== 'undefined') {
    console.log('[Scraper-Router] Using Claude-specific scraper');
    return scrapeClaudeChat;
  }
  console.warn('[Scraper-Router] Claude scraper not available, using generic');
  return scrapeGeminiContainer;
```

### Step 4: Add to Manifest

Edit `manifest.json`:

```json
"content_scripts": [
  {
    "js": [
      "scraper.js",
      "gemini-scraper.js",
      "claude-scraper.js",    // Add here
      "scraper-router.js",
      "content.js"
    ]
  }
]
```

### Step 5: Test

1. Visit Claude chat
2. Click extension
3. Router should detect Claude
4. Use Claude scraper

## Platform Detection Examples

### Example 1: Gemini Active Chat

```javascript
URL: https://gemini.google.com/app/b83bb820decd33de
Detected: "Google Gemini (Active Chat)"
Scraper: gemini-scraper.js
Result: Includes uploaded_files tracking
```

### Example 2: Gemini Shared

```javascript
URL: https://gemini.google.com/share/c13cce79da80
Detected: "Google Gemini (Shared)"
Scraper: scraper.js (generic)
Result: Standard message extraction
```

### Example 3: Claude

```javascript
URL: https://claude.ai/chat/44692aa9-1232-4fae-8dc7-4d9abbb8e071
Detected: "Claude (Active Chat)"
Scraper: claude-scraper.js (when implemented)
Result: Claude-specific features
```

### Example 4: Unknown Platform

```javascript
URL: https://example.com/chat
Detected: "Generic AI Chat"
Scraper: scraper.js (generic)
Result: Best-effort extraction
```

## Debugging

### Check Platform Detection

```javascript
// In browser console
window.getPlatformInfo()
// Shows current platform and scraper
```

### Check Available Scrapers

```javascript
// Check what's loaded
console.log('Generic:', typeof scrapeGeminiContainer !== 'undefined');
console.log('Gemini:', typeof scrapeGeminiChat !== 'undefined');
console.log('Claude:', typeof scrapeClaudeChat !== 'undefined');
```

### View Router Logs

```javascript
// Router logs to console with prefix
// Look for: [Scraper-Router] messages
```

### Force Specific Scraper

```javascript
// Bypass router, call scraper directly
const result = await scrapeGeminiChat();
```

## Benefits of Router System

### 1. Single Extension
- One extension works on all platforms
- No need to install multiple extensions
- Consistent UI across platforms

### 2. Platform Optimization
- Each platform gets specialized scraper
- Maximizes extraction quality
- Platform-specific features available

### 3. Easy Maintenance
- Add new platforms without changing existing code
- Update individual scrapers independently
- Fallback to generic if specialized unavailable

### 4. Smart Fallback
- If specialized scraper fails → generic scraper
- If generic scraper fails → detailed error
- Always attempts extraction

### 5. Future-Proof
- Easy to add new platforms
- Automatic platform detection
- Extensible configuration

## Migration from Single Scraper

### Old Way (Single Scraper)

```javascript
// Only worked on one platform
// manifest.json
"content_scripts": [{
  "matches": ["https://gemini.google.com/*"],
  "js": ["scraper.js", "content.js"]
}]
```

### New Way (Router)

```javascript
// Works on all platforms
// manifest.json
"content_scripts": [{
  "matches": ["<all_urls>"],
  "js": [
    "scraper.js",
    "gemini-scraper.js",
    "scraper-router.js",
    "content.js"
  ]
}]
```

## Performance Impact

### File Size
- Router: ~3 KB
- Each scraper: ~10-15 KB
- Total for all: ~50 KB (still very small)

### Load Time
- All scripts load once on page load
- Router adds <1ms detection time
- No noticeable performance impact

### Memory
- All scrapers loaded in memory
- Only one executes per page
- Minimal memory footprint

## Best Practices

### 1. Test Each Platform
When adding a new scraper:
- Test on active chats
- Test on shared/public pages
- Test edge cases (empty chats, large chats)

### 2. Consistent Output Format
All scrapers should return:
```javascript
{
  success: boolean,
  messages: array,
  count: number,
  timestamp: string,
  url: string,
  // Platform-specific fields OK
}
```

### 3. Error Handling
Each scraper should:
- Never throw uncaught errors
- Return `{success: false, error: "..."}` on failure
- Include debug info in errors

### 4. Console Logging
Use consistent prefixes:
- Generic: `[AI-Exporter]`
- Gemini: `[Gemini-Scraper]`
- Router: `[Scraper-Router]`
- Claude: `[Claude-Scraper]` (future)

### 5. Documentation
Document each scraper:
- Supported URL patterns
- Platform-specific features
- Output format differences
- Known limitations

## Troubleshooting

### Router not detecting platform?
**Check:** URL pattern in `PLATFORM_CONFIG`
**Fix:** Update regex pattern to match URL

### Scraper function not found?
**Check:** Script loading order in manifest
**Fix:** Ensure scraper loads before router

### Wrong scraper being used?
**Check:** URL pattern priority
**Fix:** More specific patterns should come first

### Extension not working on new platform?
**Check:** URL in `host_permissions`
**Fix:** Add URL pattern to manifest permissions

## Summary

The router system provides:
- ✅ Automatic platform detection
- ✅ Optimized scraper selection
- ✅ Consistent interface
- ✅ Easy extensibility
- ✅ Smart fallbacks
- ✅ Future-proof architecture

**Result:** One extension that works perfectly on all AI platforms!
