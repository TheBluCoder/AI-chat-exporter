/**
 * Google Gemini Chat Scraper
 * Specialized scraper for Gemini's chat interface
 * Extracts conversations, images, and uploaded documents
 */

// Configuration constants
const GEMINI_CONFIG = {
  ELEMENT_WAIT_TIMEOUT: 15000,
  CONTENT_STABLE_MS: 800,
  CONTENT_TIMEOUT: 10000,
  CONTENT_TIMEOUT: 10000,
  RENDER_DELAY: 500,
  SCROLL_DELAY: 1500,
  MAX_SCROLL_ATTEMPTS: 20,
  SELECTORS: {
    // Main container
    CHAT_CONTAINER: 'chat-app',
    CONVERSATION_CONTAINER: 'conversation-container',

    // Message elements
    MESSAGE_TURN: 'message-set',
    USER_QUERY: 'user-query',
    USER_QUERY_CONTENT: 'user-query-content',
    MODEL_RESPONSE: 'model-response',
    MESSAGE_CONTENT: 'message-content',

    // File/media elements
    UPLOADED_FILE: '[data-test-id="uploaded-file"]',
    UPLOADED_IMG: '[data-test-id="uploaded-img"]',
    FILE_PREVIEW: 'user-query-file-preview',

    // Alternative selectors for fallback
    USER_BUBBLE: '.user-query-bubble-with-background',
    MODEL_TEXT: '.model-response-text',

    // Immersive elements
    IMMERSIVE_CHIP: 'immersive-entry-chip',
    IMMERSIVE_PANEL: 'immersive-panel',
    IMMERSIVE_EDITOR: 'immersive-editor',

    // User Uploaded Documents
    USER_FILE_CAROUSEL: 'user-query-file-carousel',
    USER_FILE_BUTTON: '.new-file-preview-file',
    DRIVE_VIEWER_TEXT: 'pre.drive-viewer-text-page',
  }
};

/**
 * Wait for an element to appear in the DOM
 * @param {string} selector - CSS selector to wait for
 * @param {number} timeout - Maximum wait time in milliseconds
 * @returns {Promise<Element>} The found element
 */
function waitForElement(selector, timeout = GEMINI_CONFIG.ELEMENT_WAIT_TIMEOUT) {
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
 * Automatically scrolls to top to load full history
 * @param {Element} startElement - Element to start searching for scroll container
 */
async function autoScrollToTop(startElement) {
  console.log("[Gemini-Scraper] Starting auto-scroll sequence...");

  // Find the actual scrollable container
  let scrollContainer = startElement;

  // 1. Try to find user-query elements and get their parent
  // This is usually the direct container of messages
  const messageElement = startElement.querySelector(GEMINI_CONFIG.SELECTORS.USER_QUERY);
  if (messageElement && messageElement.parentElement) {
    scrollContainer = messageElement.parentElement;
  }

  // 2. If that doesn't look scrollable (too short), try finding closest scrollable parent
  if (scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
    let current = scrollContainer;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll' || current.scrollHeight > current.clientHeight) {
        scrollContainer = current;
        break;
      }
      current = current.parentElement;
    }
  }

  // 3. Fallback to main element if no specific container found
  if (!scrollContainer || scrollContainer === document.body) {
    scrollContainer = document.querySelector('main') || document.documentElement;
  }

  console.log(`[Gemini-Scraper] Identified scroll container: ${scrollContainer.tagName}.${scrollContainer.className.split(' ')[0]}`);

  let previousHeight = scrollContainer.scrollHeight;
  let noChangeCount = 0;

  // Scroll loop
  for (let i = 0; i < GEMINI_CONFIG.MAX_SCROLL_ATTEMPTS; i++) {
    // Scroll to absolute top
    scrollContainer.scrollTop = 0;

    // Wait for content load
    await new Promise(resolve => setTimeout(resolve, GEMINI_CONFIG.SCROLL_DELAY));

    const currentHeight = scrollContainer.scrollHeight;

    if (currentHeight > previousHeight) {
      console.log(`[Gemini-Scraper] Loaded older messages. Height: ${currentHeight}px (was ${previousHeight}px)`);
      previousHeight = currentHeight;
      noChangeCount = 0;
    } else {
      // Double check with a small scroll wiggle
      scrollContainer.scrollTop = 10;
      await new Promise(resolve => setTimeout(resolve, 300));
      scrollContainer.scrollTop = 0;

      if (scrollContainer.scrollHeight <= previousHeight) {
        noChangeCount++;
        if (noChangeCount >= 2) {
          console.log("[Gemini-Scraper] Reached top of history (no height change)");
          break;
        }
      }
    }
  }

  // Scroll back to bottom after loading everything (optional, but nice for user)
  // scrollContainer.scrollTop = scrollContainer.scrollHeight;
}

/**
 * Wait until element's text content stabilizes
 * @param {Element} element - The element to monitor
 * @param {number} stableMs - Time content must remain stable
 * @param {number} timeout - Maximum wait time
 * @returns {Promise<boolean>} True if content stabilized
 */
async function waitForStableContent(element, stableMs = GEMINI_CONFIG.CONTENT_STABLE_MS, timeout = GEMINI_CONFIG.CONTENT_TIMEOUT) {
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
 * Extract uploaded files from user query
 * @param {Element} userQueryElement - The user-query element
 * @returns {Array|null} Array of file objects or null
 */
function extractUploadedFiles(userQueryElement) {
  if (!userQueryElement) return null;

  const files = [];
  const seenFiles = new Set();

  // Find all uploaded file previews
  const fileElements = userQueryElement.querySelectorAll(GEMINI_CONFIG.SELECTORS.UPLOADED_FILE);

  fileElements.forEach((fileEl) => {
    // Try to get file name from aria-label
    const button = fileEl.querySelector('button[aria-label]');
    if (button) {
      const fileName = button.getAttribute('aria-label');
      if (fileName && !seenFiles.has(fileName)) {
        seenFiles.add(fileName);

        const fileType = getMediaType(fileName);
        files.push({
          name: fileName,
          type: fileType || 'document',
          source: 'user_upload',
          // Note: Gemini doesn't expose direct URLs for uploaded files in the DOM
          // These files are stored in Google's servers
          url: null,
        });
      }
    }
  });

  // Extract uploaded images with URLs
  const imgElements = userQueryElement.querySelectorAll(GEMINI_CONFIG.SELECTORS.UPLOADED_IMG);

  imgElements.forEach((img) => {
    let src = img.src || img.getAttribute('data-src') || img.dataset.src;

    if (src && !src.startsWith("data:") && !seenFiles.has(src)) {
      seenFiles.add(src);
      files.push({
        name: img.alt || 'uploaded_image.jpg',
        type: 'image',
        source: 'user_upload',
        url: src,
      });
    }
  });

  return files.length > 0 ? files : null;
}

/**
 * Extract media (images and links) from message content
 * @param {Element} element - The element to extract media from
 * @returns {Array|null} Array of media objects or null
 */
function extractMedia(element) {
  if (!element) return null;

  const media = [];
  const seenUrls = new Set();

  // Extract images from model response
  element.querySelectorAll("img").forEach((img) => {
    let src = img.src ||
      img.getAttribute("data-src") ||
      img.dataset.src;

    if (!src && img.srcset) {
      const srcsetParts = img.srcset.split(",")[0].trim().split(" ");
      src = srcsetParts[0];
    }

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

  // Extract file links and document references
  element.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.href;

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

/**
 * Extract text content from user query, handling special formatting
 * @param {Element} userQueryElement - The user-query element
 * @returns {string} Extracted text content
 */
function extractUserQueryText(userQueryElement) {
  if (!userQueryElement) return '';

  // Find the user query content container
  const contentContainer = userQueryElement.querySelector(GEMINI_CONFIG.SELECTORS.USER_QUERY_CONTENT) ||
    userQueryElement.querySelector(GEMINI_CONFIG.SELECTORS.USER_BUBBLE);

  if (!contentContainer) {
    return userQueryElement.innerText.trim();
  }

  // Get text content, excluding file previews
  let textContent = '';

  // Clone the element to avoid modifying the DOM
  const clone = contentContainer.cloneNode(true);

  // Remove file preview elements
  clone.querySelectorAll(GEMINI_CONFIG.SELECTORS.FILE_PREVIEW).forEach(el => el.remove());
  clone.querySelectorAll('[data-test-id="uploaded-file"]').forEach(el => el.remove());
  clone.querySelectorAll('[data-test-id="uploaded-img"]').forEach(el => el.remove());

  // Remove copy/edit buttons
  clone.querySelectorAll('button').forEach(el => el.remove());

  textContent = clone.innerText.trim();

  return textContent;
}

/**
 * Extract text content from model response
 * @param {Element} modelResponseElement - The model-response element
 * @returns {string} Extracted text content
 */
function extractModelResponseText(modelResponseElement) {
  if (!modelResponseElement) return '';

  const messageContent = modelResponseElement.querySelector(GEMINI_CONFIG.SELECTORS.MESSAGE_CONTENT);

  if (!messageContent) {
    return modelResponseElement.innerText.trim();
  }

  // Clone to avoid DOM modification
  const clone = messageContent.cloneNode(true);

  clone.querySelectorAll('.action-button').forEach(el => el.remove());

  return clone.innerText.trim();
}

/**
 * Extract content from immersive embedded documents (chips)
 * @param {Element} modelResponseElement - The model-response element
 * @returns {Promise<Array|null>} Array of embedded documents or null
 */
async function extractImmersiveDocuments(modelResponseElement) {
  if (!modelResponseElement) return null;

  const chips = modelResponseElement.querySelectorAll(GEMINI_CONFIG.SELECTORS.IMMERSIVE_CHIP);
  if (chips.length === 0) return null;

  console.log(`[Gemini-Scraper] Found ${chips.length} immersive chips`);
  const documents = [];

  // We need to process sequentially to handle the UI state (panel opening/closing)
  for (const chip of chips) {
    try {
      const title = chip.innerText.trim() || "Embedded Document";
      console.log(`[Gemini-Scraper] Processing chip: "${title}"`);

      // Debug: Log structure to see what we're dealing with
      // console.log(`[Gemini-Scraper] Chip HTML:`, chip.outerHTML);

      // --- CLICK STRATEGY ---
      let clicked = false;

      // 1. Try finding a button inside the chip (light DOM)
      const lightButton = chip.querySelector('button, [role="button"], .button');
      if (lightButton) {
        // console.log("[Gemini-Scraper] Clicking button in light DOM");
        lightButton.click();
        clicked = true;
      }

      // 2. Fallback: Click the chip element itself
      if (!clicked) {
        // console.log("[Gemini-Scraper] Clicking chip element directly");
        chip.click();
      }

      // 4. Fallback: Synthetic events (if simple click fails to trigger listeners)
      // We do this immediately after the real click just in case
      // Removed per user request - simple click worked.

      // --- WAIT FOR PANEL ---
      // Wait for panel and editor to appear
      // A simple timeout is often more robust than complex observers for this transient UI
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increased wait time slightly

      const panel = document.querySelector(GEMINI_CONFIG.SELECTORS.IMMERSIVE_PANEL);
      if (panel) {
        // Wait for specific content/editor
        let editor = panel.querySelector(GEMINI_CONFIG.SELECTORS.IMMERSIVE_EDITOR);

        // Retry logic for slow loading content inside panel
        if (!editor) {
          console.log("[Gemini-Scraper] Editor not found immediately, waiting...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          editor = panel.querySelector(GEMINI_CONFIG.SELECTORS.IMMERSIVE_EDITOR);
        }

        if (editor) {
          const content = editor.innerText || editor.textContent;
          if (content) {
            console.log(`[Gemini-Scraper] Extracted ${content.length} chars from document`);
            documents.push({
              title: title,
              content: content.trim(),
              source: 'immersive_document',
              type: 'text/markdown' // Usually markdown from Gemini
            });
          }
        } else {
          console.warn("[Gemini-Scraper] Immersive editor not found in panel (content may be loading or structure different)");
        }

        // --- CLOSE PANEL ---
        // Try to find a close button
        const closeSelectors = [
          'button[aria-label="Close"]',
          'button[aria-label="close"]',
          'button[data-test-id="close-button"]',
          '.close-button'
        ];

        let closeBtn = null;
        for (const selector of closeSelectors) {
          closeBtn = panel.querySelector(selector);
          if (closeBtn) break;
        }

        if (closeBtn) {
          closeBtn.click();
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait for close animation
        } else {
          console.warn("[Gemini-Scraper] Could not find close button for immersive panel");
          // Attempt to press Escape
          const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true });
          panel.dispatchEvent(escEvent);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } else {
        console.warn("[Gemini-Scraper] Immersive panel not found after clicking chip");
      }

    } catch (err) {
      console.error("[Gemini-Scraper] Error processing immersive chip:", err);
    }
  }

  return documents.length > 0 ? documents : null;
}

/**
 * Extract user uploaded documents by clicking on them in the carousel
 * @param {Element} userQueryElement - The user-query element
 * @returns {Promise<Array>} Array of extracted document objects
 */
async function extractUserUploadedDocuments(userQueryElement) {
  const documents = [];

  // Find the file carousel
  const carousel = userQueryElement.querySelector(GEMINI_CONFIG.SELECTORS.USER_FILE_CAROUSEL);
  if (!carousel) return null;

  // Find all file preview buttons
  const fileButtons = carousel.querySelectorAll(GEMINI_CONFIG.SELECTORS.USER_FILE_BUTTON);
  if (fileButtons.length === 0) return null;

  console.log(`[Gemini-Scraper] Found ${fileButtons.length} user uploaded files`);

  for (const button of fileButtons) {
    try {
      const fileName = button.getAttribute('aria-label') || 'Uploaded Document';
      console.log(`[Gemini-Scraper] Processing user file: "${fileName}"`);

      // Verify it's a clickable text/code file (skip images usually handled by extractUploadedFiles)
      // We process everything that has a button here.

      // Click the button
      button.click();

      // Wait for panel
      await new Promise(resolve => setTimeout(resolve, 2000));
      const panel = document.querySelector(GEMINI_CONFIG.SELECTORS.IMMERSIVE_PANEL);

      if (panel) {
        // Find content
        // User specified <pre class="drive-viewer-text-page">
        let content = '';
        const driveViewerPre = panel.querySelector(GEMINI_CONFIG.SELECTORS.DRIVE_VIEWER_TEXT);

        if (driveViewerPre) {
          content = driveViewerPre.textContent;
        } else {
          // Fallback to immersive editor if it's reused
          const editor = panel.querySelector(GEMINI_CONFIG.SELECTORS.IMMERSIVE_EDITOR);
          if (editor) content = editor.textContent;
        }

        if (content) {
          console.log(`[Gemini-Scraper] Extracted ${content.length} chars from user file`);
          documents.push({
            title: fileName,
            content: content,
            type: 'user_uploaded_document'
          });
        } else {
          console.warn("[Gemini-Scraper] Content element not found in panel for user file.");
        }

        // Close panel
        const closeButton = panel.querySelector('button[aria-label="Close"], button.close-button');
        if (closeButton) {
          closeButton.click();
        } else {
          // Fallback: send Escape key
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        }

        // Wait for panel to close
        await new Promise(resolve => setTimeout(resolve, 800));

      } else {
        console.warn("[Gemini-Scraper] Panel did not open for user file.");
      }

    } catch (err) {
      console.error("[Gemini-Scraper] Error processing user file:", err);
    }
  }

  return documents.length > 0 ? documents : null;
}

/**
 * Main scraping function for Google Gemini chat
 * @returns {Promise<Object>} Scraping result with messages and metadata
 */
async function scrapeGeminiChat() {
  try {
    console.log("[Gemini-Scraper] Starting scrape for:", location.href);

    // Wait for the chat app to load
    const chatApp = await waitForElement(GEMINI_CONFIG.SELECTORS.CHAT_CONTAINER, GEMINI_CONFIG.ELEMENT_WAIT_TIMEOUT);
    console.log("[Gemini-Scraper] Chat app found");

    // Allow time for dynamic content to render
    await new Promise((resolve) => setTimeout(resolve, GEMINI_CONFIG.RENDER_DELAY));

    // Try to find conversation container
    let container = chatApp.querySelector(GEMINI_CONFIG.SELECTORS.CONVERSATION_CONTAINER);
    if (!container) {
      container = chatApp; // Fallback to main chat app
    }

    // Auto-scroll to load history
    await autoScrollToTop(container);

    // Wait for content to stabilize
    await waitForStableContent(container, 500, 8000).catch(() => {
      console.warn("[Gemini-Scraper] Content did not stabilize, proceeding anyway");
    });

    const messages = [];
    let turnIndex = 0;

    // Strategy 1: Extract by message-set elements
    const messageSets = container.querySelectorAll(GEMINI_CONFIG.SELECTORS.MESSAGE_TURN);

    if (messageSets.length > 0) {
      console.log(`[Gemini-Scraper] Found ${messageSets.length} message sets`);

      // Use for...of to support await
      for (const messageSet of messageSets) {
        try {
          // Extract user query
          const userQuery = messageSet.querySelector(GEMINI_CONFIG.SELECTORS.USER_QUERY);
          if (userQuery) {
            const userText = extractUserQueryText(userQuery);
            const uploadedFiles = extractUploadedFiles(userQuery);
            const userDocs = await extractUserUploadedDocuments(userQuery);

            if (userText || uploadedFiles || (userDocs && userDocs.length > 0)) {
              messages.push({
                role: "user",
                content: userText,
                uploaded_files: uploadedFiles,
                embedded_documents: userDocs, // Add user docs here
                media: null,
                turn_index: turnIndex,
              });
            }
          }

          // Extract model response
          const modelResponse = messageSet.querySelector(GEMINI_CONFIG.SELECTORS.MODEL_RESPONSE);
          if (modelResponse) {
            const modelText = extractModelResponseText(modelResponse);
            const modelMedia = extractMedia(modelResponse);
            const embeddedDocs = await extractImmersiveDocuments(modelResponse);

            if (modelText || (embeddedDocs && embeddedDocs.length > 0)) {
              messages.push({
                role: "model",
                content: modelText,
                uploaded_files: null,
                media: modelMedia,
                embedded_documents: embeddedDocs,
                turn_index: turnIndex,
              });
            }
          }

          turnIndex++;
        } catch (error) {
          console.warn(`[Gemini-Scraper] Error parsing message set ${turnIndex}:`, error);
        }
      }
    } else {
      // Strategy 2: Extract all user-query and model-response elements in order
      console.log("[Gemini-Scraper] Using fallback extraction method");

      const userQueries = Array.from(container.querySelectorAll(GEMINI_CONFIG.SELECTORS.USER_QUERY));
      const modelResponses = Array.from(container.querySelectorAll(GEMINI_CONFIG.SELECTORS.MODEL_RESPONSE));

      // Interleave user queries and model responses
      const maxLength = Math.max(userQueries.length, modelResponses.length);

      for (let i = 0; i < maxLength; i++) {
        try {
          // Process user query
          if (i < userQueries.length) {
            const userQuery = userQueries[i];
            const userText = extractUserQueryText(userQuery);
            const uploadedFiles = extractUploadedFiles(userQuery);
            const userDocs = await extractUserUploadedDocuments(userQuery);

            if (userText || uploadedFiles || (userDocs && userDocs.length > 0)) {
              messages.push({
                role: "user",
                content: userText,
                uploaded_files: uploadedFiles,
                embedded_documents: userDocs,
                media: null,
                turn_index: i,
              });
            }
          }

          // Process model response
          if (i < modelResponses.length) {
            const modelResponse = modelResponses[i];
            const modelText = extractModelResponseText(modelResponse);
            const modelMedia = extractMedia(modelResponse);

            if (modelText || (modelMedia && modelMedia.length > 0)) { // Fixed condition to be safer
              const embeddedDocs = await extractImmersiveDocuments(modelResponse); // Determine docs for fallback too
              messages.push({
                role: "model",
                content: modelText,
                uploaded_files: null,
                media: modelMedia,
                embedded_documents: embeddedDocs,
                turn_index: i,
              });
            }
          }
        } catch (error) {
          console.warn(`[Gemini-Scraper] Error in fallback parsing at index ${i}:`, error);
        }
      }
    }

    // Calculate statistics
    const userMessages = messages.filter(m => m.role === 'user');
    const uploadedFilesCount = userMessages.reduce((total, msg) =>
      total + (msg.uploaded_files?.length || 0), 0
    );
    const generatedMediaCount = messages.reduce((total, msg) =>
      total + (msg.media?.length || 0), 0
    );

    console.log(`[Gemini-Scraper] Successfully extracted ${messages.length} messages`);

    return {
      success: true,
      messages,
      count: messages.length,
      statistics: {
        total_messages: messages.length,
        user_messages: userMessages.length,
        model_messages: messages.filter(m => m.role === 'model').length,
        uploaded_files: uploadedFilesCount,
        generated_media: generatedMediaCount,
        uploaded_files: uploadedFilesCount,
        generated_media: generatedMediaCount,
        embedded_documents_count: messages.reduce((total, msg) => total + (msg.embedded_documents?.length || 0), 0)
      },
      timestamp: new Date().toISOString(),
      url: location.href,
      platform: "Google Gemini",
      scraper_version: "2.0.0",
    };

  } catch (error) {
    console.error("[Gemini-Scraper] Scrape error:", error);

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      url: location.href,
      platform: "Google Gemini",
      debug_info: {
        error_stack: error.stack,
        available_selectors: getAvailableSelectors(),
        body_preview: document.body?.innerHTML?.substring(0, 500) || null,
      },
    };
  }
}

/**
 * Get list of potentially relevant selectors for debugging
 * @returns {Array} List of available selectors
 */
function getAvailableSelectors() {
  const selectors = Object.values(GEMINI_CONFIG.SELECTORS);
  return selectors.filter(selector => {
    try {
      return document.querySelector(selector) !== null;
    } catch (e) {
      return false;
    }
  });
}

// Make scrapeGeminiChat available globally (used by router)
if (typeof window !== 'undefined') {
  window.scrapeGeminiChat = scrapeGeminiChat;
}
