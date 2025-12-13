/**
 * ChatGPT Scraper
 * Specialized scraper for ChatGPT's interface
 * Extracts conversations, images, and upload previews
 * Uses shared utilities from utils.js
 *
 * STANDARDIZED MESSAGE FORMAT (must match across all scrapers):
 * {
 *   role: "user" | "assistant" | "model",
 *   content: string,
 *   media: [{ type: string, url: string, name: string, base64?: string }] | null,
 *   uploaded_files: [{ name: string, type: string, url: string, content?: string, encoding?: string, mimeType?: string }] | null,
 *   embedded_documents: [{ title: string, content: string, type: string }] | null,
 *   timestamp: string
 * }
 */

// Configuration constants specific to ChatGPT
const CHATGPT_CONFIG = {
    SELECTORS: {
        // Main container
        CHAT_CONTAINER: 'main',

        // Turns (The atomic units of conversation)
        USER_TURN: 'article[data-turn="user"]',
        MODEL_TURN: 'article[data-turn="assistant"]',

        // Content Containers (Where the actual stuff is)
        USER_CONTENT: '[data-message-author-role="user"]',
        MODEL_CONTENT: '[data-message-author-role="assistant"]',

        // Text Specifics
        USER_TEXT: '.whitespace-pre-wrap',
        MODEL_TEXT: '.markdown', // Specific text container for model

        // Images
        UPLOADED_IMG: 'img[alt="Uploaded image"]',
        GENERATED_IMG: 'img[alt="Generated image"]',

        // Fallbacks
        GENERIC_TEXT: '.text-message',
    }
};

/**
 * Progressively scroll through conversation and extract messages
 * Handles ChatGPT's lazy loading by extracting messages as we scroll
 * @param {Element} startElement - Element to start searching for scroll container
 * @returns {Promise<Array>} Array of all extracted messages
 */
async function progressiveScrollExtract(startElement) {
    console.log("[ChatGPT-Scraper] Starting progressive scroll extraction...");

    // Find the scrollable container
    let scrollContainer = startElement;
    const articleElement = startElement.querySelector('article[data-turn]');
    if (articleElement && articleElement.parentElement) {
        scrollContainer = articleElement.parentElement;
    }

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

    if (!scrollContainer || scrollContainer === document.body) {
        scrollContainer = document.querySelector('main') || document.documentElement;
    }

    console.log(`[ChatGPT-Scraper] Identified scroll container: ${scrollContainer.tagName}`);

    // Step 1: Scroll to the very top to load oldest messages
    console.log("[ChatGPT-Scraper] Phase 1: Scrolling to top...");
    let previousHeight = scrollContainer.scrollHeight;
    let noChangeCount = 0;

    for (let i = 0; i < UTILS_CONFIG.MAX_SCROLL_ATTEMPTS; i++) {
        scrollContainer.scrollTop = 0;
        await new Promise(resolve => setTimeout(resolve, UTILS_CONFIG.SCROLL_DELAY));

        const currentHeight = scrollContainer.scrollHeight;
        if (currentHeight > previousHeight) {
            console.log(`[ChatGPT-Scraper] Loaded older messages (${currentHeight}px vs ${previousHeight}px)`);
            previousHeight = currentHeight;
            noChangeCount = 0;
        } else {
            noChangeCount++;
            if (noChangeCount >= 2) {
                console.log("[ChatGPT-Scraper] Reached top of history");
                break;
            }
        }
    }

    // Step 2: Progressive scroll down while extracting messages
    console.log("[ChatGPT-Scraper] Phase 2: Progressive extraction...");
    const allMessages = new Map(); // Use Map to deduplicate by turn_id
    const scrollIncrement = scrollContainer.clientHeight * 0.8; // Scroll 80% of viewport at a time
    let currentScroll = 0;
    const maxScroll = scrollContainer.scrollHeight;

    while (currentScroll < maxScroll) {
        // Extract currently visible messages
        const visibleTurns = Array.from(scrollContainer.querySelectorAll('article[data-turn]'));
        console.log(`[ChatGPT-Scraper] Found ${visibleTurns.length} visible turns at scroll position ${currentScroll}`);

        for (const turn of visibleTurns) {
            const turnId = turn.getAttribute('data-turn-id');
            if (!turnId || allMessages.has(turnId)) continue;

            const role = turn.getAttribute('data-turn');
            const turnIndex = parseInt(turn.getAttribute('data-testid')?.split('-').pop() || '0');

            try {
                if (role === 'user') {
                    console.log(`[ChatGPT-Scraper] >> Encountered user turn ${turnIndex} (ID: ${turnId})`);
                    const userText = extractUserQueryText(turn);
                    const userMedia = extractUserImages(turn);

                    if (userText || userMedia) {
                        allMessages.set(turnId, {
                            role: 'user',
                            content: userText,
                            uploaded_files: null,
                            media: userMedia,
                            embedded_documents: null,
                            turn_index: turnIndex,
                            turn_id: turnId
                        });
                        console.log(`[ChatGPT-Scraper] ✓ Extracted user turn ${turnIndex} (text: ${!!userText}, media: ${userMedia?.length || 0})`);
                    } else {
                        console.log(`[ChatGPT-Scraper] ✗ Skipping empty user turn ${turnIndex}`);
                    }
                } else if (role === 'assistant') {
                    console.log(`[ChatGPT-Scraper] >> Encountered assistant turn ${turnIndex} (ID: ${turnId})`);
                    const modelText = extractModelResponseText(turn);
                    const modelMedia = extractModelMedia(turn);

                    if (modelText || modelMedia) {
                        allMessages.set(turnId, {
                            role: 'model',
                            content: modelText,
                            uploaded_files: null,
                            media: modelMedia,
                            embedded_documents: null,
                            turn_index: turnIndex,
                            turn_id: turnId
                        });
                        console.log(`[ChatGPT-Scraper] ✓ Extracted model turn ${turnIndex} (text: ${!!modelText}, media: ${modelMedia?.length || 0})`);
                    } else {
                        console.log(turn.innerHTML)
                        console.log(`[ChatGPT-Scraper] ✗ Skipping empty assistant turn ${turnIndex}`);
                    }
                }
            } catch (err) {
                console.warn(`[ChatGPT-Scraper] Error extracting turn ${turnId}:`, err);
            }
        }

        // Scroll down
        currentScroll += scrollIncrement;
        scrollContainer.scrollTop = currentScroll;

        // Wait for new content to load
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if we've actually scrolled (might be at bottom)
        if (scrollContainer.scrollTop < currentScroll - 10) {
            console.log("[ChatGPT-Scraper] Reached bottom of conversation");
            break;
        }
    }

    // Convert to array and sort by turn_index
    const messages = Array.from(allMessages.values()).sort((a, b) => a.turn_index - b.turn_index);
    console.log(`[ChatGPT-Scraper] Progressive extraction complete: ${messages.length} total messages`);

    return messages;
}

/**
 * Extract uploaded images from user query
 * @param {Element} userTurnElement - The user turn article
 * @returns {Array|null} Array of media objects or null
 */
function extractUserImages(userTurnElement) {
    if (!userTurnElement) return null;

    const media = [];
    const seenUrls = new Set();

    // Scoped to the specific content area to avoid matching unrelated images
    const contentArea = userTurnElement.querySelector(CHATGPT_CONFIG.SELECTORS.USER_CONTENT);
    if (!contentArea) return null;

    // Extract uploaded images
    const imgElements = contentArea.querySelectorAll(CHATGPT_CONFIG.SELECTORS.UPLOADED_IMG);
    console.log(`[ChatGPT-Scraper] Found ${imgElements.length} uploaded images in user turn`);

    imgElements.forEach((img) => {
        let src = img.src || img.getAttribute('data-src') || img.dataset.src;
        console.log(`[ChatGPT-Scraper] Processing user image: ${src?.substring(0, 60)}...`);

        if (src && !src.startsWith("data:") && !seenUrls.has(src)) {
            seenUrls.add(src);

            let imageName = 'uploaded_image.jpg';
            try {
                // Use new URL() for browser compatibility instead of URL.parse
                const urlObj = new URL(src);
                const filename = urlObj.pathname.split('/').pop();
                if (filename && filename.length > 0) {
                    imageName = filename;
                    // Append jpg if no extension to ensure utils.js treats it as image if needed
                    if (!imageName.includes('.')) {
                        imageName += '.jpg';
                    }
                }
            } catch (e) {
                console.warn("[ChatGPT-Scraper] Failed to parse image URL:", src);
            }

            console.log(`[ChatGPT-Scraper] ✓ Added user image: ${imageName}`);
            media.push({
                name: img.alt || imageName,
                type: 'image',
                source: 'user_upload',
                url: src,
            });
        }
    });

    console.log(`[ChatGPT-Scraper] Total user images extracted: ${media.length}`);

    return media.length > 0 ? media : null;
}

/**
 * Extract text content from user query
 * @param {Element} userTurnElement - The user turn article
 * @returns {string} Extracted text content
 */
function extractUserQueryText(userTurnElement) {
    if (!userTurnElement) return '';

    const contentContainer = userTurnElement.querySelector(CHATGPT_CONFIG.SELECTORS.USER_CONTENT);
    if (!contentContainer) {
        return userTurnElement.innerText.trim();
    }

    // Use specific text class if available
    const textEl = contentContainer.querySelector(CHATGPT_CONFIG.SELECTORS.USER_TEXT);
    if (textEl) {
        const text = textEl.innerText.trim();
        console.log(`[ChatGPT-Scraper] User text extracted (${text.length} chars): ${text.substring(0, 50)}...`);
        return text;
    }

    // Fallback: exclude image buttons and get text
    const clone = contentContainer.cloneNode(true);
    clone.querySelectorAll('button').forEach(el => el.remove());
    clone.querySelectorAll('img').forEach(el => el.remove());

    const text = clone.innerText.trim();
    console.log(`[ChatGPT-Scraper] User text (fallback) extracted (${text.length} chars): ${text.substring(0, 50)}...`);
    return text;
}

/**
 * Extract text content from model response
 * @param {Element} modelTurnElement - The model turn article
 * @returns {string} Extracted text content
 */
function extractModelResponseText(modelTurnElement) {
    if (!modelTurnElement) return '';

    const contentContainer = modelTurnElement.querySelector(CHATGPT_CONFIG.SELECTORS.MODEL_CONTENT);
    if (!contentContainer) return '';

    // Use specific markdown class if available, otherwise fallback to container
    const targetElement = contentContainer.querySelector(CHATGPT_CONFIG.SELECTORS.MODEL_TEXT) || contentContainer;

    // Clone to avoid modifying the actual DOM
    const clone = targetElement.cloneNode(true);

    // Process code blocks (pre elements)
    const preElements = clone.querySelectorAll('pre');
    preElements.forEach(pre => {
        // 1. Extract the code content
        const codeEl = pre.querySelector('code');
        if (!codeEl) return; // Not a standard code block
        const codeContent = codeEl.innerText;

        // 2. Extract the language (header)
        // To get the language, we clone the pre, remove the code and buttons, 
        // and see what text is left.
        const preClone = pre.cloneNode(true);
        if (preClone.querySelector('code')) preClone.querySelector('code').remove();
        preClone.querySelectorAll('button').forEach(b => b.remove());
        // Also remove any specific "Copy code" span text if it exists independently
        // (Though usually it's in a button or handled by the button removal)

        // The remaining text should be the language (e.g., "kotlin", "javascript")
        const apiLang = preClone.innerText.trim();
        const language = apiLang || '';

        // 3. Replace the entire pre element with a markdown code block representation
        // We surround it with newlines to ensure it separates well from surrounding text
        const markdownBlock = `\n\`\`\`${language}\n${codeContent}\n\`\`\`\n`;

        // Create a text node to replace the pre element
        pre.replaceWith(document.createTextNode(markdownBlock));
    });

    // Remove any remaining buttons (like copy/edit buttons that might be outside pre blocks)
    clone.querySelectorAll('button').forEach(el => el.remove());

    // Get the final text
    const text = clone.innerText.trim();

    console.log(`[ChatGPT-Scraper] Model text extracted (${text.length} chars): ${text.substring(0, 50)}...`);
    return text;
}

/**
 * Extract generated images from model response
 * @param {Element} modelTurnElement - The model turn article
 * @returns {Array|null} Array of media objects or null
 */
function extractModelMedia(modelTurnElement) {
    if (!modelTurnElement) return null;

    // Try to find the content container, but for image-only responses it might not exist
    let contentContainer = modelTurnElement.querySelector(CHATGPT_CONFIG.SELECTORS.MODEL_CONTENT);

    // Fallback: If no MODEL_CONTENT (happens with image-only responses), use the article itself
    if (!contentContainer) {
        console.log(`[ChatGPT-Scraper] ℹ️ MODEL_CONTENT not found, searching entire article for images (likely image-only response)`);
        contentContainer = modelTurnElement;
    } else {
        console.log(`[ChatGPT-Scraper] MODEL_CONTENT found, searching for images...`);
    }

    console.log(`[ChatGPT-Scraper] Content container has ${contentContainer.querySelectorAll('img').length} total img elements`);

    const media = [];
    const seenUrls = new Set();

    // Look for generated images
    const images = contentContainer.querySelectorAll(CHATGPT_CONFIG.SELECTORS.GENERATED_IMG);
    console.log(`[ChatGPT-Scraper] Found ${images.length} images with selector '${CHATGPT_CONFIG.SELECTORS.GENERATED_IMG}'`);

    // Debug: show all img alts
    if (images.length === 0) {
        const allImgs = contentContainer.querySelectorAll('img');
        const alts = Array.from(allImgs).map(img => img.alt || '(no alt)').join(', ');
        console.log(`[ChatGPT-Scraper] Available img alt attributes: [${alts}]`);
    }

    images.forEach(img => {
        // Check if the image is visible (opacity 1)
        const style = img.getAttribute('style') || '';
        if (style.includes('opacity: 0') || style.includes('opacity: 0.01')) {
            console.log(`[ChatGPT-Scraper] ✗ Skipping hidden image (opacity 0)`);
            return;
        }

        let src = img.src || img.getAttribute('data-src');

        if (src && !seenUrls.has(src)) {
            seenUrls.add(src);
            console.log(`[ChatGPT-Scraper] ✓ Added generated image: ${img.alt || 'Generated Image'}`);
            media.push({
                url: src,
                type: "image",
                name: img.alt || "Generated Image",
                source: "model_generation"
            });
        }
    });

    console.log(`[ChatGPT-Scraper] Total generated images extracted: ${media.length}`);
    return media.length > 0 ? media : null;
}

/**
 * Main scraping function for ChatGPT
 * @returns {Promise<Object>} Scraping result with messages and metadata
 */
async function scrapeChatGPT() {
    try {
        console.log("[ChatGPT-Scraper] Starting scrape for:", location.href);

        // Initial check for container
        const container = document.querySelector(CHATGPT_CONFIG.SELECTORS.CHAT_CONTAINER) || document.body;

        // Wait for at least one turn to appear
        await waitForElement('article', UTILS_CONFIG.ELEMENT_WAIT_TIMEOUT).catch(() => {
            console.warn("[ChatGPT-Scraper] No articles found immediately, proceeding...");
        });

        // Use progressive scroll extraction to handle lazy loading
        const messages = await progressiveScrollExtract(container);

        // Calculate statistics
        const userMessages = messages.filter(m => m.role === 'user');
        const generatedMediaCount = messages.reduce((total, msg) =>
            total + (msg.media?.length || 0), 0
        );

        console.log(`\n[ChatGPT-Scraper] ===== SCRAPING COMPLETE =====`);
        console.log(`[ChatGPT-Scraper] Valid messages extracted: ${messages.length}`);
        console.log(`[ChatGPT-Scraper] - User messages: ${userMessages.length}`);
        console.log(`[ChatGPT-Scraper] - Model messages: ${messages.filter(m => m.role === 'model').length}`);
        console.log(`[ChatGPT-Scraper] - Total media items: ${generatedMediaCount}`);

        return {
            success: true,
            messages,
            count: messages.length,
            statistics: {
                total_messages: messages.length,
                user_messages: userMessages.length,
                model_messages: messages.filter(m => m.role === 'model').length,
                uploaded_files: 0, // Now handling images as media
                generated_media: generatedMediaCount,
            },
            timestamp: new Date().toISOString(),
            url: location.href,
            platform: "ChatGPT",
            scraper_version: "2.1.1",
        };

    } catch (error) {
        console.error("[ChatGPT-Scraper] Scrape error:", error);

        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            url: location.href,
            platform: "ChatGPT",
            debug_info: {
                error_stack: error.stack,
                available_selectors: getAvailableSelectors(['main', 'article', '[data-turn]']),
            },
        };
    }
}

// Make scraper available globally (used by router)
if (typeof window !== 'undefined') {
    window.scrapeChatGPT = scrapeChatGPT;
}
