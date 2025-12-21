/**
 * Popup Script - User Interface Handler
 * Manages the extension popup UI and interaction
 */

import {
  CACHE_VALIDITY_MS,
  JSON_INDENT_SPACES,
  MS_TO_SECONDS,
  UI_FEEDBACK_TIMEOUT_MS,
  PLATFORM_URL_PATTERNS
} from './constants.js';

// DOM elements
const exportBtn = document.getElementById("exportBtn");
const btnCopyJson = document.getElementById("btnCopyJson");
const btnDownloadJson = document.getElementById("btnDownloadJson");
const btnDownloadMd = document.getElementById("btnDownloadMd");
const btnExportPdf = document.getElementById("btnExportPdf");

const statusContainer = document.getElementById("statusContainer");
const statusTitle = document.getElementById("statusTitle");
const statusPercent = document.getElementById("statusPercent");
const progressBar = document.getElementById("progressBar");
const statusSubtitle = document.getElementById("statusSubtitle");

const statsGrid = document.getElementById("statsGrid");
const statMessages = document.getElementById("statMessages");
const statMedia = document.getElementById("statMedia");
const statDuration = document.getElementById("statDuration");

const actionsGrid = document.getElementById("actionsGrid");
const errorBox = document.getElementById("errorBox");
const errorText = document.getElementById("errorText");

let lastResult = null;
let scrapeStartTime = 0;

/**
 * Extract chat ID from URL
 * @param {string} url - The current tab URL
 * @returns {string|null} - Chat ID or null if not found
 */
function extractChatId(url) {
  if (!url) return null;

  try {
    // Parse URL and get pathname
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Split by '/' and get the last non-empty segment
    const segments = pathname.split('/').filter(s => s.length > 0);
    const chatId = segments[segments.length - 1];

    return chatId || null;
  } catch (err) {
    console.error('[AI-Exporter] Error extracting chat ID:', err);
    return null;
  }
}

/**
 * Check if cached data is still valid (within 12 hours)
 * @param {number} timestamp - Cached timestamp in milliseconds
 * @returns {boolean} - True if still valid, false if expired
 */
function isCacheValid(timestamp) {
  if (!timestamp) return false;
  const now = Date.now();
  return (now - timestamp) < CACHE_VALIDITY_MS;
}

/**
 * Load cached result from storage if valid
 */
async function loadCachedResult() {
  try {
    // Get current tab URL
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    const currentChatId = extractChatId(tab.url);
    if (!currentChatId) {
      return;
    }

    // Get cached data from storage
    const data = await browserAPI.storage.local.get(['chatId', 'lastResult', 'timestamp']);

    if (!data.chatId || !data.lastResult || !data.timestamp) {
      return;
    }

    // Check if chat ID matches and cache is still valid
    if (data.chatId === currentChatId && isCacheValid(data.timestamp)) {
      lastResult = data.lastResult;

      // Calculate duration from cached timestamp
      const cachedDuration = data.lastResult.statistics?.duration || 0;

      // Show the cached result in UI
      showSuccess(lastResult, cachedDuration);
    } else {
      // Clear invalid cache
      await browserAPI.storage.local.clear();
    }
  } catch (err) {
    console.error('[AI-Exporter] Error loading cached result:', err);
  }
}

/**
 * Save result to storage
 * @param {object} result - The scraping result to cache
 * @param {string} chatId - The chat ID to use as key
 */
async function saveCachedResult(result, chatId) {
  try {
    if (!chatId || !result) return;

    await browserAPI.storage.local.set({
      chatId: chatId,
      lastResult: result,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('[AI-Exporter] Error saving to cache:', err);
  }
}

/**
 * Reset UI state
 */
function resetUI() {
  errorBox.classList.remove("show");
  statsGrid.classList.remove("show");
  actionsGrid.classList.remove("show");
  statusContainer.classList.remove("active");
  progressBar.classList.remove("indeterminate", "complete");
  progressBar.style.width = "0%";
}

/**
 * Show loading state
 */
function showLoading() {
  resetUI();
  statusContainer.classList.add("active");
  statusTitle.textContent = "Processing...";
  statusPercent.textContent = "";
  statusSubtitle.textContent = "Extracting conversation data...";
  progressBar.classList.add("indeterminate");

  exportBtn.disabled = true;
  exportBtn.innerHTML = '<span class="material-symbols-outlined">sync</span><span>Processing...</span>';
}

/**
 * Hide loading state
 */
function hideLoading() {
  exportBtn.disabled = false;
  exportBtn.innerHTML = '<span class="material-symbols-outlined">download</span><span>Export Current Page</span>';
  progressBar.classList.remove("indeterminate");
}

/**
 * Show error message
 */
function showError(message) {
  hideLoading();
  statusContainer.classList.remove("active");
  errorText.textContent = message;
  errorBox.classList.add("show");
}

/**
 * Show completion state
 */
function showSuccess(result, durationMs) {
  hideLoading();

  // Update Status
  statusContainer.classList.add("active");
  statusTitle.textContent = "Export Complete!";
  statusPercent.textContent = "100%";
  statusSubtitle.textContent = "Conversation processed successfully.";
  progressBar.classList.add("complete");

  // Update Stats
  const messageCount = result.count || (result.messages ? result.messages.length : 0);
  const mediaCount = result.statistics?.generated_media + result.statistics?.uploaded_files ||
    (result.messages || []).reduce((acc, msg) => {
      // Handle both formats: media/images for images, uploaded_files/uploadedFiles for uploads
      const media = msg.media || msg.images || [];
      const uploads = msg.uploaded_files || msg.uploadedFiles || [];
      return acc + media.length + uploads.length;
    }, 0);

  statMessages.textContent = messageCount;
  statMedia.textContent = mediaCount;
  statDuration.textContent = (durationMs / MS_TO_SECONDS).toFixed(1) + "s";

  // Show Grids
  statsGrid.classList.add("show");
  actionsGrid.classList.add("show");
}

/**
 * Handle export button click
 */
async function handleExport() {
  scrapeStartTime = Date.now();
  showLoading();

  try {
    // Get active tab
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error("No active tab found");
    }

    // Check if we can access the tab (browser internal pages)
    if (tab.url.startsWith("chrome://") ||
        tab.url.startsWith("edge://") ||
        tab.url.startsWith("about:") ||
        tab.url.startsWith("moz-extension://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("safari-extension://")) {
      throw new Error("Cannot access browser internal pages");
    }

    // Send message to content script
    browserAPI.tabs.sendMessage(
      tab.id,
      { action: "SCRAPE_PAGE" },
      (response) => {
        const duration = Date.now() - scrapeStartTime;

        // Check for runtime errors
        if (browserAPI.runtime.lastError) {
          showError(`Connection failed: ${browserAPI.runtime.lastError.message}. \nTry refreshing the page.`);
          return;
        }

        if (!response) {
          showError("No response from page. Try refreshing the page.");
          return;
        }

        // Store result
        lastResult = response;

        // Display result
        if (response.success) {
          showSuccess(response, duration);

          // Save to storage cache
          const chatId = extractChatId(tab.url);
          if (chatId) {
            saveCachedResult(response, chatId);
          }
        } else {
          showError(response.error || "Scraping failed");
          console.error("Export failed:", response);
        }
      }
    );
  } catch (err) {
    showError(err.message);
    console.error("Export error:", err);
  }
}

/**
 * Handle copy button click
 */
async function handleCopyJson() {
  if (!lastResult) return;

  const jsonString = JSON.stringify(lastResult, null, JSON_INDENT_SPACES);
  const success = await copyToClipboard(jsonString);
  const originalHtml = btnCopyJson.innerHTML;

  if (success) {
    btnCopyJson.innerHTML = `<span class="material-symbols-outlined">check</span> Copied!`;
    setTimeout(() => {
      btnCopyJson.innerHTML = originalHtml;
    }, UI_FEEDBACK_TIMEOUT_MS);
  } else {
    btnCopyJson.innerHTML = `<span class="material-symbols-outlined">error</span> Error`;
    setTimeout(() => {
      btnCopyJson.innerHTML = originalHtml;
    }, UI_FEEDBACK_TIMEOUT_MS);
  }
}

/**
 * Handle Download JSON
 */
function handleDownloadJson() {
  if (!lastResult) return;
  const filename = generateFilename(lastResult, 'json');
  const jsonString = JSON.stringify(lastResult, null, JSON_INDENT_SPACES);
  downloadFile(jsonString, filename, "application/json");
}

/**
 * Handle Download Markdown
 */
async function handleDownloadMd() {
  if (!lastResult) return;
  const filename = generateFilename(lastResult, 'md');

  // Temporarily show loading on button
  const originalHtml = btnDownloadMd.innerHTML;
  btnDownloadMd.innerHTML = `<span class="material-symbols-outlined">sync</span> Generating...`;

  try {
    const md = await convertToMarkdown(lastResult);
    downloadFile(md, filename, "text/markdown");
    btnDownloadMd.innerHTML = originalHtml;
  } catch (e) {
    console.error(e);
    btnDownloadMd.innerHTML = `<span class="material-symbols-outlined">error</span> Error`;
    setTimeout(() => btnDownloadMd.innerHTML = originalHtml, UI_FEEDBACK_TIMEOUT_MS);
  }
}

/**
 * Handle PDF Export
 */
async function handleExportPdf() {
  if (!lastResult) return;

  const originalHtml = btnExportPdf.innerHTML;
  btnExportPdf.innerHTML = `<span class="material-symbols-outlined">sync</span> Processing...`;

  try {
    await exportToPDF(lastResult);
    btnExportPdf.innerHTML = originalHtml;
  } catch (e) {
    console.error(e);
    btnExportPdf.innerHTML = `<span class="material-symbols-outlined">error</span> Error`;
    setTimeout(() => btnExportPdf.innerHTML = originalHtml, UI_FEEDBACK_TIMEOUT_MS);
  }
}

// Markdown and PDF export functions are now imported from utils.js
// - urlToBase64()
// - convertToMarkdown()
// - exportToPDF()

/**
 * Handle report issue click
 */
function handleReportIssue(e) {
  e.preventDefault();

  const version = browserAPI.runtime.getManifest().version;
  const diagnostics = `**Extension Version:** ${version}
**Browser:** ${navigator.userAgent}
**Platform:** ${navigator.platform}

**Issue Description:**
[Describe what happened]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**
[What you expected to happen]

**Screenshots:**
[If applicable]`;

  const issueUrl = `https://github.com/TheBluCoder/AI-chat-exporter/issues/new?body=${encodeURIComponent(diagnostics)}`;
  window.open(issueUrl, '_blank');
}

// Event listeners
exportBtn.addEventListener("click", handleExport);
if (btnCopyJson) btnCopyJson.addEventListener("click", handleCopyJson);
if (btnDownloadJson) btnDownloadJson.addEventListener("click", handleDownloadJson);
if (btnDownloadMd) btnDownloadMd.addEventListener("click", handleDownloadMd);
if (btnExportPdf) btnExportPdf.addEventListener("click", handleExportPdf);

const reportIssueBtn = document.getElementById("reportIssue");
if (reportIssueBtn) reportIssueBtn.addEventListener("click", handleReportIssue);

/**
 * Check if current page is a supported platform
 */
async function checkSupportedPlatform() {
  try {
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    const url = tab.url;
    const supportedPatterns = Object.values(PLATFORM_URL_PATTERNS);
    const isSupported = supportedPatterns.some(pattern => pattern.test(url));

    if (!isSupported) {
      showError("This extension only works on ChatGPT, Claude, or Google Gemini conversation pages.");
      exportBtn.disabled = true;
    }
  } catch (err) {
    console.error('[AI-Exporter] Error checking platform:', err);
  }
}

// Check platform and load cached result
checkSupportedPlatform();
loadCachedResult();
