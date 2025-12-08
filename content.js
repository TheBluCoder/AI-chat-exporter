/**
 * Content Script - Message Handler
 * Listens for messages from popup and triggers scraping
 */

console.log("[AI-Exporter] Content script loaded");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[AI-Exporter] Received message:", request.action);

  if (request.action === "SCRAPE_PAGE") {
    // Execute scraping asynchronously
    runScrape()
      .then((result) => {
        console.log("[AI-Exporter] Sending result to popup");
        sendResponse(result);
      })
      .catch((error) => {
        console.error("[AI-Exporter] Scrape failed:", error);
        sendResponse({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      });

    // Return true to indicate async response
    return true;
  }

  // Ping response for health check
  if (request.action === "PING") {
    sendResponse({ status: "ready" });
    return true;
  }

  // Unknown action
  console.warn("[AI-Exporter] Unknown action:", request.action);
  sendResponse({ success: false, error: "Unknown action" });
  return true;
});

// Notify that content script is ready
chrome.runtime.sendMessage({ type: "CONTENT_READY" }, (response) => {
  if (chrome.runtime.lastError) {
    // Extension context might not be ready, this is normal
    console.log("[AI-Exporter] Extension context not ready");
  }
});
