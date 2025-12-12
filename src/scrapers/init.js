/**
 * Scraper Initialization Module
 * Detects platform and initializes the appropriate scraper
 * Makes scraper functions available globally for backwards compatibility
 */

import { ChatGPTScraper } from './platforms/ChatGPTScraper.js';
import { GeminiScraper } from './platforms/GeminiScraper.js';

/**
 * Platform detection configuration
 */
const PLATFORM_PATTERNS = {
  CHATGPT: {
    pattern: /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//,
    name: 'ChatGPT',
    ScraperClass: ChatGPTScraper,
    globalFunction: 'scrapeChatGPT',
  },
  GEMINI_CHAT: {
    pattern: /^https:\/\/gemini\.google\.com\/app\//,
    name: 'Google Gemini (Active Chat)',
    ScraperClass: GeminiScraper,
    globalFunction: 'scrapeGeminiChat',
  },
  // Placeholders for future scrapers
  CLAUDE: {
    pattern: /^https:\/\/claude\.ai\/chat\//,
    name: 'Claude (Active Chat)',
    ScraperClass: null, // TODO: Implement ClaudeScraper
    globalFunction: 'scrapeClaude',
  },
  GEMINI_SHARED: {
    pattern: /^https:\/\/gemini\.google\.com\/share\//,
    name: 'Google Gemini (Shared)',
    ScraperClass: null, // TODO: Implement GeminiSharedScraper
    globalFunction: 'scrapeGeminiSharedChat',
  },
};

/**
 * Detect which platform we're on
 * @returns {Object|null} Platform configuration or null
 */
export function detectPlatform() {
  const currentUrl = window.location.href;

  for (const [key, config] of Object.entries(PLATFORM_PATTERNS)) {
    if (config.pattern.test(currentUrl)) {
      console.log(`[Scraper-Init] Detected platform: ${config.name}`);
      return config;
    }
  }

  console.log('[Scraper-Init] No specific platform detected');
  return null;
}

/**
 * Initialize scrapers - detect platform and expose global scraper function
 * This maintains backwards compatibility with the old router system
 */
export function initializeScrapers() {
  const platform = detectPlatform();

  if (!platform) {
    console.warn('[Scraper-Init] No scraper available for this URL');
    return;
  }

  if (!platform.ScraperClass) {
    console.warn(`[Scraper-Init] Scraper not yet implemented for ${platform.name}`);
    return;
  }

  // Create scraper instance
  const scraper = new platform.ScraperClass();

  // Expose global function for backwards compatibility with popup.js
  window[platform.globalFunction] = async function() {
    return await scraper.scrape();
  };

  // Also expose runScrape for backwards compatibility with router
  window.runScrape = async function() {
    const result = await scraper.scrape();

    // Add platform info to result
    if (result.success) {
      result.detected_platform = platform.name;
      result.scraper_type = platform.ScraperClass.name;
    }

    // Send message to extension runtime (if available)
    try {
      if (typeof browserAPI !== "undefined" && browserAPI.runtime?.sendMessage) {
        browserAPI.runtime.sendMessage(
          { type: "SCRAPE_RESULT", payload: result, platform: platform.name },
          (response) => {
            if (browserAPI.runtime.lastError) {
              console.warn("[Scraper-Init] Runtime message error:", browserAPI.runtime.lastError);
            }
          }
        );
      }
    } catch (error) {
      console.warn("[Scraper-Init] Failed to send runtime message:", error);
    }

    return result;
  };

  // Expose platform info function
  window.getPlatformInfo = function() {
    return {
      url: window.location.href,
      platform_name: platform.name,
      scraper_type: platform.ScraperClass.name,
      scraper_available: true,
    };
  };

  console.log(`[Scraper-Init] Initialized ${platform.name} scraper`);
  console.log(`[Scraper-Init] Global function available: window.${platform.globalFunction}()`);
}

export default {
  initializeScrapers,
  detectPlatform,
};
