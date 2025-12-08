/**
 * Popup Script - User Interface Handler
 * Manages the extension popup UI and interaction
 */

// DOM elements
const exportBtn = document.getElementById("exportBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const output = document.getElementById("output");
const loading = document.getElementById("loading");
const stats = document.getElementById("stats");
const error = document.getElementById("error");
const actions = document.getElementById("actions");

let lastResult = null;

/**
 * Show loading state
 */
function showLoading() {
  loading.classList.add("active");
  exportBtn.disabled = true;
  hideStats();
  hideError();
  hideOutput();
  hideActions();
}

/**
 * Hide loading state
 */
function hideLoading() {
  loading.classList.remove("active");
  exportBtn.disabled = false;
}

/**
 * Show statistics
 */
function showStats(message) {
  stats.textContent = message;
  stats.classList.add("show");
}

/**
 * Hide statistics
 */
function hideStats() {
  stats.classList.remove("show");
}

/**
 * Show error message
 */
function showError(message) {
  error.textContent = `❌ ${message}`;
  error.classList.add("show");
}

/**
 * Hide error message
 */
function hideError() {
  error.classList.remove("show");
}

/**
 * Show output
 */
function showOutput(text) {
  output.textContent = text;
  output.classList.add("show");
}

/**
 * Hide output
 */
function hideOutput() {
  output.classList.remove("show");
}

/**
 * Show action buttons
 */
function showActions() {
  actions.classList.add("show");
}

/**
 * Hide action buttons
 */
function hideActions() {
  actions.classList.remove("show");
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
 * Download JSON file
 */
function downloadJSON(data, filename) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
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
        hideLoading();

        // Check for errors
        if (chrome.runtime.lastError) {
          showError(`Communication error: ${chrome.runtime.lastError.message}`);
          console.error("Runtime error:", chrome.runtime.lastError);
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
          const messageCount = response.count || 0;
          const mediaCount = response.messages?.reduce(
            (total, msg) => total + (msg.media?.length || 0),
            0
          ) || 0;

          showStats(
            `✅ Successfully extracted ${messageCount} message${messageCount !== 1 ? 's' : ''}` +
            (mediaCount > 0 ? ` with ${mediaCount} media item${mediaCount !== 1 ? 's' : ''}` : '')
          );

          const jsonString = JSON.stringify(response, null, 2);
          const size = new Blob([jsonString]).size;
          showOutput(jsonString);
          showActions();

          console.log("Export successful:", response);
        } else {
          showError(response.error || "Scraping failed");
          showOutput(JSON.stringify(response, null, 2));
          console.error("Export failed:", response);
        }
      }
    );
  } catch (err) {
    hideLoading();
    showError(err.message);
    console.error("Export error:", err);
  }
}

/**
 * Handle copy button click
 */
async function handleCopy() {
  if (!lastResult) return;

  const jsonString = JSON.stringify(lastResult, null, 2);
  const success = await copyToClipboard(jsonString);

  if (success) {
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "✓ Copied!";
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  } else {
    showError("Failed to copy to clipboard");
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
          // Detect if content is likely code to wrap in code blocks if not already
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
function exportToPDF(result) {


  // Create a minimal HTML page for printing
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Chat Export</title>
      <style>
        body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .meta { color: #666; font-size: 0.9em; margin-bottom: 30px; }
        .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
        .user { background: #f0f7ff; border-left: 4px solid #2196F3; }
        .model { background: #f9f9f9; border-left: 4px solid #4CAF50; }
        .role { font-weight: bold; margin-bottom: 5px; }
        pre { background: #eee; padding: 10px; overflow-x: auto; }
        img { max-width: 100%; height: auto; margin-top: 10px; }
        .media-list { margin-top: 10px; font-size: 0.9em; color: #555; }
        @media print {
          body { max-width: 100%; padding: 0; }
          .message { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>Chat Export</h1>
      <div class="meta">
        <strong>Platform:</strong> ${result.platform}<br>
        <strong>URL:</strong> ${result.url}<br>
        <strong>Date:</strong> ${new Date(result.timestamp).toLocaleString()}
      </div>
      <div class="chat">
        ${(result.messages || []).map(msg => `
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
                  <div class="embedded-doc" style="margin-top: 10px; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
                    <h4 style="margin: 0 0 10px 0;">${doc.title}</h4>
                    <pre style="max-height: 300px; overflow-y: auto;">${doc.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      <script>
        window.onload = () => { setTimeout(() => { window.print(); }, 500); };
      </script>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  chrome.tabs.create({ url: url });
}

/**
 * Handle download button click
 */
async function handleDownload() {
  if (!lastResult) return;

  const format = document.getElementById("exportFormat").value;
  const filename = generateFilename(lastResult); // Base filename

  if (format === 'json') {
    downloadJSON(lastResult, filename);
  } else if (format === 'md') {
    const md = await convertToMarkdown(lastResult);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace('.json', '.md');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else if (format === 'pdf') {
    exportToPDF(lastResult);
  }

  const originalText = downloadBtn.textContent;
  downloadBtn.textContent = "✓ Processing";
  setTimeout(() => {
    downloadBtn.textContent = originalText;
  }, 2000);
}

// Event listeners
exportBtn.addEventListener("click", handleExport);
copyBtn.addEventListener("click", handleCopy);
downloadBtn.addEventListener("click", handleDownload);

// Initialize popup
console.log("[AI-Exporter] Popup loaded");
