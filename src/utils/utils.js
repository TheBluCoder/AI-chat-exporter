/**
 * Shared Utility Functions
 * Common utilities used across all scrapers and popup
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const UTILS_CONFIG = {
  ELEMENT_WAIT_TIMEOUT: 15000,
  CONTENT_STABLE_MS: 800,
  CONTENT_TIMEOUT: 10000,
  RENDER_DELAY: 500,
  SCROLL_DELAY: 1500,
  MAX_SCROLL_ATTEMPTS: 10,
};

// ============================================================================
// DOM UTILITIES
// ============================================================================

/**
 * Wait for an element to appear in the DOM
 * @param {string} selector - CSS selector to wait for
 * @param {number} timeout - Maximum wait time in milliseconds
 * @returns {Promise<Element>} The found element
 */
function waitForElement(selector, timeout = UTILS_CONFIG.ELEMENT_WAIT_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const existingElement = document.querySelector(selector);
    if (existingElement) {
      return resolve(existingElement);
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for selector: ${selector}`));
    }, timeout);
  });
}

/**
 * Wait until element's text content stabilizes (stops changing)
 * @param {Element} element - The element to monitor
 * @param {number} stableMs - Time content must remain stable
 * @param {number} timeout - Maximum wait time
 * @returns {Promise<boolean>} True if content stabilized, false if timeout
 */
async function waitForStableContent(element, stableMs = UTILS_CONFIG.CONTENT_STABLE_MS, timeout = UTILS_CONFIG.CONTENT_TIMEOUT) {
  const startTime = Date.now();
  let previousText = element.innerText;

  while (Date.now() - startTime < timeout) {
    await new Promise((resolve) => setTimeout(resolve, stableMs));
    const currentText = element.innerText;

    if (currentText === previousText) {
      return true;
    }

    previousText = currentText;
  }

  return false;
}

/**
 * Get list of potentially relevant selectors for debugging
 * @param {Array<string>} selectors - Optional array of selectors to check
 * @returns {Array} List of available selectors
 */
function getAvailableSelectors(selectors = null) {
  const defaultSelectors = [
    'section',
    '[class*="chat"]',
    '[class*="conversation"]',
    '[class*="message"]',
  ];

  const selectorsToCheck = selectors || defaultSelectors;

  return selectorsToCheck.filter(selector => {
    try {
      return document.querySelector(selector) !== null;
    } catch (e) {
      return false;
    }
  });
}

// ============================================================================
// MEDIA UTILITIES
// ============================================================================

/**
 * Detect media type from URL or file extension
 * @param {string} url - URL or filename to analyze
 * @returns {string|null} Media type or null
 */
function getMediaType(url) {
  if (!url) return null;

  const cleanUrl = url.split("?")[0].toLowerCase();

  const patterns = {
    image: /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i,
    pdf: /\.(pdf)$/i,
    document: /\.(doc|docx|xls|xlsx|ppt|pptx)$/i,
    code: /\.(py|js|java|cpp|c|ts|jsx|tsx|go|rs|rb|php|swift|kt|cs|h|hpp)$/i,
    text: /\.(md|markdown|txt|log|csv|json|xml|yaml|yml|html|css)$/i,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleanUrl)) {
      return type === 'code' || type === 'text' ? 'document' : type;
    }
  }

  return null;
}

/**
 * Convert URL to Base64 data URL
 * @param {string} url - URL to convert
 * @returns {Promise<string|null>} Base64 data URL or null
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
    console.warn('[Utils] Failed to convert URL to Base64:', url, error);
    return null;
  }
}

/**
 * Extract media (images and file links) from a DOM element
 * @param {Element} element - The element to extract media from
 * @returns {Array|null} Array of media objects or null
 */
function extractMedia(element) {
  if (!element) return null;

  const media = [];
  const seenUrls = new Set();

  // Extract images
  element.querySelectorAll("img").forEach((img) => {
    let src = img.src ||
      img.getAttribute("data-src") ||
      img.dataset.src;

    // Handle srcset attribute
    if (!src && img.srcset) {
      const srcsetParts = img.srcset.split(",")[0].trim().split(" ");
      src = srcsetParts[0];
    }

    // Filter out data URIs and duplicates
    if (src && !src.startsWith("data:") && !seenUrls.has(src)) {
      seenUrls.add(src);
      media.push({
        url: src,
        type: "image",
        name: img.alt || img.title || null,
        source: "generated",
      });
    }
  });

  // Extract file links
  element.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.href;

    // Skip invalid or unwanted links
    if (!href ||
      href.startsWith("#") ||
      href.startsWith("javascript:") ||
      seenUrls.has(href)) {
      return;
    }

    const mediaType = getMediaType(href);
    if (mediaType) {
      seenUrls.add(href);
      const linkText = (anchor.innerText || anchor.textContent || "").trim();
      const fileName = href.split("/").pop().split("?")[0];

      media.push({
        url: href,
        type: mediaType,
        name: linkText || fileName,
        source: "linked",
      });
    }
  });

  return media.length > 0 ? media : null;
}

// ============================================================================
// FILE UTILITIES
// ============================================================================

/**
 * Generate filename from result with timestamp
 * @param {Object} result - Scraping result object
 * @param {string} extension - File extension (without dot)
 * @returns {string} Generated filename
 */
function generateFilename(result, extension = 'json') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const prefix = result.success ? "chat-export" : "chat-export-failed";
  return `${prefix}-${timestamp}.${extension}`;
}

/**
 * Format file size for display
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/**
 * Download content as file
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} contentType - MIME type
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

// ============================================================================
// CLIPBOARD UTILITIES
// ============================================================================

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
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

// ============================================================================
// MARKDOWN CONVERSION
// ============================================================================

/**
 * Convert scraped chat data to Markdown format with base64 embedded media
 * @param {Object} result - Scraping result object
 * @returns {Promise<string>} Markdown formatted string
 */
async function convertToMarkdown(result) {
  let md = `# Chat Export - ${result.platform || 'Unknown Platform'}\n\n`;
  md += `**URL:** ${result.url}\n`;
  md += `**Date:** ${new Date(result.timestamp).toLocaleString()}\n\n`;
  md += `---\n\n`;

  if (result.messages && result.messages.length > 0) {
    for (const msg of result.messages) {
      const role = msg.role === 'user' ? '👤 **User**' : (msg.role === 'assistant' ? '🤖 **Assistant**' : '🤖 **Model**');
      md += `${role}:\n\n`;

      // Handle both field name formats (content vs text)
      const messageText = msg.content || msg.text || '';
      md += `${messageText}\n\n`;

      // Handle uploaded files (both formats: uploaded_files vs uploadedFiles)
      const uploadedFiles = msg.uploaded_files || msg.uploadedFiles;
      if (uploadedFiles && uploadedFiles.length > 0) {
        md += `*Uploaded Files:*\n`;
        uploadedFiles.forEach(file => {
          md += `- [${file.type.toUpperCase()}] ${file.name}\n`;
        });
        md += `\n`;
      }

      // Handle generated media with base64 embedding (both formats: media vs images)
      const media = msg.media || msg.images;
      if (media && media.length > 0) {
        md += `*Media:*\n`;
        for (const m of media) {
          // Handle different image object formats
          let mediaUrl = m.url || m.src;
          const base64Data = m.base64;

          // Use base64 if available, otherwise try to convert
          if (base64Data) {
            mediaUrl = base64Data;
          } else if (mediaUrl && (m.type === 'image' || !m.type)) {
            const base64 = await urlToBase64(mediaUrl);
            if (base64) mediaUrl = base64;
          }

          md += `![${m.name || m.alt || 'Image'}](${mediaUrl})\n`;
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

// ============================================================================
// PDF EXPORT
// ============================================================================

/**
 * Export chat data to PDF via print dialog
 * @param {Object} result - Scraping result object
 * @returns {Promise<void>}
 */
async function exportToPDF(result) {
  // Deep clone result to avoid modifying the original object
  const data = JSON.parse(JSON.stringify(result));

  // Process images to embed them as Base64 (handle both formats)
  if (data.messages && data.messages.length > 0) {
    for (const msg of data.messages) {
      const media = msg.media || msg.images;
      if (media && media.length > 0) {
        for (const m of media) {
          // Skip if already has base64
          if (m.base64) continue;

          const url = m.url || m.src;
          if (url && (m.type === 'image' || !m.type)) {
            try {
              const base64 = await urlToBase64(url);
              if (base64) {
                m.url = base64;
                m.src = base64;
              }
            } catch (e) {
              console.warn("[Utils] Failed to embed image:", url);
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
        .assistant { background: #f9f9f9; border-left: 4px solid #4CAF50; }
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
        ${(data.messages || []).map(msg => {
          const messageText = (msg.content || msg.text || '').replace(/\n/g, '<br>');
          const uploadedFiles = msg.uploaded_files || msg.uploadedFiles;
          const media = msg.media || msg.images;

          return `
          <div class="message ${msg.role}">
            <div class="role">${msg.role.toUpperCase()}</div>
            <div class="content">${messageText}</div>

            ${uploadedFiles && uploadedFiles.length > 0 ? `
              <div class="media-list">
                <strong>Uploaded:</strong>
                <ul>${uploadedFiles.map(f => `<li>${f.name} (${f.type})</li>`).join('')}</ul>
              </div>
            ` : ''}

            ${media && media.length > 0 ? `
              <div class="media-list">
                <strong>Media:</strong><br>
                ${media.map(m => {
                  const imgSrc = m.url || m.src || m.base64;
                  const imgName = m.name || m.alt || '';
                  return m.type === 'image' || !m.type ? `<img src="${imgSrc}" alt="${imgName}">` : `<a href="${imgSrc}">${imgName || 'Link'}</a>`;
                }).join('<br>')}
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
        `;
        }).join('')}
      </div>
      <script>
        window.onload = () => { setTimeout(() => { window.print(); }, 1000); };
      </script>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  browserAPI.tabs.create({ url: url });
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

// Make all utilities available globally
if (typeof window !== 'undefined') {
  window.UTILS_CONFIG = UTILS_CONFIG;
  window.waitForElement = waitForElement;
  window.waitForStableContent = waitForStableContent;
  window.getAvailableSelectors = getAvailableSelectors;
  window.getMediaType = getMediaType;
  window.urlToBase64 = urlToBase64;
  window.extractMedia = extractMedia;
  window.generateFilename = generateFilename;
  window.formatBytes = formatBytes;
  window.downloadFile = downloadFile;
  window.copyToClipboard = copyToClipboard;
  window.convertToMarkdown = convertToMarkdown;
  window.exportToPDF = exportToPDF;
}
