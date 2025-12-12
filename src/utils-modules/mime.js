/**
 * MIME Type Detection Module
 * Utilities for detecting and handling MIME types
 */

/**
 * Detect MIME type from base64 data signature (magic bytes)
 * @param {string} base64 - Base64 encoded data
 * @returns {string|null} MIME type or null
 */
export function detectMimeTypeFromBase64(base64) {
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
export function detectMimeTypeFromUrl(url) {
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
 * Get media type from file name
 * @param {string} fileName - File name with extension
 * @returns {string} Media type (image, pdf, text, document)
 */
export function getMediaType(fileName) {
  if (!fileName) return 'document';

  const ext = fileName.split('.').pop()?.toLowerCase();

  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico'];
  const pdfExts = ['pdf'];
  const textExts = ['txt', 'md', 'json', 'csv', 'xml', 'html', 'css', 'js', 'ts'];

  if (imageExts.includes(ext)) return 'image';
  if (pdfExts.includes(ext)) return 'pdf';
  if (textExts.includes(ext)) return 'text';

  return 'document';
}

export default {
  detectMimeTypeFromBase64,
  detectMimeTypeFromUrl,
  getMediaType,
};
