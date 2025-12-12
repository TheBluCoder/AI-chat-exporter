/**
 * ChatGPT Scraper
 * Platform-specific scraper for ChatGPT's interface
 * Extends BaseScraper with ChatGPT-specific extraction logic
 */

import { BaseScraper } from '../base/BaseScraper.js';
import { CHATGPT_CONFIG } from '../config/chatgpt.config.js';

export class ChatGPTScraper extends BaseScraper {
  constructor() {
    super(CHATGPT_CONFIG);
  }

  /**
   * ChatGPT uses progressive scrolling due to lazy loading
   * Override to use progressive scroll extraction
   * @param {Element} container - Container element
   * @returns {Promise<void>}
   */
  async scrollToLoadHistory(container) {
    await this.progressiveScrollExtract(container);
  }

  /**
   * Extract all messages using progressive scroll technique
   * ChatGPT lazy-loads messages, so we scroll and extract as we go
   * @param {Element} container - Container element
   * @returns {Promise<Array>} Array of messages
   */
  async progressiveScrollExtract(container) {
    console.log(`[${this.platform}-Scraper] Starting progressive scroll extraction...`);

    const scrollContainer = this.findScrollContainer(container);
    console.log(`[${this.platform}-Scraper] Identified scroll container: ${scrollContainer.tagName}`);

    // Step 1: Scroll to the very top to load oldest messages
    console.log(`[${this.platform}-Scraper] Phase 1: Scrolling to top...`);
    await this.autoScrollToTop(scrollContainer);

    // Step 2: Progressive scroll down while extracting messages
    console.log(`[${this.platform}-Scraper] Phase 2: Progressive extraction...`);
    const allMessages = new Map(); // Use Map to deduplicate by turn_id
    const scrollIncrement = scrollContainer.clientHeight * this.scrollConfig.scrollIncrement;
    let currentScroll = 0;
    const maxScroll = scrollContainer.scrollHeight;

    while (currentScroll < maxScroll) {
      // Extract currently visible messages
      const visibleTurns = Array.from(scrollContainer.querySelectorAll(this.selectors.ARTICLE_TURN));
      console.log(`[${this.platform}-Scraper] Found ${visibleTurns.length} visible turns at scroll position ${currentScroll}`);

      for (const turn of visibleTurns) {
        const turnId = turn.getAttribute('data-turn-id');
        if (!turnId || allMessages.has(turnId)) continue;

        const role = turn.getAttribute('data-turn');
        const turnIndex = parseInt(turn.getAttribute('data-testid')?.split('-').pop() || '0');

        try {
          if (role === 'user') {
            console.log(`[${this.platform}-Scraper] >> Encountered user turn ${turnIndex} (ID: ${turnId})`);
            const userText = this.extractUserQueryText(turn);
            const userMedia = this.extractUserImages(turn);

            if (userText || userMedia) {
              allMessages.set(turnId, this.createMessage({
                role: 'user',
                content: userText,
                media: userMedia,
                turn_index: turnIndex,
                turn_id: turnId,
              }));
              console.log(`[${this.platform}-Scraper] ✓ Extracted user turn ${turnIndex} (text: ${!!userText}, media: ${userMedia?.length || 0})`);
            } else {
              console.log(`[${this.platform}-Scraper] ✗ Skipping empty user turn ${turnIndex}`);
            }
          } else if (role === 'assistant') {
            console.log(`[${this.platform}-Scraper] >> Encountered assistant turn ${turnIndex} (ID: ${turnId})`);
            const modelText = this.extractModelResponseText(turn);
            const modelMedia = this.extractModelMedia(turn);

            if (modelText || modelMedia) {
              allMessages.set(turnId, this.createMessage({
                role: 'model',
                content: modelText,
                media: modelMedia,
                turn_index: turnIndex,
                turn_id: turnId,
              }));
              console.log(`[${this.platform}-Scraper] ✓ Extracted model turn ${turnIndex} (text: ${!!modelText}, media: ${modelMedia?.length || 0})`);
            } else {
              console.log(turn.innerHTML);
              console.log(`[${this.platform}-Scraper] ✗ Skipping empty assistant turn ${turnIndex}`);
            }
          }
        } catch (err) {
          console.warn(`[${this.platform}-Scraper] Error extracting turn ${turnId}:`, err);
        }
      }

      // Scroll down
      currentScroll += scrollIncrement;
      scrollContainer.scrollTop = currentScroll;

      // Wait for new content to load
      await this.sleep(500);

      // Check if we've actually scrolled (might be at bottom)
      if (scrollContainer.scrollTop < currentScroll - 10) {
        console.log(`[${this.platform}-Scraper] Reached bottom of conversation`);
        break;
      }
    }

    // Convert to array and sort by turn_index
    const messages = Array.from(allMessages.values()).sort((a, b) => a.turn_index - b.turn_index);
    console.log(`[${this.platform}-Scraper] Progressive extraction complete: ${messages.length} total messages`);

    return messages;
  }

  /**
   * Extract all messages from container
   * ChatGPT uses progressive extraction, so this is handled in scrollToLoadHistory
   * @param {Element} container - Container element
   * @returns {Promise<Array>} Array of messages
   */
  async extractAllMessages(container) {
    // Messages already extracted during progressive scroll
    return this._extractedMessages || [];
  }

  /**
   * Override scroll to load to store extracted messages
   * @param {Element} container - Container element
   * @returns {Promise<void>}
   */
  async scrollToLoadHistory(container) {
    this._extractedMessages = await this.progressiveScrollExtract(container);
  }

  /**
   * Extract uploaded images from user query
   * @param {Element} userTurnElement - The user turn article
   * @returns {Array|null} Array of media objects or null
   */
  extractUserImages(userTurnElement) {
    if (!userTurnElement) return null;

    const media = [];
    const seenUrls = new Set();

    // Scoped to the specific content area to avoid matching unrelated images
    const contentArea = userTurnElement.querySelector(this.selectors.USER_CONTENT);
    if (!contentArea) return null;

    // Extract uploaded images
    const imgElements = contentArea.querySelectorAll(this.selectors.UPLOADED_IMG);
    console.log(`[${this.platform}-Scraper] Found ${imgElements.length} uploaded images in user turn`);

    imgElements.forEach((img) => {
      let src = img.src || img.getAttribute('data-src') || img.dataset.src;
      console.log(`[${this.platform}-Scraper] Processing user image: ${src?.substring(0, 60)}...`);

      if (src && !src.startsWith("data:") && !seenUrls.has(src)) {
        seenUrls.add(src);

        let imageName = 'uploaded_image.jpg';
        try {
          const urlObj = new URL(src);
          const filename = urlObj.pathname.split('/').pop();
          if (filename && filename.length > 0) {
            imageName = filename;
            if (!imageName.includes('.')) {
              imageName += '.jpg';
            }
          }
        } catch (e) {
          console.warn(`[${this.platform}-Scraper] Failed to parse image URL:`, src);
        }

        console.log(`[${this.platform}-Scraper] ✓ Added user image: ${imageName}`);
        media.push({
          name: img.alt || imageName,
          type: 'image',
          source: 'user_upload',
          url: src,
        });
      }
    });

    console.log(`[${this.platform}-Scraper] Total user images extracted: ${media.length}`);
    return media.length > 0 ? media : null;
  }

  /**
   * Extract text content from user query
   * @param {Element} userTurnElement - The user turn article
   * @returns {string} Extracted text content
   */
  extractUserQueryText(userTurnElement) {
    if (!userTurnElement) return '';

    const contentContainer = userTurnElement.querySelector(this.selectors.USER_CONTENT);
    if (!contentContainer) {
      return userTurnElement.innerText.trim();
    }

    // Use specific text class if available
    const textEl = contentContainer.querySelector(this.selectors.USER_TEXT);
    if (textEl) {
      const text = textEl.innerText.trim();
      console.log(`[${this.platform}-Scraper] User text extracted (${text.length} chars): ${text.substring(0, 50)}...`);
      return text;
    }

    // Fallback: exclude image buttons and get text
    const clone = contentContainer.cloneNode(true);
    clone.querySelectorAll('button').forEach(el => el.remove());
    clone.querySelectorAll('img').forEach(el => el.remove());

    const text = clone.innerText.trim();
    console.log(`[${this.platform}-Scraper] User text (fallback) extracted (${text.length} chars): ${text.substring(0, 50)}...`);
    return text;
  }

  /**
   * Extract text content from model response
   * @param {Element} modelTurnElement - The model turn article
   * @returns {string} Extracted text content
   */
  extractModelResponseText(modelTurnElement) {
    if (!modelTurnElement) return '';

    const contentContainer = modelTurnElement.querySelector(this.selectors.MODEL_CONTENT);
    if (!contentContainer) return '';

    // Use specific markdown class if available, otherwise fallback to container
    const targetElement = contentContainer.querySelector(this.selectors.MODEL_TEXT) || contentContainer;

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
      const preClone = pre.cloneNode(true);
      if (preClone.querySelector('code')) preClone.querySelector('code').remove();
      preClone.querySelectorAll('button').forEach(b => b.remove());

      // The remaining text should be the language (e.g., "kotlin", "javascript")
      const apiLang = preClone.innerText.trim();
      const language = apiLang || '';

      // 3. Replace the entire pre element with a markdown code block representation
      const markdownBlock = `\n\`\`\`${language}\n${codeContent}\n\`\`\`\n`;

      // Create a text node to replace the pre element
      pre.replaceWith(document.createTextNode(markdownBlock));
    });

    // Remove any remaining buttons
    clone.querySelectorAll('button').forEach(el => el.remove());

    // Get the final text
    const text = clone.innerText.trim();

    console.log(`[${this.platform}-Scraper] Model text extracted (${text.length} chars): ${text.substring(0, 50)}...`);
    return text;
  }

  /**
   * Extract generated images from model response
   * @param {Element} modelTurnElement - The model turn article
   * @returns {Array|null} Array of media objects or null
   */
  extractModelMedia(modelTurnElement) {
    if (!modelTurnElement) return null;

    // Try to find the content container, but for image-only responses it might not exist
    let contentContainer = modelTurnElement.querySelector(this.selectors.MODEL_CONTENT);

    // Fallback: If no MODEL_CONTENT (happens with image-only responses), use the article itself
    if (!contentContainer) {
      console.log(`[${this.platform}-Scraper] ℹ️ MODEL_CONTENT not found, searching entire article for images`);
      contentContainer = modelTurnElement;
    } else {
      console.log(`[${this.platform}-Scraper] MODEL_CONTENT found, searching for images...`);
    }

    console.log(`[${this.platform}-Scraper] Content container has ${contentContainer.querySelectorAll('img').length} total img elements`);

    const media = [];
    const seenUrls = new Set();

    // Look for generated images
    const images = contentContainer.querySelectorAll(this.selectors.GENERATED_IMG);
    console.log(`[${this.platform}-Scraper] Found ${images.length} images with selector '${this.selectors.GENERATED_IMG}'`);

    // Debug: show all img alts
    if (images.length === 0) {
      const allImgs = contentContainer.querySelectorAll('img');
      const alts = Array.from(allImgs).map(img => img.alt || '(no alt)').join(', ');
      console.log(`[${this.platform}-Scraper] Available img alt attributes: [${alts}]`);
    }

    images.forEach(img => {
      // Check if the image is visible (opacity 1)
      const style = img.getAttribute('style') || '';
      if (style.includes('opacity: 0') || style.includes('opacity: 0.01')) {
        console.log(`[${this.platform}-Scraper] ✗ Skipping hidden image (opacity 0)`);
        return;
      }

      let src = img.src || img.getAttribute('data-src');

      if (src && !seenUrls.has(src)) {
        seenUrls.add(src);
        console.log(`[${this.platform}-Scraper] ✓ Added generated image: ${img.alt || 'Generated Image'}`);
        media.push({
          url: src,
          type: "image",
          name: img.alt || "Generated Image",
          source: "model_generation"
        });
      }
    });

    console.log(`[${this.platform}-Scraper] Total generated images extracted: ${media.length}`);
    return media.length > 0 ? media : null;
  }
}

export default ChatGPTScraper;
