/**
 * Scraper Constants
 * Centralized configuration values for all scrapers
 */

// Scroll Configuration
export const MAX_SCROLL_ATTEMPTS = 50;
export const SCROLL_DELAY_MS = 1500;
export const STABILITY_DELAY_MS = 500;
export const STABILITY_TIMEOUT_MS = 5000;
export const CHATGPT_STABILITY_TIMEOUT_MS = 10000;

// Element Wait Configuration
export const DEFAULT_ELEMENT_WAIT_TIMEOUT_MS = 10000;
export const ELEMENT_POLL_INTERVAL_MS = 100;

// Scroll Verification
export const SCROLL_WIGGLE_DELAY_MS = 150;

// Platform-Specific Delays
export const PREVIEW_CLOSE_DELAY_MS = 200;

// Logging Configuration
export const LOG_TEXT_PREVIEW_LENGTH = 50;

// Platform URL Patterns
export const PLATFORM_URL_PATTERNS = {
  CHATGPT: /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//,
  GEMINI_CHAT: /^https:\/\/gemini\.google\.com\/app\//,
  CLAUDE: /^https:\/\/claude\.ai\/chat\//,
  GEMINI_SHARED: /^https:\/\/gemini\.google\.com\/share\//,
};
