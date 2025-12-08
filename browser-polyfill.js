/**
 * Browser API Polyfill
 * Provides a unified API namespace that works across all browsers
 *
 * Firefox/Safari use 'browser' namespace (returns Promises)
 * Chrome/Edge use 'chrome' namespace (uses callbacks)
 *
 * This polyfill ensures consistent usage across all browsers
 */

(function() {
  'use strict';

  // If browser API already exists (Firefox, Safari), use it
  if (typeof browser !== 'undefined') {
    window.browserAPI = browser;
    console.log('[Browser-Polyfill] Using native browser API (Firefox/Safari)');
    return;
  }

  // If chrome API exists (Chrome, Edge), wrap it to match browser API
  if (typeof chrome !== 'undefined') {
    window.browserAPI = chrome;
    console.log('[Browser-Polyfill] Using chrome API (Chrome/Edge)');
    return;
  }

  // Neither API exists - this shouldn't happen in a web extension context
  console.error('[Browser-Polyfill] No browser extension API found!');
  window.browserAPI = {};
})();
