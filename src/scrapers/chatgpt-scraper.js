/**
 * ChatGPT Scraper
 * Specialized scraper for ChatGPT conversations
 */

/**
 * Main scraping function for ChatGPT
 * @returns {Promise<Object>} Scraping result with messages
 */
async function scrapeChatGPT() {
  try {
    console.log("[ChatGPT-Scraper] Starting scrape");

    // Wait for conversation container
    const container = await waitForElement('[data-testid^="conversation-turn"]', 10000);
    if (!container) {
      throw new Error("Could not find conversation container");
    }

    console.log("[ChatGPT-Scraper] Container found, extracting messages");

    // Extract all conversation turns
    const turns = document.querySelectorAll('[data-testid^="conversation-turn"]');
    const messages = [];

    for (const turn of turns) {
      const message = await extractMessage(turn);
      if (message) {
        messages.push(message);
      }
    }

    console.log(`[ChatGPT-Scraper] Extracted ${messages.length} messages`);

    return {
      success: true,
      messages,
      count: messages.length,
      timestamp: new Date().toISOString(),
      url: location.href,
      platform: "ChatGPT",
    };
  } catch (error) {
    console.error("[ChatGPT-Scraper] Error:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      url: location.href,
    };
  }
}

/**
 * Extract a single message from a conversation turn
 * @param {Element} turnElement - The conversation turn element
 * @returns {Promise<Object|null>} Message object or null
 */
async function extractMessage(turnElement) {
  try {
    // Find the message container with role
    const messageContainer = turnElement.querySelector('[data-message-author-role]');
    if (!messageContainer) {
      return null;
    }

    const role = messageContainer.getAttribute('data-message-author-role');

    // Extract text content
    const content = extractMessageText(messageContainer);

    // Extract any uploaded files
    const uploaded_files = await extractUploadedFiles(turnElement);

    // Extract any images in the message - convert to standard media format
    const images = await extractImages(messageContainer);
    const media = images.length > 0 ? images.map(img => ({
      type: 'image',
      url: img.base64 || img.src,
      name: img.alt || '',
      base64: img.base64,
      width: img.width,
      height: img.height
    })) : null;

    return {
      role,
      content,
      uploaded_files: uploaded_files.length > 0 ? uploaded_files : null,
      media,
      embedded_documents: null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[ChatGPT-Scraper] Error extracting message:", error);
    return null;
  }
}

/**
 * Extract text content from a message element
 * @param {Element} messageElement - The message element
 * @returns {string} Extracted text
 */
function extractMessageText(messageElement) {
  // Clone the element to avoid modifying the DOM
  const clone = messageElement.cloneNode(true);

  // Remove iframe elements (file previews)
  clone.querySelectorAll('iframe').forEach(el => el.remove());

  // Remove button elements
  clone.querySelectorAll('button').forEach(el => el.remove());

  // Get text content and clean it up
  let text = clone.textContent || '';
  text = text.trim();

  // Remove excessive whitespace
  text = text.replace(/\s+/g, ' ');

  return text;
}

/**
 * Extract uploaded files from a conversation turn
 * @param {Element} turnElement - The conversation turn element
 * @returns {Promise<Array>} Array of file objects
 */
async function extractUploadedFiles(turnElement) {
  const files = [];

  try {
    // Find all file iframes in this turn
    const fileIframes = turnElement.querySelectorAll('iframe[src*="backend-api/estuary/content"]');

    for (const iframe of fileIframes) {
      const fileUrl = iframe.src;
      const fileName = extractFileNameFromUrl(fileUrl) || 'unknown_file';

      console.log(`[ChatGPT-Scraper] Found file: ${fileName} at ${fileUrl}`);

      // Determine file type
      const fileType = getMediaType(fileName);

      // Fetch and extract file content
      const fileContent = await fetchFileContent(fileUrl, fileName, fileType);

      if (fileContent) {
        files.push({
          name: fileName,
          type: fileType,
          url: fileUrl,
          ...fileContent,
        });
      }
    }
  } catch (error) {
    console.error("[ChatGPT-Scraper] Error extracting uploaded files:", error);
  }

  return files;
}

/**
 * Extract file name from URL
 * @param {string} url - The file URL
 * @returns {string|null} Extracted file name
 */
function extractFileNameFromUrl(url) {
  try {
    // Try to extract from URL parameters or path
    const urlObj = new URL(url);
    const id = urlObj.searchParams.get('id');

    // If there's a file ID, use it as a fallback
    if (id) {
      return `file_${id}`;
    }

    return null;
  } catch (error) {
    console.error("[ChatGPT-Scraper] Error extracting file name:", error);
    return null;
  }
}

/**
 * Fetch and extract file content
 * @param {string} fileUrl - The file URL
 * @param {string} fileName - The file name
 * @param {string} fileType - The file type (image, pdf, text, etc.)
 * @returns {Promise<Object|null>} File content object
 */
async function fetchFileContent(fileUrl, fileName, fileType) {
  try {
    console.log(`[ChatGPT-Scraper] Fetching file: ${fileName} (${fileType})`);

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    // Handle different file types
    if (fileType === 'text' || fileName.match(/\.(md|txt|json|csv|xml|html|css|js)$/i)) {
      // Text files - extract as plain text
      const textContent = await response.text();
      return {
        content: textContent,
        encoding: 'text',
      };
    } else if (fileType === 'pdf' || fileName.endsWith('.pdf')) {
      // PDF files - convert to base64
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      return {
        content: base64,
        encoding: 'base64',
        mimeType: 'application/pdf',
      };
    } else if (fileType === 'image') {
      // Image files - convert to base64
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      const mimeType = blob.type || `image/${fileName.split('.').pop()}`;
      return {
        content: base64,
        encoding: 'base64',
        mimeType,
      };
    } else {
      // Other binary files - convert to base64
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      return {
        content: base64,
        encoding: 'base64',
        mimeType: blob.type || 'application/octet-stream',
      };
    }
  } catch (error) {
    console.error(`[ChatGPT-Scraper] Error fetching file ${fileName}:`, error);
    return null;
  }
}

/**
 * Convert Blob to base64
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} Base64 encoded string
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Remove the data URL prefix to get just the base64
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Extract images from a message element
 * @param {Element} messageElement - The message element
 * @returns {Promise<Array>} Array of image objects
 */
async function extractImages(messageElement) {
  const images = [];

  try {
    const imgElements = messageElement.querySelectorAll('img[src]');

    for (const img of imgElements) {
      const src = img.src;

      // Skip small icons and UI elements
      if (img.width < 50 || img.height < 50) {
        continue;
      }

      try {
        // Convert image to base64
        const base64 = await urlToBase64(src);

        if (base64) {
          images.push({
            src,
            base64,
            alt: img.alt || '',
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
          });
        }
      } catch (error) {
        console.error(`[ChatGPT-Scraper] Error converting image to base64:`, error);
        // Store URL even if base64 conversion fails
        images.push({
          src,
          alt: img.alt || '',
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
      }
    }
  } catch (error) {
    console.error("[ChatGPT-Scraper] Error extracting images:", error);
  }

  return images;
}

// Export globally
if (typeof window !== 'undefined') {
  window.scrapeChatGPT = scrapeChatGPT;
}
