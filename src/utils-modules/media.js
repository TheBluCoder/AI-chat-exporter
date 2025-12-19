/**
 * Media Utilities Module
 * Functions for handling images, files, and media conversion
 */

import { detectMimeTypeFromBase64, detectMimeTypeFromUrl } from './mime.js';

/**
 * Convert URL to Base64 data URL with proper MIME type detection
 * @param {string} url - URL to convert
 * @returns {Promise<string|null>} Base64 data URL or null
 */
export async function urlToBase64(url) {
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
            console.log(`[Media] Corrected MIME type from ${blob.type} to ${detectedMime}`);
          }
        }

        resolve(dataUrl);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('[Media] Failed to convert URL to Base64:', url, error);
    return null;
  }
}

/**
 * Extract media (images and file links) from a DOM element
 * Converts images to base64 to avoid CORS issues during export
 * @param {Element} element - The element to extract media from
 * @returns {Promise<Array|null>} Array of media objects or null
 */
export async function extractMedia(element) {
  if (!element) return null;

  const media = [];
  const seenUrls = new Set();

  // Extract images
  const images = Array.from(element.querySelectorAll("img"));

  for (const img of images) {
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

      // Convert to base64 during extraction (avoids CORS issues later)
      const base64 = await urlToBase64(src);

      media.push({
        url: src,  // Keep original URL as fallback
        base64: base64,  // Base64 data URL (or null if conversion failed)
        type: "image",
        name: img.alt || img.title || null,
        source: "generated",
      });
    }
  }

  return media.length > 0 ? media : null;
}

export default {
  urlToBase64,
  extractMedia,
};
