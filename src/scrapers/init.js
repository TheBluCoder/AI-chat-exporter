/**
 * Scraper Initialization Module
 * Detects platform and initializes the appropriate scraper
 * Makes scraper functions available globally for backwards compatibility
 */

import { ChatGPTScraper } from './platforms/ChatGPTScraper.js';
import { GeminiScraper } from './platforms/GeminiScraper.js';
import { ClaudeScraper } from './platforms/ClaudeScraper.js';

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
  CLAUDE: {
    pattern: /^https:\/\/claude\.ai\/chat\//,
    name: 'Claude (Active Chat)',
    ScraperClass: ClaudeScraper,
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
      return config;
    }
  }

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
  window[platform.globalFunction] = async function () {
    return await scraper.scrape();
  };

  // Also expose runScrape for backwards compatibility with router
  window.runScrape = async function () {
    const result = await scraper.scrape();

    // Add platform info to result
    if (result.success) {
      result.detected_platform = platform.name;
      result.scraper_type = platform.ScraperClass.name;
    }

    return result;
  };

  // Expose platform info function
  window.getPlatformInfo = function () {
    return {
      url: window.location.href,
      platform_name: platform.name,
      scraper_type: platform.ScraperClass.name,
      scraper_available: true,
    };
  };
}

export default {
  initializeScrapers,
  detectPlatform,
};
