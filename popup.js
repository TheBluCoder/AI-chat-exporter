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
    (result.messages || []).reduce((acc, msg) => acc + (msg.media ? msg.media.length : 0), 0);

  statMessages.textContent = messageCount;
  statMedia.textContent = mediaCount;
  statDuration.textContent = (durationMs / 1000).toFixed(1) + "s";

  // Show Grids
  statsGrid.classList.add("show");
  actionsGrid.classList.add("show");

  console.log("Export successful:", result);
}

/**
 * Format file size for display
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

/**
 * Download text as file
 */
function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename from result
 */
function generateFilename(result) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const prefix = result.success ? "chat-export" : "chat-export-failed";
  return `${prefix}-${timestamp}.json`;
}

/**
 * Handle export button click
 */
async function handleExport() {
  scrapeStartTime = Date.now();
  showLoading();

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error("No active tab found");
    }

    // Check if we can access the tab
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) {
      throw new Error("Cannot access browser internal pages");
    }

    // Send message to content script
    chrome.tabs.sendMessage(
      tab.id,
      { action: "SCRAPE_PAGE" },
      (response) => {
        const duration = Date.now() - scrapeStartTime;

        // Check for runtime errors
        if (chrome.runtime.lastError) {
          showError(`Connection failed: ${chrome.runtime.lastError.message}. \nTry refreshing the page.`);
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
  const filename = generateFilename(lastResult);
  const jsonString = JSON.stringify(lastResult, null, 2);
  downloadFile(jsonString, filename, "application/json");
}

/**
 * Handle Download Markdown
 */
async function handleDownloadMd() {
  if (!lastResult) return;
  const filename = generateFilename(lastResult).replace('.json', '.md');

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

/**
 * Convert URL to Base64 string
 */
async function urlToBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to convert image to Base64:', url, error);
    return null;
  }
}

/**
 * Convert chat to Markdown
 */
async function convertToMarkdown(result) {
  let md = `# Chat Export - ${result.platform || 'Unknown Platform'}\n\n`;
  md += `**URL:** ${result.url}\n`;
  md += `**Date:** ${new Date(result.timestamp).toLocaleString()}\n\n`;
  md += `---\n\n`;

  if (result.messages && result.messages.length > 0) {
    for (const msg of result.messages) {
      const role = msg.role === 'user' ? '👤 **User**' : '🤖 **Model**';
      md += `${role}:\n\n`;
      md += `${msg.content}\n\n`;

      // Handle uploaded files
      if (msg.uploaded_files && msg.uploaded_files.length > 0) {
        md += `*Uploaded Files:*\n`;
        msg.uploaded_files.forEach(file => {
          md += `- [${file.type.toUpperCase()}] ${file.name}\n`;
        });
        md += `\n`;
      }

      // Handle generated media
      if (msg.media && msg.media.length > 0) {
        md += `*Media:*\n`;
        for (const m of msg.media) {
          let mediaUrl = m.url;
          // Convert image to base64 if possible
          if (m.type === 'image' || !m.type) {
            const base64 = await urlToBase64(m.url);
            if (base64) mediaUrl = base64;
          }
          md += `![${m.name || 'Image'}](${mediaUrl})\n`;
        }
        md += `\n`;
      }

      // Handle embedded documents
      if (msg.embedded_documents && msg.embedded_documents.length > 0) {
        md += `*Embedded Documents:*\n\n`;
        msg.embedded_documents.forEach(doc => {
          md += `### ${doc.title}\n`;
          if (doc.content.includes('```')) {
            md += `${doc.content}\n\n`;
          } else {
            md += `\`\`\`${doc.type === 'text/markdown' ? 'markdown' : ''}\n${doc.content}\n\`\`\`\n\n`;
          }
        });
      }

      md += `---\n\n`;
    }
  } else {
    md += `*No messages found.*\n`;
  }

  return md;
}

/**
 * Handle PDF export via printing
 */
async function exportToPDF(result) {
  // Deep clone result to avoid modifying the original object
  const data = JSON.parse(JSON.stringify(result));

  // Process images to embed them as Base64
  if (data.messages && data.messages.length > 0) {
    for (const msg of data.messages) {
      if (msg.media && msg.media.length > 0) {
        for (const m of msg.media) {
          if (m.type === 'image' || !m.type) {
            try {
              const base64 = await urlToBase64(m.url);
              if (base64) {
                m.url = base64; // Replace URL with Base64 data
              }
            } catch (e) {
              console.warn("Failed to embed image:", m.url);
            }
          }
        }
      }
    }
  }

  // Create a minimal HTML page for printing
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Chat Export</title>
      <style>
        body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .meta { color: #666; font-size: 0.9em; margin-bottom: 30px; }
        .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
        .user { background: #f0f7ff; border-left: 4px solid #2196F3; }
        .model { background: #f9f9f9; border-left: 4px solid #4CAF50; }
        .role { font-weight: bold; margin-bottom: 5px; }
        pre { background: #eee; padding: 10px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
        img { max-width: 100%; height: auto; margin-top: 10px; display: block; }
        .media-list { margin-top: 10px; font-size: 0.9em; color: #555; }
        .embedded-doc { margin-top: 10px; border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: white; }
        @media print {
          body { max-width: 100%; padding: 0; }
          .message { break-inside: avoid; }
          pre { white-space: pre-wrap; }
        }
      </style>
    </head>
    <body>
      <h1>Chat Export</h1>
      <div class="meta">
        <strong>Platform:</strong> ${data.platform}<br>
        <strong>URL:</strong> ${data.url}<br>
        <strong>Date:</strong> ${new Date(data.timestamp).toLocaleString()}
      </div>
      <div class="chat">
        ${(data.messages || []).map(msg => `
          <div class="message ${msg.role}">
            <div class="role">${msg.role.toUpperCase()}</div>
            <div class="content">${msg.content.replace(/\n/g, '<br>')}</div>
            
            ${msg.uploaded_files ? `
              <div class="media-list">
                <strong>Uploaded:</strong>
                <ul>${msg.uploaded_files.map(f => `<li>${f.name} (${f.type})</li>`).join('')}</ul>
              </div>
            ` : ''}
            
            ${msg.media ? `
              <div class="media-list">
                <strong>Media:</strong><br>
                ${msg.media.map(m => m.type === 'image' ? `<img src="${m.url}" alt="${m.name || ''}">` : `<a href="${m.url}">${m.name || 'Link'}</a>`).join('<br>')}
              </div>
            ` : ''}

            ${msg.embedded_documents ? `
              <div class="media-list">
                <strong>Embedded Documents:</strong>
                ${msg.embedded_documents.map(doc => `
                  <div class="embedded-doc">
                    <h4 style="margin: 0 0 10px 0;">${doc.title}</h4>
                    <pre>${doc.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      <script>
        window.onload = () => { setTimeout(() => { window.print(); }, 1000); };
      </script>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  chrome.tabs.create({ url: url });
}

// Event listeners
exportBtn.addEventListener("click", handleExport);
if (btnCopyJson) btnCopyJson.addEventListener("click", handleCopyJson);
if (btnDownloadJson) btnDownloadJson.addEventListener("click", handleDownloadJson);
if (btnDownloadMd) btnDownloadMd.addEventListener("click", handleDownloadMd);
if (btnExportPdf) btnExportPdf.addEventListener("click", handleExportPdf);

// Initialize popup
console.log("[AI-Exporter] Popup loaded");
