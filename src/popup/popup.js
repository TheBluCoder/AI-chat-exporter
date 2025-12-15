/**
 * Popup Script - User Interface Handler
 * Manages the extension popup UI and interaction
 */

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
  statDuration.textContent = (durationMs / 1000).toFixed(1) + "s";

  // Show Grids
  statsGrid.classList.add("show");
  actionsGrid.classList.add("show");

  console.log("Export successful:", result);
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

  const jsonString = JSON.stringify(lastResult, null, 2);
  const success = await copyToClipboard(jsonString);
  const originalHtml = btnCopyJson.innerHTML;

  if (success) {
    btnCopyJson.innerHTML = `<span class="material-symbols-outlined">check</span> Copied!`;
    setTimeout(() => {
      btnCopyJson.innerHTML = originalHtml;
    }, 2000);
  } else {
    btnCopyJson.innerHTML = `<span class="material-symbols-outlined">error</span> Error`;
    setTimeout(() => {
      btnCopyJson.innerHTML = originalHtml;
    }, 2000);
  }
}

/**
 * Handle Download JSON
 */
function handleDownloadJson() {
  if (!lastResult) return;
  const filename = generateFilename(lastResult, 'json');
  const jsonString = JSON.stringify(lastResult, null, 2);
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
    setTimeout(() => btnDownloadMd.innerHTML = originalHtml, 2000);
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
    setTimeout(() => btnExportPdf.innerHTML = originalHtml, 2000);
  }
}

// Markdown and PDF export functions are now imported from utils.js
// - urlToBase64()
// - convertToMarkdown()
// - exportToPDF()

// Event listeners
exportBtn.addEventListener("click", handleExport);
if (btnCopyJson) btnCopyJson.addEventListener("click", handleCopyJson);
if (btnDownloadJson) btnDownloadJson.addEventListener("click", handleDownloadJson);
if (btnDownloadMd) btnDownloadMd.addEventListener("click", handleDownloadMd);
if (btnExportPdf) btnExportPdf.addEventListener("click", handleExportPdf);

// Initialize popup
console.log("[AI-Exporter] Popup loaded");
