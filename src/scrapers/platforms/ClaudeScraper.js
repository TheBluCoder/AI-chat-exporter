/**
 * Claude Scraper
 * Platform-specific scraper for Claude's chat interface
 * Extends BaseScraper with Claude-specific extraction logic
 * Handles preview panels (artifacts) similar to Gemini's immersive documents
 */

import { BaseScraper } from '../base/BaseScraper.js';
import { CLAUDE_CONFIG } from '../config/claude.config.js';

export class ClaudeScraper extends BaseScraper {
  constructor() {
    super(CLAUDE_CONFIG);
  }

  /**
   * Extract all messages from Claude conversation
   * Override to handle Claude's message structure and preview panels
   * @param {Element} container - Conversation container
   * @returns {Promise<Array>} Array of message objects
   */
  async extractAllMessages(container) {
    const messages = [];
    let turnIndex = 0;

    // Find all message turns
    const messageTurns = container.querySelectorAll(this.selectors.MESSAGE_TURN);
    console.log(`[${this.platform}-Scraper] Found ${messageTurns.length} message turns`);

    for (const turn of messageTurns) {
      try {
        // Determine role based on content structure
        // Claude uses different structures for user vs assistant messages
        const isUserMessage = this.isUserMessage(turn);
        const role = isUserMessage ? 'user' : 'model';

        if (isUserMessage) {
          const userText = this.extractUserText(turn);
          const userMedia = this.extractUserMedia(turn);

          if (userText || userMedia) {
            messages.push(this.createMessage({
              role: 'user',
              content: userText,
              media: userMedia,
              turn_index: turnIndex,
            }));
          }
        } else {
          const modelText = this.extractModelText(turn);
          const modelMedia = this.extractModelMedia(turn);
          const previewDocs = await this.extractPreviewDocuments(turn);

          if (modelText || modelMedia || (previewDocs && previewDocs.length > 0)) {
            messages.push(this.createMessage({
              role: 'model',
              content: modelText,
              media: modelMedia,
              embedded_documents: previewDocs,
              turn_index: turnIndex,
            }));
          }
        }

        turnIndex++;
      } catch (error) {
        console.warn(`[${this.platform}-Scraper] Error parsing message turn ${turnIndex}:`, error);
      }
    }

    return messages;
  }

  /**
   * Determine if a turn is a user message
   * @param {Element} turn - Message turn element
   * @returns {boolean} True if user message
   */
  isUserMessage(turn) {
    // Claude marks user messages differently - look for specific indicators
    // This is a heuristic; adjust based on actual HTML structure
    const hasUserIndicator = turn.querySelector('[data-is-user="true"]');
    if (hasUserIndicator) return true;

    // Fallback: check if it has preview buttons (only assistant messages have these)
    const hasPreviewButton = turn.querySelector(this.selectors.PREVIEW_BUTTON);
    return !hasPreviewButton; // If no preview button, likely user message
  }

  /**
   * Extract preview documents by clicking preview buttons
   * Similar to Gemini's immersive documents
   * @param {Element} modelTurnElement - The model turn element
   * @returns {Promise<Array|null>} Array of preview documents or null
   */
  async extractPreviewDocuments(modelTurnElement) {
    if (!modelTurnElement) return null;

    const previewButtons = modelTurnElement.querySelectorAll(this.selectors.PREVIEW_BUTTON);
    if (previewButtons.length === 0) return null;

    console.log(`[${this.platform}-Scraper] Found ${previewButtons.length} preview buttons`);
    const documents = [];

    for (const button of previewButtons) {
      try {
        // Get preview title from the artifact block
        const artifactBlock = button.querySelector(this.selectors.ARTIFACT_BLOCK);
        const titleEl = artifactBlock?.querySelector(this.selectors.PREVIEW_TITLE);
        const title = titleEl?.innerText.trim() || 'Preview Document';

        console.log(`[${this.platform}-Scraper] Processing preview: "${title}"`);

        // Click the preview button to open panel
        button.click();
        await this.sleep(2000);

        // Wait for preview panel to appear
        const panel = document.querySelector(this.selectors.PREVIEW_PANEL);
        if (panel) {
          let codeContent = null;

          // Try to find code block
          const codeBlock = panel.querySelector(this.selectors.PREVIEW_CODE);
          if (codeBlock) {
            codeContent = codeBlock.innerText || codeBlock.textContent;
          }

          // Fallback: get all text content from panel
          if (!codeContent) {
            console.log(`[${this.platform}-Scraper] Code block not found, extracting panel text`);
            codeContent = panel.innerText || panel.textContent;
          }

          if (codeContent) {
            console.log(`[${this.platform}-Scraper] Extracted ${codeContent.length} chars from preview`);
            documents.push({
              title: title,
              content: codeContent.trim(),
              source: 'preview_document',
              type: 'text/code'
            });
          }

          // Close panel - try multiple methods
          const closeButton = panel.querySelector('button[aria-label="Close"]') ||
                             panel.querySelector('button[aria-label="close"]') ||
                             panel.querySelector('.close-button');

          if (closeButton) {
            closeButton.click();
            await this.sleep(500);
          } else {
            // Fallback: press Escape
            const escEvent = new KeyboardEvent('keydown', {
              key: 'Escape',
              code: 'Escape',
              keyCode: 27,
              which: 27,
              bubbles: true
            });
            panel.dispatchEvent(escEvent);
            await this.sleep(500);
          }
        } else {
          console.warn(`[${this.platform}-Scraper] Preview panel not found after clicking button`);
        }
      } catch (err) {
        console.error(`[${this.platform}-Scraper] Error processing preview button:`, err);
      }
    }

    return documents.length > 0 ? documents : null;
  }
}

export default ClaudeScraper;
