/**
 * Content Script Entry Point
 * Main entry point for the browser extension content script
 * Uses ES6 modules to initialize platform-specific scrapers
 */

import { initializeScrapers } from './scrapers/init.js';

console.log('[AI-Chat-Exporter] Content script loaded');
console.log('[AI-Chat-Exporter] URL:', window.location.href);

// Initialize scrapers when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeScrapers();
  });
} else {
  // DOM already loaded
  initializeScrapers();
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
