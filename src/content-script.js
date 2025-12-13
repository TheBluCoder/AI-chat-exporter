/**
 * Content Script Entry Point
 * Main entry point for the browser extension content script
 * Uses dynamic imports to load ES6 modules
 */

console.log('[AI-Chat-Exporter] Content script loaded');
console.log('[AI-Chat-Exporter] URL:', window.location.href);

// Dynamic import with proper extension URL
async function loadScrapers() {
  try {
    const moduleUrl = browserAPI.runtime.getURL('src/scrapers/init.js');
    console.log('[AI-Chat-Exporter] Loading module from:', moduleUrl);

    const module = await import(moduleUrl);
    console.log('[AI-Chat-Exporter] Module loaded successfully');

    module.initializeScrapers();
  } catch (error) {
    console.error('[AI-Chat-Exporter] Failed to load scrapers:', error);
  }
}

// Initialize scrapers when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadScrapers);
} else {
  // DOM already loaded
  loadScrapers();
}

// Listen for messages from the popup
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[AI-Chat-Exporter] Received message:", request.action);

  if (request.action === "SCRAPE_PAGE") {
    // Execute scraping asynchronously
    // runScrape() is exposed globally by initializeScrapers()
    if (typeof window.runScrape === 'function') {
      window.runScrape()
        .then((result) => {
          console.log("[AI-Chat-Exporter] Sending result to popup");
          sendResponse(result);
        })
        .catch((error) => {
          console.error("[AI-Chat-Exporter] Scrape failed:", error);
          sendResponse({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        });
    } else {
      console.error("[AI-Chat-Exporter] runScrape() not available - scraper not initialized for this platform");
      sendResponse({
        success: false,
        error: "No scraper available for this platform",
        timestamp: new Date().toISOString(),
      });
    }

    // Return true to indicate async response
    return true;
  }

  // Ping response for health check
  if (request.action === "PING") {
    sendResponse({ status: "ready" });
    return true;
  }

  // Unknown action
  console.warn("[AI-Chat-Exporter] Unknown action:", request.action);
  sendResponse({ success: false, error: "Unknown action" });
  return true;
});

// Notify that content script is ready
browserAPI.runtime.sendMessage({ type: "CONTENT_READY" }, (response) => {
  if (browserAPI.runtime.lastError) {
    // Extension context might not be ready, this is normal
    console.log("[AI-Chat-Exporter] Extension context not ready");
  }
});

console.log('[AI-Chat-Exporter] Scraper initialization complete');
