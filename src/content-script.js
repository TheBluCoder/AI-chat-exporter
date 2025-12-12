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

console.log('[AI-Chat-Exporter] Scraper initialization complete');
