/**
 * Google Gemini Scraper
 * Platform-specific scraper for Gemini's active chat interface
 * Extends BaseScraper with Gemini-specific extraction logic
 */

import { BaseScraper } from '../base/BaseScraper.js';
import { GEMINI_CONFIG } from '../config/gemini.config.js';
import { getMediaType } from '../../utils-modules/mime.js';
import { extractMedia } from '../../utils-modules/media.js';

// Constants
const CONTAINER_WAIT_TIMEOUT_MS = 10000;
const DEFAULT_STABILITY_DELAY_MS = 500;
const CHIP_PANEL_OPEN_DELAY_MS = 800;  // Reduced from 2000ms
const EDITOR_WAIT_DELAY_MS = 600;       // Reduced from 1500ms
const PANEL_CLOSE_DELAY_MS = 300;       // Reduced from 500ms
const USER_FILE_PANEL_DELAY_MS = 800;   // Reduced from 2000ms
const USER_FILE_CLOSE_DELAY_MS = 400;   // Reduced from 800ms
const MIN_BACKTICKS = 3;
const BACKTICK_INCREMENT = 1;

export class GeminiScraper extends BaseScraper {
  constructor() {
    super(GEMINI_CONFIG);
  }

  /**
   * Determine safe code-fence width for nested backticks in code content.
   * @param {string} content
   * @returns {string}
   */
  getBacktickWrapper(content) {
    if (!content) return '```';
    const backtickMatches = content.match(/`+/g);
    let maxBackticks = 0;
    if (backtickMatches) {
      maxBackticks = Math.max(...backtickMatches.map(m => m.length));
    }
    return '`'.repeat(Math.max(MIN_BACKTICKS, maxBackticks + BACKTICK_INCREMENT));
  }

  /**
   * Wait for Gemini's specific container
   * Override to handle Gemini's nested container structure
   * @returns {Promise<Element>}
   */
  async waitForContainer() {
    const chatApp = await this.waitForElement(this.selectors.CHAT_CONTAINER, CONTAINER_WAIT_TIMEOUT_MS);
    if (!chatApp) {
      throw new Error('Could not find chat app container');
    }

    // Additional wait for rendering
    await this.sleep(this.scrollConfig.stabilityDelay || DEFAULT_STABILITY_DELAY_MS);

    let container = chatApp.querySelector(this.selectors.CONVERSATION_CONTAINER);
    if (!container) {
      container = chatApp;
    }

    return container;
  }

  /**
   * Extract all messages from the Gemini conversation
   * Override to handle Gemini's message-set structure and embedded documents
   * @param {Element} container - Conversation container
   * @returns {Promise<Array>} Array of message objects
   */
  async extractAllMessages(container) {
    const messages = [];
    let turnIndex = 0;

    const messageSets = container.querySelectorAll(this.selectors.MESSAGE_TURN);

    if (messageSets.length > 0) {
      for (const messageSet of messageSets) {
        try {
          // Extract user query
          const userQuery = messageSet.querySelector(this.selectors.USER_QUERY);
          if (userQuery) {
            const userText = this.extractUserText(userQuery);
            const uploadedFiles = this.extractUploadedFiles(userQuery);
            const userDocs = await this.extractUserUploadedDocuments(userQuery);

            if (userText || uploadedFiles || (userDocs && userDocs.length > 0)) {
              messages.push(this.createMessage({
                role: "user",
                content: userText,
                uploaded_files: uploadedFiles,
                embedded_documents: userDocs,
                turn_index: turnIndex,
              }));
            }
          }

          // Extract model response
          const modelResponse = messageSet.querySelector(this.selectors.MODEL_RESPONSE);
          if (modelResponse) {
            const modelText = this.extractModelText(modelResponse);
            const modelMedia = extractMedia(modelResponse);
            const embeddedDocs = await this.extractImmersiveDocuments(modelResponse);

            if (modelText || (embeddedDocs && embeddedDocs.length > 0)) {
              messages.push(this.createMessage({
                role: "model",
                content: modelText,
                media: modelMedia,
                embedded_documents: embeddedDocs,
                turn_index: turnIndex,
              }));
            }
          }

          turnIndex++;
        } catch (error) {
          console.warn(`[${this.platform}-Scraper] Error parsing message set ${turnIndex}:`, error);
        }
      }
    } else {
      // Fallback extraction method
      const userQueries = Array.from(container.querySelectorAll(this.selectors.USER_QUERY));
      const modelResponses = Array.from(container.querySelectorAll(this.selectors.MODEL_RESPONSE));

      const maxLength = Math.max(userQueries.length, modelResponses.length);

      for (let i = 0; i < maxLength; i++) {
        try {
          if (i < userQueries.length) {
            const userQuery = userQueries[i];
            const userText = this.extractUserText(userQuery);
            const uploadedFiles = this.extractUploadedFiles(userQuery);
            const userDocs = await this.extractUserUploadedDocuments(userQuery);

            if (userText || uploadedFiles || (userDocs && userDocs.length > 0)) {
              messages.push(this.createMessage({
                role: "user",
                content: userText,
                uploaded_files: uploadedFiles,
                embedded_documents: userDocs,
                turn_index: i,
              }));
            }
          }

          if (i < modelResponses.length) {
            const modelResponse = modelResponses[i];
            const modelText = this.extractModelText(modelResponse);
            const modelMedia = extractMedia(modelResponse);
            const embeddedDocs = await this.extractImmersiveDocuments(modelResponse);

            if (modelText || (modelMedia && modelMedia.length > 0)) {
              messages.push(this.createMessage({
                role: "model",
                content: modelText,
                media: modelMedia,
                embedded_documents: embeddedDocs,
                turn_index: i,
              }));
            }
          }
        } catch (error) {
          console.warn(`[${this.platform}-Scraper] Error in fallback parsing at index ${i}:`, error);
        }
      }
    }

    return messages;
  }

  /**
   * Extract uploaded files from user query
   * @param {Element} userQueryElement - The user-query element
   * @returns {Array|null} Array of file objects or null
   */
  extractUploadedFiles(userQueryElement) {
    if (!userQueryElement) return null;

    const files = [];
    const seenFiles = new Set();

    // Find all uploaded file previews
    const fileElements = userQueryElement.querySelectorAll(this.selectors.UPLOADED_FILE);

    fileElements.forEach((fileEl) => {
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
            url: null,
          });
        }
      }
    });

    // Extract uploaded images with URLs
    const imgElements = userQueryElement.querySelectorAll(this.selectors.UPLOADED_IMG);

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
   * Extract text from user query
   * Override to handle Gemini-specific file preview removal
   * @param {Element} userQueryElement - The user-query element
   * @returns {string} Extracted text content
   */
  extractUserText(userQueryElement) {
    return this.extractTextFromElement(userQueryElement, {
      contentSelector: this.selectors.USER_QUERY_CONTENT || this.selectors.USER_BUBBLE,
      removeSelectors: [
        '.screen-reader-user-query-label',
        '.cdk-visually-hidden',
        this.selectors.FILE_PREVIEW,
        '[data-test-id="uploaded-file"]',
        '[data-test-id="uploaded-img"]',
        'button'
      ],
    });
  }

  /**
   * Extract model text while preserving code blocks as fenced markdown.
   * Gemini often renders code visually, so plain innerText can flatten it.
   * @param {Element} modelResponseElement
   * @returns {string}
   */
  extractModelText(modelResponseElement) {
    if (!modelResponseElement) return '';

    const contentRoot = modelResponseElement.querySelector(this.selectors.MESSAGE_CONTENT) || modelResponseElement;
    const clone = contentRoot.cloneNode(true);

    // Remove UI controls that should not be exported as message text.
    clone.querySelectorAll('button, [role="button"][aria-label], .cdk-visually-hidden').forEach((el) => el.remove());

    // Convert rendered code blocks to markdown fences before extracting text.
    clone.querySelectorAll('pre').forEach((pre) => {
      const codeEl = pre.querySelector('code');
      const codeContent = (codeEl ? codeEl.innerText : pre.innerText || '').trimEnd();
      if (!codeContent) {
        pre.remove();
        return;
      }

      const classNames = ((codeEl?.getAttribute('class')) || pre.getAttribute('class') || '');
      const langMatch = classNames.match(/language-([\w+-]+)/i);
      const language = langMatch ? langMatch[1] : '';
      const ticks = this.getBacktickWrapper(codeContent);
      const fenced = `\n${ticks}${language}\n${codeContent}\n${ticks}\n`;
      pre.replaceWith(document.createTextNode(fenced));
    });

    // Fallback: inline code blocks that may not be nested in <pre>.
    clone.querySelectorAll('code').forEach((code) => {
      const text = (code.innerText || code.textContent || '').trim();
      if (!text) {
        code.remove();
        return;
      }
      code.replaceWith(document.createTextNode(`\`${text}\``));
    });

    return clone.innerText.trim();
  }

  /**
   * Extract content from immersive embedded documents (chips)
   * @param {Element} modelResponseElement - The model-response element
   * @returns {Promise<Array|null>} Array of embedded documents or null
   */
  async extractImmersiveDocuments(modelResponseElement) {
    if (!modelResponseElement) return null;

    const chips = modelResponseElement.querySelectorAll(this.selectors.IMMERSIVE_CHIP);
    if (chips.length === 0) return null;

    const documents = [];

    for (const chip of chips) {
      try {
        const title = chip.innerText.trim() || "Embedded Document";

        // Click the chip to open the panel
        const lightButton = chip.querySelector('button, [role="button"], .button');
        if (lightButton) {
          lightButton.click();
        } else {
          chip.click();
        }

        // Wait for panel - check if already present first
        let panel = document.querySelector(this.selectors.IMMERSIVE_PANEL);
        if (!panel) {
          await this.sleep(CHIP_PANEL_OPEN_DELAY_MS);
          panel = document.querySelector(this.selectors.IMMERSIVE_PANEL);
        }
        if (panel) {
          let editor = panel.querySelector(this.selectors.IMMERSIVE_EDITOR);

          // Only wait if editor not found
          if (!editor) {
            await this.sleep(EDITOR_WAIT_DELAY_MS);
            editor = panel.querySelector(this.selectors.IMMERSIVE_EDITOR);
          }

          if (editor) {
            const content = editor.innerText || editor.textContent;
            if (content) {
              documents.push({
                title: title,
                content: content.trim(),
                source: 'immersive_document',
                type: 'text/markdown'
              });
            }
          } else {
            console.warn(`[${this.platform}-Scraper] Immersive editor not found in panel`);
          }

          // Close panel
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
            await this.sleep(PANEL_CLOSE_DELAY_MS);
          } else {
            const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true });
            panel.dispatchEvent(escEvent);
            await this.sleep(PANEL_CLOSE_DELAY_MS);
          }
        } else {
          console.warn(`[${this.platform}-Scraper] Immersive panel not found after clicking chip`);
        }
      } catch (err) {
        console.error(`[${this.platform}-Scraper] Error processing immersive chip:`, err);
      }
    }

    return documents.length > 0 ? documents : null;
  }

  /**
   * Extract user uploaded documents by clicking on them
   * @param {Element} userQueryElement - The user-query element
   * @returns {Promise<Array|null>} Array of extracted document objects
   */
  async extractUserUploadedDocuments(userQueryElement) {
    const documents = [];

    const carousel = userQueryElement.querySelector(this.selectors.USER_FILE_CAROUSEL);
    if (!carousel) return null;

    const fileButtons = carousel.querySelectorAll(this.selectors.USER_FILE_BUTTON);
    if (fileButtons.length === 0) return null;

    for (const button of fileButtons) {
      try {
        const fileName = button.getAttribute('aria-label') || 'Uploaded Document';

        button.click();

        // Check if panel already present before waiting
        let panel = document.querySelector(this.selectors.IMMERSIVE_PANEL);
        if (!panel) {
          await this.sleep(USER_FILE_PANEL_DELAY_MS);
          panel = document.querySelector(this.selectors.IMMERSIVE_PANEL);
        }

        if (panel) {
          let content = '';
          const driveViewerPre = panel.querySelector(this.selectors.DRIVE_VIEWER_TEXT);

          if (driveViewerPre) {
            content = driveViewerPre.textContent;
          } else {
            const editor = panel.querySelector(this.selectors.IMMERSIVE_EDITOR);
            if (editor) content = editor.textContent;
          }

          if (content) {
            documents.push({
              title: fileName,
              content: content,
              type: 'user_uploaded_document'
            });
          }

          const closeButton = panel.querySelector('button[aria-label="Close"], button.close-button');
          if (closeButton) {
            closeButton.click();
          } else {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
          }

          await this.sleep(USER_FILE_CLOSE_DELAY_MS);
        }
      } catch (err) {
        console.error(`[${this.platform}-Scraper] Error processing user file:`, err);
      }
    }

    return documents.length > 0 ? documents : null;
  }


  /**
   * Find the scroll container for the chat history
   * Override to start from USER_QUERY parent, then delegate to base class
   * @param {Element} startElement - The element to start the search from
   * @returns {Element|null} The scroll container element or null if not found
   */
  findScrollContainer(startElement) {
    // Gemini-specific: Start from USER_QUERY parent if available
    let geminiStartElement = startElement;
    const messageElement = startElement.querySelector(this.selectors.USER_QUERY);
    if (messageElement && messageElement.parentElement) {
      geminiStartElement = messageElement.parentElement;
    }

    // Use base class logic with Gemini-specific starting point
    return super.findScrollContainer(geminiStartElement);
  }
}

export default GeminiScraper;
