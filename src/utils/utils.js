/**
 * Shared Utility Functions for Popup
 * Only contains functions used by popup.js
 * Note: Scrapers use utils-modules/ ES6 modules instead
 */

// ============================================================================
// MIME TYPE DETECTION (for popup's PDF/Markdown export)
// ============================================================================

/**
 * Detect MIME type from base64 data signature (magic bytes)
 * @param {string} base64 - Base64 encoded data
 * @returns {string|null} MIME type or null
 */
function detectMimeTypeFromBase64(base64) {
  const signatures = {
    'iVBORw0KGgo': 'image/png',
    '/9j/': 'image/jpeg',
    'R0lGODlh': 'image/gif',
    'R0lGODdh': 'image/gif',
    'UklGR': 'image/webp',
    'Qk': 'image/bmp',
    'PHN2Zy': 'image/svg+xml',
    'AAABAA': 'image/x-icon',
    'JVBERi': 'application/pdf',
  };

  for (const [signature, mimeType] of Object.entries(signatures)) {
    if (base64.startsWith(signature)) {
      return mimeType;
    }
  }
  return null;
}

/**
 * Detect MIME type from URL extension
 * @param {string} url - The URL to check
 * @returns {string|null} MIME type or null
 */
function detectMimeTypeFromUrl(url) {
  const extensionMap = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'pdf': 'application/pdf',
  };

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const extension = pathname.split('.').pop();
    return extensionMap[extension] || null;
  } catch {
    return null;
  }
}

/**
 * Convert URL to Base64 data URL with proper MIME type detection
 * @param {string} url - URL to convert
 * @returns {Promise<string|null>} Base64 data URL or null
 */
async function urlToBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        let dataUrl = reader.result;

        // Check if MIME type is generic/incorrect
        if (dataUrl.startsWith('data:application/octet-stream;') ||
            dataUrl.startsWith('data:;')) {

          // Extract base64 data
          const base64Data = dataUrl.split(',')[1];

          // Try to detect MIME type from base64 signature
          let detectedMime = detectMimeTypeFromBase64(base64Data);

          // If not detected from data, try URL extension
          if (!detectedMime) {
            detectedMime = detectMimeTypeFromUrl(url);
          }

          // Reconstruct data URL with correct MIME type
          if (detectedMime) {
            dataUrl = `data:${detectedMime};base64,${base64Data}`;
            console.log(`[Utils] Corrected MIME type from ${blob.type} to ${detectedMime}`);
          }
        }

        resolve(dataUrl);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('[Utils] Failed to convert URL to Base64:', url, error);
    return null;
  }
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
// HTML UTILITIES
// ============================================================================

/**
 * Escape HTML entities to prevent them from being rendered as HTML in Markdown
 * Preserves code blocks (text between triple backticks) without escaping
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtmlForMarkdown(text) {
  if (!text) return '';

  // Split text by code blocks (triple backticks)
  const parts = [];
  let currentIndex = 0;
  const codeBlockRegex = /```[\s\S]*?```/g;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Escape text before the code block
    if (match.index > currentIndex) {
      const beforeBlock = text.substring(currentIndex, match.index);
      parts.push(beforeBlock
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;'));
    }

    // Keep code block as-is (no escaping)
    parts.push(match[0]);
    currentIndex = match.index + match[0].length;
  }

  // Escape remaining text after last code block
  if (currentIndex < text.length) {
    const remaining = text.substring(currentIndex);
    parts.push(remaining
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;'));
  }

  return parts.join('');
}

/**
 * Escape HTML entities for safe insertion into HTML
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  let md = `# Chat Export - ${escapeHtmlForMarkdown(result.platform || 'Unknown Platform')}\n\n`;
  md += `**URL:** ${escapeHtmlForMarkdown(result.url)}\n`;
  md += `**Date:** ${new Date(result.timestamp).toLocaleString()}\n\n`;
  md += `---\n\n`;

  if (result.messages && result.messages.length > 0) {
    for (const msg of result.messages) {
      const role = msg.role === 'user' ? '👤 **User**' : (msg.role === 'assistant' ? '🤖 **Assistant**' : '🤖 **Model**');
      md += `${role}:\n\n`;

      // Handle both field name formats (content vs text)
      const messageText = msg.content || msg.text || '';
      // Escape HTML entities to prevent them from being rendered as HTML
      md += `${escapeHtmlForMarkdown(messageText)}\n\n`;

      // Handle uploaded files (both formats: uploaded_files vs uploadedFiles)
      const uploadedFiles = msg.uploaded_files || msg.uploadedFiles;
      if (uploadedFiles && uploadedFiles.length > 0) {
        md += `*Uploaded Files:*\n`;
        uploadedFiles.forEach(file => {
          md += `- [${file.type.toUpperCase()}] ${escapeHtmlForMarkdown(file.name)}\n`;
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

          md += `![${escapeHtmlForMarkdown(m.name || m.alt || 'Image')}](${mediaUrl})\n`;
        }
        md += `\n`;
      }

      // Handle embedded documents
      if (msg.embedded_documents && msg.embedded_documents.length > 0) {
        md += `*Embedded Documents:*\n\n`;
        msg.embedded_documents.forEach(doc => {
          md += `### ${escapeHtmlForMarkdown(doc.title)}\n`;
          if (doc.content.includes('```')) {
            // Content already has code blocks, escape HTML entities
            md += `${escapeHtmlForMarkdown(doc.content)}\n\n`;
          } else {
            // Wrap in code block (content inside code blocks is auto-escaped)
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
        <strong>Platform:</strong> ${escapeHtml(data.platform)}<br>
        <strong>URL:</strong> ${escapeHtml(data.url)}<br>
        <strong>Date:</strong> ${escapeHtml(new Date(data.timestamp).toLocaleString())}
      </div>
      <div class="chat">
        ${(data.messages || []).map(msg => {
          // Escape HTML entities first, then replace newlines with <br>
          const messageText = escapeHtml(msg.content || msg.text || '').replace(/\n/g, '<br>');
          const uploadedFiles = msg.uploaded_files || msg.uploadedFiles;
          const media = msg.media || msg.images;

          return `
          <div class="message ${msg.role}">
            <div class="role">${escapeHtml(msg.role.toUpperCase())}</div>
            <div class="content">${messageText}</div>

            ${uploadedFiles && uploadedFiles.length > 0 ? `
              <div class="media-list">
                <strong>Uploaded:</strong>
                <ul>${uploadedFiles.map(f => `<li>${escapeHtml(f.name)} (${escapeHtml(f.type)})</li>`).join('')}</ul>
              </div>
            ` : ''}

            ${media && media.length > 0 ? `
              <div class="media-list">
                <strong>Media:</strong><br>
                ${media.map(m => {
                  const imgSrc = m.url || m.src || m.base64;
                  const imgName = m.name || m.alt || '';
                  return m.type === 'image' || !m.type ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(imgName)}">` : `<a href="${escapeHtml(imgSrc)}">${escapeHtml(imgName || 'Link')}</a>`;
                }).join('<br>')}
              </div>
            ` : ''}

            ${msg.embedded_documents ? `
              <div class="media-list">
                <strong>Embedded Documents:</strong>
                ${msg.embedded_documents.map(doc => `
                  <div class="embedded-doc">
                    <h4 style="margin: 0 0 10px 0;">${escapeHtml(doc.title)}</h4>
                    <pre>${escapeHtml(doc.content)}</pre>
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
// EXPORT ALL UTILITIES TO WINDOW (for popup.html)
// ============================================================================

if (typeof window !== 'undefined') {
  window.copyToClipboard = copyToClipboard;
  window.downloadFile = downloadFile;
  window.generateFilename = generateFilename;
  window.convertToMarkdown = convertToMarkdown;
  window.exportToPDF = exportToPDF;
}
