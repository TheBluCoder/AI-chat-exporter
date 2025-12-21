/**
 * Popup Constants
 * Centralized configuration values for the popup interface
 */

// Cache Configuration
export const CACHE_VALIDITY_MS = 12 * 60 * 60 * 1000; // 12 hours

// JSON Formatting
export const JSON_INDENT_SPACES = 2;

// Time Conversion
export const MS_TO_SECONDS = 1000;

// UI Feedback
export const UI_FEEDBACK_TIMEOUT_MS = 2000;

// Platform URL Patterns (duplicated from scrapers/base/constants.js for popup context)
export const PLATFORM_URL_PATTERNS = {
  CHATGPT: /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//,
  GEMINI_CHAT: /^https:\/\/gemini\.google\.com\/app\//,
  CLAUDE: /^https:\/\/claude\.ai\/chat\//,
  GEMINI_SHARED: /^https:\/\/gemini\.google\.com\/share\//,
};
