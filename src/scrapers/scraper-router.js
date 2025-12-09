/**
 * Scraper Router - Platform Detection and Scraper Selection
 * Automatically selects the correct scraper based on URL
 */

const PLATFORM_CONFIG = {
  // Google Gemini - Active Chat (use specialized scraper)
  GEMINI_CHAT: {
    pattern: /^https:\/\/gemini\.google\.com\/app\//,
    scraper: 'gemini',
    name: 'Google Gemini (Active Chat)',
  },
  
  // Google Gemini - Shared Conversation (use generic scraper)
  GEMINI_SHARED: {
    pattern: /^https:\/\/gemini\.google\.com\/share\//,
    scraper: 'gemini-shared',
    name: 'Google Gemini (Shared)',
  },
  
  // Claude - Active Chat (will use specialized scraper - to be implemented)
  CLAUDE_CHAT: {
    pattern: /^https:\/\/claude\.ai\/chat\//,
    scraper: 'claude',
    name: 'Claude (Active Chat)',
  },
  
  // ChatGPT - Main domain
  CHATGPT_CHAT: {
    pattern: /^https:\/\/chatgpt\.com\//,
    scraper: 'chatgpt',
    name: 'ChatGPT',
  },

  // ChatGPT - Alternative domain
  CHATGPT_CHAT_ALT: {
    pattern: /^https:\/\/chat\.openai\.com\//,
    scraper: 'chatgpt',
    name: 'ChatGPT',
  },
  
  // Meta AI - Active Chat (will use specialized scraper - to be implemented)
  METAAI_CHAT: {
    pattern: /^https:\/\/www\.meta\.ai\//,
    scraper: 'metaai',
    name: 'Meta AI (Active Chat)',
  },
  
  // Fallback - use generic scraper
  GENERIC: {
    pattern: /.*/,
    scraper: 'generic',
    name: 'Generic AI Chat',
  },
};

/**
 * Detect which platform we're on based on current URL
 * @returns {Object} Platform configuration
 */
function detectPlatform() {
  const currentUrl = window.location.href;
  
  // Check each platform pattern in order
  for (const [key, config] of Object.entries(PLATFORM_CONFIG)) {
    if (config.pattern.test(currentUrl)) {
      console.log(`[Scraper-Router] Detected platform: ${config.name}`);
      return config;
    }
  }
  
  // Fallback to generic
  console.log('[Scraper-Router] No specific platform detected, using generic scraper');
  return PLATFORM_CONFIG.GENERIC;
}

/**
 * Get the appropriate scraper function based on platform
 * @returns {Function} The scraper function to use
 */
function getScraperFunction() {
  const platform = detectPlatform();
  
  switch (platform.scraper) {
    case 'gemini':
      // Check if Gemini scraper is loaded
      if (typeof scrapeGeminiChat !== 'undefined') {
        console.log('[Scraper-Router] Using Gemini-specific scraper');
        return scrapeGeminiChat;
      }
      console.warn('[Scraper-Router] Gemini scraper not loaded, falling back to generic');
      return scrapeGeneric;
      
    case 'claude':
      // Check if Claude scraper is loaded
      if (typeof scrapeClaudeChat !== 'undefined') {
        console.log('[Scraper-Router] Using Claude-specific scraper');
        return scrapeClaudeChat;
      }
      console.warn('[Scraper-Router] Claude scraper not available yet, using generic');
      return scrapeGeneric;
      
    case 'chatgpt':
      // Check if ChatGPT scraper is loaded
      if (typeof scrapeChatGPT !== 'undefined') {
        console.log('[Scraper-Router] Using ChatGPT-specific scraper');
        return scrapeChatGPT;
      }
      console.warn('[Scraper-Router] ChatGPT scraper not available yet, using generic');
      return scrapeGeneric;
      
    case 'metaai':
      // Check if Meta AI scraper is loaded
      if (typeof scrapeMetaAI !== 'undefined') {
        console.log('[Scraper-Router] Using Meta AI-specific scraper');
        return scrapeMetaAI;
      }
      console.warn('[Scraper-Router] Meta AI scraper not available yet, using generic');
      return scrapeGeneric;
      
    case 'gemini-shared':
    default:
      if (typeof scrapeGeminiSharedChat !== 'undefined') {
        console.log('[Scraper-Router] Using Gemini-shared scraper');
        return scrapeGeminiSharedChat;
      }
      console.log('[Scraper-Router] Using gemini-shared scraper');
      return scrapeGeneric;
  }
}

/**
 * Main entry point for scraping - routes to appropriate scraper
 * @returns {Promise<Object>} Scraping result
 */
async function runScrape() {
  const platform = detectPlatform();
  console.log(`[Scraper-Router] Starting scrape for ${platform.name} at:`, location.href);
  
  try {
    // Get the appropriate scraper function
    const scraperFunction = getScraperFunction();
    
    // Execute the scraping
    const result = await scraperFunction();
    
    // Add platform info to result
    if (result.success) {
      result.detected_platform = platform.name;
      result.scraper_type = platform.scraper;
    }
    
    console.log('[Scraper-Router] Scrape completed:', result.success ? 'SUCCESS' : 'FAILED');
    
    // Send message to extension runtime
    try {
      if (typeof browserAPI !== "undefined" && browserAPI.runtime?.sendMessage) {
        browserAPI.runtime.sendMessage(
          { type: "SCRAPE_RESULT", payload: result, platform: platform.name },
          (response) => {
            if (browserAPI.runtime.lastError) {
              console.warn("[Scraper-Router] Runtime message error:", browserAPI.runtime.lastError);
            }
          }
        );
      }
    } catch (error) {
      console.warn("[Scraper-Router] Failed to send runtime message:", error);
    }
    
    // Post message to window for debugging (disabled - postMessage can't clone Promises)
    // window.postMessage({ type: "SCRAPE_RESULT", payload: result, platform: platform.name }, "*");

    return result;
    
  } catch (error) {
    console.error("[Scraper-Router] Fatal error:", error);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      url: location.href,
      detected_platform: platform.name,
      scraper_type: platform.scraper,
      error_stack: error.stack,
    };
  }
}

/**
 * Get platform information without scraping
 * @returns {Object} Platform details
 */
function getPlatformInfo() {
  const platform = detectPlatform();
  return {
    url: window.location.href,
    platform_name: platform.name,
    scraper_type: platform.scraper,
    scraper_available: getScraperFunction() !== undefined,
  };
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.runScrape = runScrape;
  window.getPlatformInfo = getPlatformInfo;
  window.detectPlatform = detectPlatform;
}

// Log platform detection on load
console.log('[Scraper-Router] Platform detection initialized');
console.log('[Scraper-Router] Current platform:', detectPlatform().name);
