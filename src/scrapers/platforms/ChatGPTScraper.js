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
   * ChatGPT lazy-loads messages, so we must extract while scrolling
   * Override extractAllMessages to do progressive scroll + extraction
   * @param {Element} container - Container element
   * @returns {Promise<Array>} Array of messages
   */
  async extractAllMessages(container) {
    console.log(`[${this.platform}-Scraper] Starting progressive extraction...`);

    const scrollContainer = this.findScrollContainer(container);
    const allMessages = new Map(); // Use Map to deduplicate by turn_id
    const scrollIncrement = scrollContainer.clientHeight * (this.scrollConfig.scrollIncrement || 0.8);
    let currentScroll = 0;
    const maxScroll = scrollContainer.scrollHeight;

    // Progressive scroll down while extracting messages
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
            const userText = this.extractUserText(turn);
            const userMedia = this.extractUserMedia(turn);

            if (userText || userMedia) {
              allMessages.set(turnId, this.createMessage({
                role: 'user',
                content: userText,
                media: userMedia,
                turn_index: turnIndex,
                turn_id: turnId,
              }));
              console.log(`[${this.platform}-Scraper] ✓ Extracted user turn ${turnIndex} (text: ${!!userText}, media: ${userMedia?.length || 0})`);
            }
          } else if (role === 'assistant') {
            console.log(`[${this.platform}-Scraper] >> Encountered assistant turn ${turnIndex} (ID: ${turnId})`);
            const modelText = this.extractModelText(turn);
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
   * Extract text content from model response
   * Override to handle ChatGPT's code block formatting
   * @param {Element} modelTurnElement - The model turn article
   * @returns {string} Extracted text content
   */
  extractModelText(modelTurnElement) {
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
   * Override to handle image-only responses where MODEL_CONTENT doesn't exist
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

    // Use base class extraction with the adjusted container
    const media = this.extractImagesFromElement(contentContainer, {
      imageSelector: this.selectors.GENERATED_IMG,
      source: 'model_generation',
      contentSelector: null, // Don't search for content selector, we already have the container
    });

    // Debug: show all img alts if no images found
    if (!media || media.length === 0) {
      const allImgs = contentContainer.querySelectorAll('img');
      const alts = Array.from(allImgs).map(img => img.alt || '(no alt)').join(', ');
      console.log(`[${this.platform}-Scraper] Available img alt attributes: [${alts}]`);
    }

    console.log(`[${this.platform}-Scraper] Total generated images extracted: ${media?.length || 0}`);
    return media;
  }
}

export default ChatGPTScraper;
