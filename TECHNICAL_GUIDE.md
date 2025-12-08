# Technical Deep Dive: AI Chat Exporter Extension

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Component Breakdown](#component-breakdown)
3. [Data Flow](#data-flow)
4. [Key Optimizations](#key-optimizations)
5. [PDF Generation Strategy](#pdf-generation-strategy)

---

## Architecture Overview

### Extension Structure

```
┌─────────────────────────────────────────┐
│           Chrome Extension              │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐         ┌──────────┐     │
│  │ Popup    │────────▶│ Content  │     │
│  │ (UI/PDF) │◀────────│ Script   │     │
│  └──────────┘         └──────────┘     │
│       │                     │           │
│       │                     ▼           │
│       │               ┌──────────┐     │
│       │               │ Scraper  │     │
│       │               │ Router   │     │
│       │               └──────────┘     │
│       │                /        \       │
│       ▼               ▼          ▼      │
│  ┌─────────┐   ┌─────────┐  ┌─────────┐│
│  │ Browser │   │ Gemini  │  │ Generic ││
│  │ Print   │   │ Scraper │  │ Scraper ││
│  └─────────┘   └─────────┘  └─────────┘│
└─────────────────────────────────────────┘
```

### Component Roles

1. **manifest.json**: Configuration and permissions (`activeTab`, `scripting`).
2. **popup.html/js**: UI, JSON/Markdown generation, and **PDF Rendering**.
3. **content.js**: Bridge between popup and page context.
4. **scraper-router.js**: URL detection and dispatch logic.
5. **gemini-scraper.js**: Deep-scraping logic for active Gemini sessions (handles auto-scroll, immersive chips).
6. **gemini-shared.js**: Utilities and shared-link scraper.

---

## Component Breakdown

### 1. scraper-router.js - The Controller

**Purpose**: Determines *which* scraper logic to run based on the current URL.

```javascript
// Example logic
if (url.includes("gemini.google.com/app")) {
  return scrapeGeminiChat(); // Active chat
} else if (url.includes("gemini.google.com/share")) {
  return scrapeGeminiSharedChat(); // Public link
} else {
  return scrapeGeneric(); // Fallback
}
```

**Why This Matters**:
- Allows specialized handling for complex apps (Gemini) while maintaining a generic fallback for others.
- Keeps code modular and maintainable.

### 2. gemini-scraper.js - Specialized Logic

**Key Capabilities**:

#### Auto-Scrolling
```javascript
async function autoScrollToTop(container) {
  // Iteratively scrolls up and checks scrollHeight changes
  // Ensures full history is DOM-resident before scraping
}
```

#### Immersive Documents ("Chips")
Gemini often hides content (like charts or code docs) behind "chips".
`extractImmersiveDocuments()`:
1. Identifies chips in the model response.
2. Programmatically clicks them.
3. Waits for the side panel/modal to open.
4. Extracts content from the specific editor/viewer element.
5. Closes the panel to proceed.

### 3. gemini-shared.js - Utilities

Shared helper functions used across scrapers:
- `waitForElement(selector)`: MutationObserver wrapper.
- `waitForStableContent(element)`: Polling loop to wait for streaming text to finish.
- `extractMedia(element)`: Intelligent image and link extraction.

---

## Data Flow

### Request-Response Cycle

```
1. USER CLICKS EXPORT
   │
   ▼
2. popup.js logs request
   │
   ▼
3. content.js receives `SCRAPE_PAGE`
   │
   ▼
4. scraper-router.js: runScrape()
   │  Selects correct scraper
   ▼
5. gemini-scraper.js (example)
   ├─ Auto-scroll history
   ├─ Wait for stability
   ├─ Extract User Query & Uploads
   ├─ Extract Model Response & Media
   └─ Interact with Immersive Chips
   │
   ▼
6. content.js returns structured JSON
   │
   ▼
7. popup.js receives Data
```

---

## PDF Generation Strategy

Generating PDFs from a Chrome Extension popup is tricky due to sandboxing and print dialog behaviors.

### The Problem
Simply printing a generated HTML string often results in broken images because:
- Use of relative paths fails.
- Auth-protected URLs (CDN links) may not load in the print view context.
- Cross-Origin Resource Sharing (CORS) blocks.

### The Solution: Base64 Embedding

In `popup.js`, the `exportToPDF` function handles this:

1. **Deep Clone**: Creates a copy of the scrape result.
2. **Fetch & Encode**: Iterates through every image URL in the data.
   ```javascript
   const response = await fetch(url);
   const blob = await response.blob();
   // Convert blob to base64 data URI
   ```
3. **Embed**: Replaces `img src="https://..."` with `img src="data:image/png;base64..."`.
4. **Generate HTML**: Creates a print-styled HTML blob.
5. **Print**: Opens a new tab with the blob and calls `window.print()`.

This ensures the PDF looks exactly like the preview, offline-ready and self-contained.

---

## Key Optimizations

1. **Wait for Stability**: The scrapers don't just grab text; they observe character counts to ensure AI is done "typing".
2. **Deduplication**: `extractMedia` uses `Set` to prevent duplicate image logging (common in React-based virtual lists).
3. **Recursive Fallbacks**: If structured selection (e.g., `<user-query>`) fails, scrapers fall back to linear DOM iteration to guarantee *some* output is captured.
