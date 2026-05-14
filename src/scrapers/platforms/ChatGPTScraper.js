/**
 * ChatGPT Scraper
 * Platform-specific scraper for ChatGPT's interface
 * Extends BaseScraper with ChatGPT-specific extraction logic
 */

import { BaseScraper } from '../base/BaseScraper.js';
import { CHATGPT_CONFIG } from '../config/chatgpt.config.js';
import {
  LOG_TEXT_PREVIEW_LENGTH,
  SCROLL_POSITION_TOLERANCE,
} from '../base/constants.js';

// Constants
const DEFAULT_SCROLL_INCREMENT = 0.8;
const DEFAULT_TURN_INDEX = 0;
const CONTENT_LOAD_DELAY_MS = 240;  // Conservative speed-up with settle checks
const RECOVERY_SCROLL_INCREMENT = 0.4;
const RECOVERY_LOAD_DELAY_MS = 350;

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
    const scrollContainer = this.findScrollContainer(container);
    const allMessages = new Map();
    const seenShellTurns = new Set();

    await this.captureVisibleTurns(scrollContainer, allMessages, seenShellTurns);

    // Fast baseline pass
    await this.sweepDownAndCapture(
      scrollContainer,
      allMessages,
      seenShellTurns,
      this.scrollConfig.scrollIncrement || DEFAULT_SCROLL_INCREMENT,
      CONTENT_LOAD_DELAY_MS
    );

    // Targeted recovery pass when we saw shell turns that never hydrated
    const unresolvedBeforeRecovery = this.getUnresolvedTurnKeys(allMessages, seenShellTurns);
    if (unresolvedBeforeRecovery.size > 0) {
      scrollContainer.scrollTop = 0;
      await this.waitForTurnSettle(scrollContainer, RECOVERY_LOAD_DELAY_MS);

      await this.sweepDownAndCapture(
        scrollContainer,
        allMessages,
        seenShellTurns,
        RECOVERY_SCROLL_INCREMENT,
        RECOVERY_LOAD_DELAY_MS,
        unresolvedBeforeRecovery
      );
    }

    return Array.from(allMessages.values()).sort((a, b) => a.turn_index - b.turn_index);
  }

  /**
   * Prefer ChatGPT's explicit scroll root when available
   * @param {Element} startElement
   * @returns {Element}
   */
  findScrollContainer(startElement) {
    const explicitRoot = document.querySelector('[data-scroll-root]');
    if (explicitRoot) return explicitRoot;
    return super.findScrollContainer(startElement);
  }

  /**
   * Scroll from current position to bottom while capturing hydrated turns.
   * @param {Element} scrollContainer
   * @param {Map} allMessages
   * @param {Set} seenShellTurns
   * @param {number} incrementRatio
   * @param {number} waitMs
   * @param {Set<string>|null} targetTurnKeys
   */
  async sweepDownAndCapture(scrollContainer, allMessages, seenShellTurns, incrementRatio, waitMs, targetTurnKeys = null) {
    const increment = Math.max(1, Math.floor(scrollContainer.clientHeight * incrementRatio));
    let currentScroll = scrollContainer.scrollTop;

    while (currentScroll < scrollContainer.scrollHeight) {
      await this.captureVisibleTurns(scrollContainer, allMessages, seenShellTurns, targetTurnKeys);

      const nextScroll = Math.min(currentScroll + increment, scrollContainer.scrollHeight);
      scrollContainer.scrollTop = nextScroll;
      await this.waitForTurnSettle(scrollContainer, waitMs);

      if (scrollContainer.scrollTop < nextScroll - SCROLL_POSITION_TOLERANCE) {
        break;
      }

      if (targetTurnKeys && this.getUnresolvedTurnKeys(allMessages, seenShellTurns, targetTurnKeys).size === 0) {
        break;
      }

      currentScroll = scrollContainer.scrollTop;
    }

    await this.captureVisibleTurns(scrollContainer, allMessages, seenShellTurns, targetTurnKeys);
  }

  /**
   * Capture visible turns. Shell turns are tracked separately until hydrated.
   * @param {Element} scrollContainer
   * @param {Map} allMessages
   * @param {Set} seenShellTurns
   * @param {Set<string>|null} targetTurnKeys
   */
  async captureVisibleTurns(scrollContainer, allMessages, seenShellTurns, targetTurnKeys = null) {
    const visibleTurns = Array.from(scrollContainer.querySelectorAll(this.selectors.ARTICLE_TURN));

    for (const turn of visibleTurns) {
      const role = turn.getAttribute('data-turn');
      const turnIndex = this.parseTurnIndex(turn);
      const turnId = turn.getAttribute('data-turn-id');
      const turnKey = this.createTurnKey(turn, role, turnIndex);

      if (targetTurnKeys && !targetTurnKeys.has(turnKey)) continue;
      if (allMessages.has(turnKey)) continue;

      seenShellTurns.add(turnKey);

      try {
        if (role === 'user') {
          const userText = this.extractUserText(turn);
          const userMedia = this.extractUserMedia(turn);
          if (!this.hasHydratedContent(userText, userMedia)) continue;

          allMessages.set(turnKey, this.createMessage({
            role: 'user',
            content: userText,
            media: userMedia,
            turn_index: turnIndex,
            turn_id: turnId || turnKey,
          }));
        } else if (role === 'assistant') {
          const modelText = this.extractModelText(turn);
          const modelMedia = this.extractModelMedia(turn);
          if (!this.hasHydratedContent(modelText, modelMedia)) continue;

          allMessages.set(turnKey, this.createMessage({
            role: 'model',
            content: modelText,
            media: modelMedia,
            turn_index: turnIndex,
            turn_id: turnId || turnKey,
          }));
        }
      } catch (err) {
        console.warn(`[${this.platform}-Scraper] Error extracting turn ${turnKey}:`, err);
      }
    }
  }

  /**
   * Parse numeric turn index from data-testid and fall back safely
   * @param {Element} turnElement
   * @returns {number}
   */
  parseTurnIndex(turnElement) {
    const testId = turnElement?.getAttribute('data-testid') || '';
    const parsed = Number.parseInt(testId.split('-').pop(), 10);
    return Number.isFinite(parsed) ? parsed : DEFAULT_TURN_INDEX;
  }

  /**
   * Build a stable dedupe key even when data-turn-id is unavailable
   * @param {Element} turnElement
   * @param {string|null} role
   * @param {number} turnIndex
   * @returns {string}
   */
  createTurnKey(turnElement, role, turnIndex) {
    const turnId = turnElement?.getAttribute('data-turn-id');
    if (turnId) return turnId;

    const testId = turnElement?.getAttribute('data-testid');
    if (testId) return testId;

    const textPreview = (role === 'assistant'
      ? this.extractModelText(turnElement)
      : this.extractUserText(turnElement)
    ).slice(0, LOG_TEXT_PREVIEW_LENGTH);

    return `${role || 'unknown'}-${turnIndex}-${textPreview}`;
  }

  /**
   * Extract text content from user message
   * Override to preserve inline image position in exported text
   * @param {Element} userTurnElement - The user turn container
   * @returns {string} Extracted text content
   */
  extractUserText(userTurnElement) {
    if (!userTurnElement) return '';

    const contentContainer = userTurnElement.querySelector(this.selectors.USER_CONTENT);
    if (!contentContainer) return '';

    const targetElement = contentContainer.querySelector(this.selectors.USER_TEXT) || contentContainer;
    const clone = targetElement.cloneNode(true);

    this.replaceInlineImagesWithMarkdown(clone, this.selectors.UPLOADED_IMG);
    clone.querySelectorAll('button').forEach(el => el.remove());

    return clone.innerText.trim();
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

    // Preserve image position relative to surrounding text
    this.replaceInlineImagesWithMarkdown(clone, this.selectors.GENERATED_IMG);

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

    return text;
  }

  /**
   * Replace inline images with markdown image syntax so content ordering
   * stays close to the rendered chat layout.
   * @param {Element} rootElement - Cloned content root
   * @param {string} imageSelector - Selector used to find relevant images
   */
  replaceInlineImagesWithMarkdown(rootElement, imageSelector) {
    if (!rootElement || !imageSelector) return;

    const images = rootElement.querySelectorAll(imageSelector);
    images.forEach((img) => {
      const src = img.src || img.getAttribute('data-src') || img.dataset.src;
      if (!src || src.startsWith('data:')) return;

      const alt = (img.alt || 'Image').trim() || 'Image';
      const markdownImage = `\n![${alt}](${src})\n`;
      img.replaceWith(document.createTextNode(markdownImage));
    });
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
      contentContainer = modelTurnElement;
    }

    // Use base class extraction with the adjusted container
    const media = this.extractImagesFromElement(contentContainer, {
      imageSelector: this.selectors.GENERATED_IMG,
      source: 'model_generation',
      contentSelector: null, // Don't search for content selector, we already have the container
    });

    return media;
  }
}

export default ChatGPTScraper;
