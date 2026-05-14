/**
 * Content Script Bootstrap
 * Keeps entrypoint small by delegating behavior to focused modules.
 */

async function bootstrapContentScript() {
  try {
    const scraperModuleUrl = browserAPI.runtime.getURL('src/scrapers/init.js');
    const { initializeScrapers } = await import(scraperModuleUrl);
    initializeScrapers();

    const handlerModuleUrl = browserAPI.runtime.getURL('src/content/handler.js');
    const { initializeContentMessageHandlers } = await import(handlerModuleUrl);
    initializeContentMessageHandlers();
  } catch (error) {
    console.error('[AI-Chat-Exporter] Failed to bootstrap content script:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapContentScript);
} else {
  bootstrapContentScript();
}

browserAPI.runtime.sendMessage({ type: "CONTENT_READY" }, () => {
  if (browserAPI.runtime.lastError) {
    // Extension context might not be ready, this is normal.
  }
});
