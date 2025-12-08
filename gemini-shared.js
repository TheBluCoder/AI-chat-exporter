/**
 * AI Chat Scraper Utility Functions
 * Extracts conversation data from AI web applications
 */

// Configuration constants
// Configuration constants
const SHARED_CONFIG = {
  ELEMENT_WAIT_TIMEOUT: 15000,
  CONTENT_STABLE_MS: 800,
  CONTENT_TIMEOUT: 10000,
  RENDER_DELAY: 500,
};

/**
 * Wait for an element to appear in the DOM
 * @param {string} selector - CSS selector to wait for
 * @param {number} timeout - Maximum wait time in milliseconds
 * @returns {Promise<Element>} The found element
 */
function waitForElement(selector, timeout = SHARED_CONFIG.ELEMENT_WAIT_TIMEOUT) {
  return new Promise((resolve, reject) => {
    // Check if element already exists
    const existingElement = document.querySelector(selector);
    if (existingElement) {
      return resolve(existingElement);
    }

    // Set up MutationObserver to watch for element
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    // Observe DOM changes
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Set timeout to prevent infinite waiting
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
async function waitForStableContent(element, stableMs = SHARED_CONFIG.CONTENT_STABLE_MS, timeout = SHARED_CONFIG.CONTENT_TIMEOUT) {
  const startTime = Date.now();
  let previousText = element.innerText;

  while (Date.now() - startTime < timeout) {
    await new Promise((resolve) => setTimeout(resolve, stableMs));
    const currentText = element.innerText;

    if (currentText === previousText) {
      return true; // Content has stabilized
    }

    previousText = currentText;
  }

  return false; // Timeout reached, content still changing
}

/**
 * Detect media type from URL
 * @param {string} url - URL to analyze
 * @returns {string|null} Media type or null
 */
function getMediaType(url) {
  if (!url) return null;

  const cleanUrl = url.split("?")[0].toLowerCase();

  const patterns = {
    image: /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i,
    document: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i,
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
 * Extract media (images and file links) from a DOM element
 * @param {Element} element - The element to extract media from
 * @returns {Array|null} Array of media objects or null
 */
function extractMedia(element) {
  if (!element) return null;

  const media = [];
  const seenUrls = new Set(); // Prevent duplicates

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
      href.includes("google.com/search") ||
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
      });
    }
  });

  return media.length > 0 ? media : null;
}

/**
 * Main scraping function for Gemini/AI chat containers
 * @returns {Promise<Object>} Scraping result with messages and metadata
 */
async function scrapeGeminiSharedChat() {
  try {
    console.log("[AI-Exporter] Starting scrape for:", location.href);

    // Wait for the main chat container
    const container = await waitForElement("section.share-viewer_chat-container", SHARED_CONFIG.ELEMENT_WAIT_TIMEOUT);
    console.log("[AI-Exporter] Container found");

    // Allow time for dynamic content to render
    await new Promise((resolve) => setTimeout(resolve, SHARED_CONFIG.RENDER_DELAY));

    // Wait for content to stabilize
    await waitForStableContent(container, 500, 8000).catch(() => {
      console.warn("[AI-Exporter] Content did not stabilize, proceeding anyway");
    });

    const messages = [];
    const turns = container.querySelectorAll("share-turn-viewer");

    if (turns.length > 0) {
      // Process structured conversation turns
      turns.forEach((turn, index) => {
        try {
          // Extract user query
          const userQuery = turn.querySelector("user-query");
          if (userQuery) {
            const userMedia = extractMedia(userQuery);
            const userContent = userQuery.innerText.trim();

            if (userContent) {
              messages.push({
                role: "user",
                content: userContent,
                media: userMedia,
                media_type: userMedia ? userMedia.map((m) => m.type) : null,
                turn_index: index,
              });
            }
          }

          // Extract model response
          const modelContent = turn.querySelector("message-content");
          if (modelContent) {
            const modelMedia = extractMedia(modelContent);
            const modelText = modelContent.innerText.trim();

            if (modelText) {
              messages.push({
                role: "model",
                content: modelText,
                media: modelMedia,
                media_type: modelMedia ? modelMedia.map((m) => m.type) : null,
                turn_index: index,
              });
            }
          }
        } catch (error) {
          console.warn(`[AI-Exporter] Error parsing turn ${index}:`, error);
        }
      });
    } else {
      // Fallback: extract all user queries and model responses in order
      console.log("[AI-Exporter] Using fallback extraction method");
      const allElements = container.querySelectorAll("user-query, message-content");

      allElements.forEach((element, index) => {
        try {
          const isUser = element.tagName.toLowerCase() === "user-query";
          const media = extractMedia(element);
          const content = element.innerText.trim();

          if (content) {
            messages.push({
              role: isUser ? "user" : "model",
              content,
              media,
              media_type: media ? media.map((m) => m.type) : null,
              element_index: index,
            });
          }
        } catch (error) {
          console.warn(`[AI-Exporter] Error in fallback parsing at index ${index}:`, error);
        }
      });
    }

    console.log(`[AI-Exporter] Successfully extracted ${messages.length} messages`);

    return {
      success: true,
      messages,
      count: messages.length,
      timestamp: new Date().toISOString(),
      url: location.href,
      containerFound: true,
    };

  } catch (error) {
    console.error("[AI-Exporter] Scrape error:", error);

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      url: location.href,
      containerFound: false,
      debug_info: {
        body_preview: document.body?.innerHTML?.substring(0, 500) || null,
        available_selectors: getAvailableSelectors(),
      },
    };
  }
}

/**
 * Get list of potentially relevant selectors for debugging
 * @returns {Array} List of available selectors
 */
function getAvailableSelectors() {
  const selectors = [
    'section',
    '[class*="chat"]',
    '[class*="conversation"]',
    '[class*="message"]',
  ];

  return selectors.filter(selector => document.querySelector(selector) !== null);
}

// Make scrapeGeminiSharedChat available globally (used by router)
if (typeof window !== 'undefined') {
  window.scrapeGeminiSharedChat = scrapeGeminiSharedChat;
}
