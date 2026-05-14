/**
 * Popup Script - User Interface Handler
 * Manages the extension popup UI and interaction
 */

import {
  CACHE_VALIDITY_MS,
  JSON_INDENT_SPACES,
  MS_TO_SECONDS,
  UI_FEEDBACK_TIMEOUT_MS,
  PLATFORM_URL_PATTERNS,
  SETTINGS_KEYS,
  DEFAULT_SETTINGS
} from './constants.js';

// DOM elements
const exportBtn = document.getElementById("exportBtn");
const exportSelectedBtn = document.getElementById("exportSelectedBtn");
const btnCopyJson = document.getElementById("btnCopyJson");
const btnDownloadJson = document.getElementById("btnDownloadJson");
const btnDownloadMd = document.getElementById("btnDownloadMd");
const btnExportPdf = document.getElementById("btnExportPdf");
const embedMediaToggle = document.getElementById("embedMediaToggle");
const broadAccessToggle = document.getElementById("broadAccessToggle");
const cacheToggle = document.getElementById("cacheToggle");
const clearCacheBtn = document.getElementById("clearCacheBtn");
const revokeBroadAccessBtn = document.getElementById("revokeBroadAccessBtn");
const settingsStatus = document.getElementById("settingsStatus");
const pageDiagnostic = document.getElementById("pageDiagnostic");

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
let currentSettings = { ...DEFAULT_SETTINGS };
const BROAD_MEDIA_PERMISSION = { origins: ['<all_urls>'] };
let activeExportSession = null;

function setPageDiagnostic(message, kind = "warn") {
  if (!pageDiagnostic) return;
  pageDiagnostic.textContent = message;
  pageDiagnostic.classList.remove("ok", "warn", "error");
  pageDiagnostic.classList.add(kind);
}

function setExportButtonReady() {
  exportBtn.disabled = false;
  exportBtn.innerHTML = '<span class="material-symbols-outlined">download</span><span>Export Current Page</span>';
  if (exportSelectedBtn) {
    exportSelectedBtn.disabled = false;
    exportSelectedBtn.innerHTML = '<span class="material-symbols-outlined">select_all</span><span>Export Selected</span>';
  }
}

function setExportButtonBlocked(label = "Unsupported Page") {
  exportBtn.disabled = true;
  exportBtn.innerHTML = `<span class="material-symbols-outlined">block</span><span>${label}</span>`;
  if (exportSelectedBtn) {
    exportSelectedBtn.disabled = true;
  }
}

function isNoReceiverError(message) {
  if (!message) return false;
  const text = String(message).toLowerCase();
  return text.includes('receiving end does not exist') || text.includes('could not establish connection');
}

function sendMessageToTab(tabId, payload) {
  return new Promise((resolve, reject) => {
    browserAPI.tabs.sendMessage(tabId, payload, (response) => {
      const err = browserAPI.runtime.lastError;
      if (err) {
        reject(new Error(err.message || 'Unknown sendMessage error'));
        return;
      }
      resolve(response);
    });
  });
}

function beginExportSession(tabId, action) {
  activeExportSession = {
    tabId,
    action,
  };
}

function endExportSession() {
  activeExportSession = null;
}

function getExportTimeoutMs(url, isSelected = false) {
  const isChatGPT = PLATFORM_URL_PATTERNS.CHATGPT.test(url || "");
  if (isChatGPT) {
    return isSelected ? 120000 : 90000;
  }
  return 30000;
}

function executeScriptInTab(tabId, files) {
  return new Promise((resolve, reject) => {
    try {
      browserAPI.scripting.executeScript(
        {
          target: { tabId },
          files,
        },
        () => {
          const err = browserAPI.runtime.lastError;
          if (err) {
            reject(new Error(err.message || 'Script injection failed'));
            return;
          }
          resolve(true);
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

async function sendMessageWithRecovery(tabId, payload) {
  try {
    return await sendMessageToTab(tabId, payload);
  } catch (err) {
    if (!isNoReceiverError(err.message)) {
      throw err;
    }

    setPageDiagnostic("Recovering connection to this tab...", "warn");
    await executeScriptInTab(tabId, ["src/lib/browser-polyfill.js", "src/content-script.js"]);
    await new Promise((resolve) => setTimeout(resolve, 150));
    setPageDiagnostic("Connected. Retrying export...", "warn");
    return await sendMessageToTab(tabId, payload);
  }
}

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
      // Clear invalid cache without removing settings
      await clearCachedResult();
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
    if (!currentSettings[SETTINGS_KEYS.CACHE_EXPORTS]) {
      await clearPersistentCachedResult();
      return;
    }

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

async function clearPersistentCachedResult() {
  try {
    await browserAPI.storage.local.remove(['chatId', 'lastResult', 'timestamp']);
  } catch (err) {
    console.error('[AI-Exporter] Error clearing persistent cache:', err);
  }
}

async function clearCachedResult() {
  try {
    await clearPersistentCachedResult();
    lastResult = null;
  } catch (err) {
    console.error('[AI-Exporter] Error clearing cache:', err);
  }
}

async function loadSettings() {
  try {
    const data = await browserAPI.storage.local.get(Object.values(SETTINGS_KEYS));
    currentSettings = { ...DEFAULT_SETTINGS, ...data };
    if (embedMediaToggle) {
      embedMediaToggle.checked = Boolean(currentSettings[SETTINGS_KEYS.EMBED_REMOTE_MEDIA]);
    }
    if (cacheToggle) {
      cacheToggle.checked = Boolean(currentSettings[SETTINGS_KEYS.CACHE_EXPORTS]);
    }
    await refreshBroadAccessToggle();
  } catch (err) {
    console.error('[AI-Exporter] Error loading settings:', err);
  }
}

async function saveSetting(key, value) {
  currentSettings[key] = value;
  await browserAPI.storage.local.set({ [key]: value });
}

function showSettingsStatus(message) {
  if (!settingsStatus) return;
  settingsStatus.textContent = message || '';
  if (!message) return;
  setTimeout(() => {
    if (settingsStatus.textContent === message) settingsStatus.textContent = '';
  }, 3000);
}

function permissionContains(permissions) {
  return new Promise((resolve) => {
    try {
      browserAPI.permissions.contains(permissions, (result) => resolve(Boolean(result)));
    } catch (_err) {
      resolve(false);
    }
  });
}

function permissionRequest(permissions) {
  return new Promise((resolve) => {
    try {
      browserAPI.permissions.request(permissions, (granted) => resolve(Boolean(granted)));
    } catch (_err) {
      resolve(false);
    }
  });
}

function permissionRemove(permissions) {
  return new Promise((resolve) => {
    try {
      browserAPI.permissions.remove(permissions, (removed) => resolve(Boolean(removed)));
    } catch (_err) {
      resolve(false);
    }
  });
}

async function refreshBroadAccessToggle() {
  if (!broadAccessToggle) return false;
  const hasAccess = await permissionContains(BROAD_MEDIA_PERMISSION);
  broadAccessToggle.checked = hasAccess;
  return hasAccess;
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
  if (exportSelectedBtn) {
    exportSelectedBtn.disabled = true;
    exportSelectedBtn.innerHTML = '<span class="material-symbols-outlined">sync</span><span>Processing...</span>';
  }
  setPageDiagnostic("Export request sent. Waiting for page response...", "warn");
}

/**
 * Hide loading state
 */
function hideLoading() {
  setExportButtonReady();
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
    beginExportSession(tab.id, "SCRAPE_PAGE");

    // Check if we can access the tab (browser internal pages)
    if (tab.url.startsWith("chrome://") ||
        tab.url.startsWith("edge://") ||
        tab.url.startsWith("about:") ||
        tab.url.startsWith("moz-extension://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("safari-extension://")) {
      throw new Error("Cannot access browser internal pages");
    }

    // Ensure prior selection mode overlays are cleared before normal export.
    try {
      await sendMessageWithRecovery(tab.id, { action: "CLEAR_SELECTION_MODE" });
    } catch (_err) {
      // ignore; export request below is authoritative
    }

    const timeoutMs = getExportTimeoutMs(tab.url, false);
    const response = await Promise.race([
      sendMessageWithRecovery(tab.id, { action: "SCRAPE_PAGE" }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for page content script response.")), timeoutMs))
    ]);

    const duration = Date.now() - scrapeStartTime;
    if (!response) {
      showError("No response from page. Try refreshing the page and wait for the conversation to load.");
      return;
    }

    // Store result
    lastResult = response;

    // Display result
    if (response.success) {
      setPageDiagnostic("Export succeeded. Download options are available below.", "ok");
      showSuccess(response, duration);

      // Save to storage cache
      const chatId = extractChatId(tab.url);
      if (chatId) {
        saveCachedResult(response, chatId);
      }
    } else {
      setPageDiagnostic(`Export failed: ${response.error || "unknown error"}`, "error");
      showError(response.error || "Scraping failed");
      console.error("Export failed:", response);
    }
  } catch (err) {
    showError(err.message);
    setPageDiagnostic(`Export error: ${err.message}`, "error");
    console.error("Export error:", err);
  } finally {
    endExportSession();
  }
}

async function handleExportSelected() {
  scrapeStartTime = Date.now();
  showLoading();
  setPageDiagnostic("Select one or more messages in the page. Click Export Selected again to confirm export.", "warn");

  try {
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error("No active tab found");
    beginExportSession(tab.id, "EXPORT_SELECTED");

    const timeoutMs = getExportTimeoutMs(tab.url, true);
    const response = await Promise.race([
      sendMessageWithRecovery(tab.id, { action: "EXPORT_SELECTED" }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for selected export response.")), timeoutMs))
    ]);

    if (!response) {
      showError("No response from page. Try refreshing the page and retry Export Selected.");
      return;
    }

    if (response.selectionRequired) {
      hideLoading();
      setPageDiagnostic(response.message || "Selection mode is active. Pick messages and click Export Selected again.", "warn");
      return;
    }

    const duration = Date.now() - scrapeStartTime;
    lastResult = response;

    if (response.success) {
      showSuccess(response, duration);
      setPageDiagnostic(`Selected export complete (${response.count || 0} messages).`, "ok");
      const chatId = extractChatId(tab.url);
      if (chatId) {
        saveCachedResult(response, chatId);
      }
    } else {
      showError(response.error || "Selected export failed");
      setPageDiagnostic(`Selected export failed: ${response.error || "unknown error"}`, "error");
    }
  } catch (err) {
    showError(err.message);
    setPageDiagnostic(`Selected export error: ${err.message}`, "error");
  } finally {
    endExportSession();
  }
}

browserAPI.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.type !== "EXPORT_HEARTBEAT") return;
  if (!activeExportSession) return;

  const senderTabId = sender?.tab?.id;
  if (senderTabId && senderTabId !== activeExportSession.tabId) return;
  if (message.action && message.action !== activeExportSession.action) return;

  const seconds = Math.max(1, Math.round((message.elapsedMs || 0) / MS_TO_SECONDS));
  statusSubtitle.textContent = `Still working... ${seconds}s elapsed.`;
  setPageDiagnostic(`Still exporting from page... ${seconds}s elapsed.`, "warn");
});

/**
 * Handle copy button click
 */
async function handleCopyJson() {
  if (!lastResult) {
    showError("No export result is available to copy yet. Run Export Current Page first.");
    return;
  }

  const jsonString = JSON.stringify(lastResult, null, JSON_INDENT_SPACES);
  const success = await copyToClipboard(jsonString);
  const originalHtml = btnCopyJson.innerHTML;

  if (success) {
    btnCopyJson.innerHTML = `<span class="material-symbols-outlined">check</span> Copied!`;
    setTimeout(() => {
      btnCopyJson.innerHTML = originalHtml;
    }, UI_FEEDBACK_TIMEOUT_MS);
  } else {
    const detail = copyToClipboard.lastError ? ` ${copyToClipboard.lastError}` : "";
    showError(`Clipboard copy failed.${detail}`);
    btnCopyJson.innerHTML = `<span class="material-symbols-outlined">error</span> Error`;
    setTimeout(() => {
      btnCopyJson.innerHTML = originalHtml;
    }, UI_FEEDBACK_TIMEOUT_MS);
  }
}

/**
 * Handle Download JSON
 */
async function handleDownloadJson() {
  if (!lastResult) {
    showError("No export result is available to download yet. Run Export Current Page first.");
    return;
  }
  const filename = generateFilename(lastResult, 'json');
  const jsonString = JSON.stringify(lastResult, null, JSON_INDENT_SPACES);
  const originalHtml = btnDownloadJson.innerHTML;
  btnDownloadJson.innerHTML = `<span class="material-symbols-outlined">sync</span> Downloading...`;

  try {
    await downloadFile(jsonString, filename, "application/json");
    btnDownloadJson.innerHTML = `<span class="material-symbols-outlined">check</span> Downloaded`;
  } catch (err) {
    showError(`JSON download failed: ${err.message || err}`);
    btnDownloadJson.innerHTML = `<span class="material-symbols-outlined">error</span> Error`;
  } finally {
    setTimeout(() => {
      btnDownloadJson.innerHTML = originalHtml;
    }, UI_FEEDBACK_TIMEOUT_MS);
  }
}

/**
 * Handle Download Markdown
 */
async function handleDownloadMd() {
  if (!lastResult) {
    showError("No export result is available to download yet. Run Export Current Page first.");
    return;
  }
  const filename = generateFilename(lastResult, 'md');

  // Temporarily show loading on button
  const originalHtml = btnDownloadMd.innerHTML;
  btnDownloadMd.innerHTML = `<span class="material-symbols-outlined">sync</span> Generating...`;

  try {
    const md = await convertToMarkdown(lastResult, {
      embedRemoteMedia: currentSettings[SETTINGS_KEYS.EMBED_REMOTE_MEDIA]
    });
    await downloadFile(md, filename, "text/markdown");
    btnDownloadMd.innerHTML = originalHtml;
  } catch (e) {
    console.error(e);
    showError(`Markdown download failed: ${e.message || e}`);
    btnDownloadMd.innerHTML = `<span class="material-symbols-outlined">error</span> Error`;
    setTimeout(() => btnDownloadMd.innerHTML = originalHtml, UI_FEEDBACK_TIMEOUT_MS);
  }
}

/**
 * Handle PDF Export
 */
async function handleExportPdf() {
  if (!lastResult) {
    showError("No export result is available for PDF export yet. Run Export Current Page first.");
    return;
  }

  const originalHtml = btnExportPdf.innerHTML;
  btnExportPdf.innerHTML = `<span class="material-symbols-outlined">sync</span> Processing...`;

  try {
    await exportToPDF(lastResult, {
      embedRemoteMedia: currentSettings[SETTINGS_KEYS.EMBED_REMOTE_MEDIA]
    });
    btnExportPdf.innerHTML = originalHtml;
  } catch (e) {
    console.error(e);
    showError(`PDF export failed: ${e.message || e}`);
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
if (exportSelectedBtn) exportSelectedBtn.addEventListener("click", handleExportSelected);
if (btnCopyJson) btnCopyJson.addEventListener("click", handleCopyJson);
if (btnDownloadJson) btnDownloadJson.addEventListener("click", handleDownloadJson);
if (btnDownloadMd) btnDownloadMd.addEventListener("click", handleDownloadMd);
if (btnExportPdf) btnExportPdf.addEventListener("click", handleExportPdf);
if (embedMediaToggle) {
  embedMediaToggle.addEventListener("change", async () => {
    await saveSetting(SETTINGS_KEYS.EMBED_REMOTE_MEDIA, embedMediaToggle.checked);
  });
}
if (broadAccessToggle) {
  broadAccessToggle.addEventListener("change", async () => {
    if (broadAccessToggle.checked) {
      const granted = await permissionRequest(BROAD_MEDIA_PERMISSION);
      broadAccessToggle.checked = granted;
      showSettingsStatus(granted ? "Broad access granted." : "Broad access not granted.");
      return;
    }
    const removed = await permissionRemove(BROAD_MEDIA_PERMISSION);
    await refreshBroadAccessToggle();
    showSettingsStatus(removed ? "Broad access revoked." : "Broad access was not active.");
  });
}
if (cacheToggle) {
  cacheToggle.addEventListener("change", async () => {
    await saveSetting(SETTINGS_KEYS.CACHE_EXPORTS, cacheToggle.checked);
    if (!cacheToggle.checked) {
      await clearPersistentCachedResult();
    }
    showSettingsStatus(cacheToggle.checked ? "Persistent export cache enabled." : "Persistent export cache disabled.");
  });
}
if (clearCacheBtn) {
  clearCacheBtn.addEventListener("click", async () => {
    await clearCachedResult();
    showSettingsStatus("Cached export data cleared.");
  });
}
if (revokeBroadAccessBtn) {
  revokeBroadAccessBtn.addEventListener("click", async () => {
    const removed = await permissionRemove(BROAD_MEDIA_PERMISSION);
    await refreshBroadAccessToggle();
    showSettingsStatus(removed ? "Broad access revoked." : "Broad access was not active.");
  });
}

const reportIssueBtn = document.getElementById("reportIssue");
if (reportIssueBtn) reportIssueBtn.addEventListener("click", handleReportIssue);

/**
 * Check if current page is a supported platform
 */
async function checkSupportedPlatform() {
  try {
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      setExportButtonBlocked("No Active Tab");
      setPageDiagnostic("No active tab found.", "error");
      return false;
    }

    const url = tab.url;
    const supportedPatterns = Object.values(PLATFORM_URL_PATTERNS);
    const isSupported = supportedPatterns.some(pattern => pattern.test(url));

    if (!isSupported) {
      setExportButtonBlocked("Unsupported Page");
      setPageDiagnostic("This extension only works on ChatGPT, Claude, or Gemini conversation pages.", "error");
      return false;
    }
    setExportButtonReady();
    setPageDiagnostic("Supported conversation page detected.", "ok");
    return true;
  } catch (err) {
    console.error('[AI-Exporter] Error checking platform:', err);
    setExportButtonBlocked("Check Failed");
    setPageDiagnostic(`Page check failed: ${err.message}`, "error");
    return false;
  }
}

// Check platform and load cached result
(async () => {
  setExportButtonBlocked("Checking Page");
  setPageDiagnostic("Checking whether this tab is supported...", "warn");
  await loadSettings();
  const supported = await checkSupportedPlatform();
  if (currentSettings[SETTINGS_KEYS.CACHE_EXPORTS]) {
    loadCachedResult();
  } else {
    clearCachedResult();
  }
  if (!supported) {
    setExportButtonBlocked("Unsupported Page");
  }
})();
