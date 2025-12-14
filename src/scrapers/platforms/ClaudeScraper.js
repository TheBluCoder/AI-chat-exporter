/**
 * Claude Scraper
 * Platform-specific scraper for Claude's chat interface
 * Extends BaseScraper with Claude-specific extraction logic
 * Handles preview panels (artifacts) and inline code blocks
 */

import { BaseScraper } from '../base/BaseScraper.js';
import { CLAUDE_CONFIG } from '../config/claude.config.js';
import { extractMedia } from '../../utils-modules/media.js';

export class ClaudeScraper extends BaseScraper {
  constructor() {
    super(CLAUDE_CONFIG);
  }

  /**
   * Wait for Claude's conversation container
   * Override to handle Claude's specific container structure
   * @returns {Promise<Element>}
   */
  async waitForContainer() {
    console.log(`[${this.platform}-Scraper] Waiting for container...`);

    const container = await this.waitForElement(this.selectors.CONVERSATION_CONTAINER, 10000);

    if (!container) {
      const broader = await this.waitForElement('[data-testid="chat-input-grid-container"]', 5000);
      if (broader) {
        console.warn('[${this.platform}-Scraper] Using body as fallback container');
        return document.body;
      }
      throw new Error('Could not find chat container');
    }

    console.log(`[${this.platform}-Scraper] Chat container found`);
    await this.sleep(this.scrollConfig.stabilityDelay || 1000);
    return container;
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

    const messageNodes = container.querySelectorAll(this.selectors.MESSAGE_TURN);
    console.log(`[${this.platform}-Scraper] Found ${messageNodes.length} message nodes`);

    for (const node of messageNodes) {
      try {
        // Extract user message
        const userQuery = node.querySelector(this.selectors.USER_QUERY);
        if (userQuery) {
          const userText = this.extractUserText(userQuery);

          // Extract user uploaded images
          // Images are in a parent group element that contains both images and the message
          const userMessageGroup = node.querySelector(this.selectors.USER_MESSAGE_GROUP);
          let userMedia = null;

          if (userMessageGroup) {
            const imagesContainer = userMessageGroup.querySelector(this.selectors.USER_IMAGES_CONTAINER);
            if (imagesContainer) {
              userMedia = extractMedia(imagesContainer);
              if (userMedia && userMedia.length > 0) {
                console.log(`[${this.platform}-Scraper] Found ${userMedia.length} user uploaded image(s)`);
                // Mark as user-uploaded rather than generated
                userMedia.forEach(m => m.source = 'uploaded');
              }
            }
          }

          if (userText || userMedia) {
            messages.push(this.createMessage({
              role: "user",
              content: userText,
              media: userMedia,
              turn_index: turnIndex,
            }));
          }
        }

        // Extract model response
        const modelResponse = node.querySelector(this.selectors.MODEL_RESPONSE);
        if (modelResponse) {
          const modelText = await this.extractModelTextWithPreviews(modelResponse);

          if (modelText) {
            messages.push(this.createMessage({
              role: "model",
              content: modelText,
              turn_index: turnIndex,
            }));
          }
        }

        turnIndex++;
      } catch (error) {
        console.warn(`[${this.platform}-Scraper] Error parsing message node ${turnIndex}:`, error);
      }
    }

    return messages;
  }

  /**
   * Extract model text including inline code blocks and preview panels
   * All code is formatted as markdown code blocks in the content
   * @param {Element} modelResponseElement - Model response element
   * @returns {Promise<string>} Extracted text with code blocks
   */
  async extractModelTextWithPreviews(modelResponseElement) {
    if (!modelResponseElement) return '';

    // Clone to avoid modifying DOM
    const clone = modelResponseElement.cloneNode(true);

    // Extract preview panel codes FIRST and store them
    const previewDivs = modelResponseElement.querySelectorAll(this.selectors.ARTIFACT_PREVIEW_DIV);
    const previewCodesMap = new Map();

    if (previewDivs.length > 0) {
      console.log(`[${this.platform}-Scraper] Found ${previewDivs.length} preview panels`);

      // Extract code for each preview panel
      for (let i = 0; i < previewDivs.length; i++) {
        const div = previewDivs[i];
        const code = await this.extractSinglePreviewCode(div);
        if (code) {
          previewCodesMap.set(i, code);
        }
      }
    }

    // Now replace preview buttons in the clone with their extracted code
    const clonePreviewDivs = clone.querySelectorAll(this.selectors.ARTIFACT_PREVIEW_DIV);
    clonePreviewDivs.forEach((div, index) => {
      const code = previewCodesMap.get(index);
      if (code) {
        // Replace the preview button with the markdown code block
        div.replaceWith(document.createTextNode('\n\n' + code + '\n\n'));
      } else {
        // If extraction failed, just remove the button
        div.remove();
      }
    });

    // Process inline code blocks in the clone
    const codeBlocks = clone.querySelectorAll('.code-block__code');
    codeBlocks.forEach(codeBlock => {
      const codeEl = codeBlock.querySelector('code');
      if (!codeEl) return;

      // Extract language from class (e.g., "language-python" -> "python")
      const codeClass = codeEl.getAttribute('class') || '';
      const languageMatch = codeClass.match(/language-(\w+)/);
      const language = languageMatch ? languageMatch[1] : '';

      // Get code content
      const codeContent = codeEl.innerText || codeEl.textContent;

      // Create markdown code block
      const markdownBlock = `\n\`\`\`${language}\n${codeContent}\n\`\`\`\n`;

      // Replace the code block element with markdown text
      codeBlock.replaceWith(document.createTextNode(markdownBlock));
    });

    // Get the text content
    let text = clone.innerText.trim();

    return text;
  }

  /**
   * Extract code from a single preview panel by clicking it
   * @param {Element} previewDiv - Preview button element
   * @returns {Promise<string|null>} Markdown-formatted code block or null
   */
  async extractSinglePreviewCode(previewDiv) {
    try {
      const titleEl = previewDiv.querySelector('.line-clamp-1');
      const title = titleEl ? titleEl.textContent.trim() : 'Code';

      console.log(`[${this.platform}-Scraper] Clicking preview: "${title}"`);

      // Click to open panel
      previewDiv.click();
      await this.sleep(2000);

      // Find the code block in the panel - must use querySelectorAll to avoid
      // matching inline code blocks in the main conversation
      // The panel's code block has unique styling: !rounded-none, min-h-full, etc.
      const allCodeBlocks = document.querySelectorAll(this.selectors.ARTIFACT_CONTENT);
      let panelCodeEl = null;

      // Find the code block that's within the panel (has full-height styling)
      for (const codeBlock of allCodeBlocks) {
        const classList = codeBlock.className || '';
        // Panel code blocks have specific classes that inline blocks don't
        if (classList.includes('min-h-full') || classList.includes('!rounded-none')) {
          panelCodeEl = codeBlock;
          break;
        }
      }

      if (panelCodeEl) {
        const codeEl = panelCodeEl.querySelector('code');
        if (codeEl) {
          // Extract language
          const codeClass = codeEl.getAttribute('class') || '';
          const languageMatch = codeClass.match(/language-(\w+)/);
          const language = languageMatch ? languageMatch[1] : '';

          // Get code content
          const codeContent = codeEl.innerText || codeEl.textContent;

          // Format as markdown with title comment
          const markdownBlock = `\`\`\`${language}\n# ${title}\n${codeContent}\n\`\`\``;

          console.log(`[${this.platform}-Scraper] Extracted ${codeContent.length} chars of ${language} code`);

          // Close panel
          const closeBtn = document.querySelector(this.selectors.ARTIFACT_CLOSE_BUTTON);
          if (closeBtn) {
            closeBtn.click();
          } else {
            const escEvent = new KeyboardEvent('keydown', {
              key: 'Escape',
              code: 'Escape',
              keyCode: 27,
              which: 27,
              bubbles: true
            });
            document.dispatchEvent(escEvent);
          }

          await this.sleep(1000);

          return markdownBlock;
        }
      }

      console.warn(`[${this.platform}-Scraper] Panel code block not found after clicking preview`);
      return null;
    } catch (err) {
      console.error(`[${this.platform}-Scraper] Error processing preview:`, err);
      return null;
    }
  }
}

export default ClaudeScraper;
