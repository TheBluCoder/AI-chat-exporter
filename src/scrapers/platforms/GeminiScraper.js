/**
 * Google Gemini Scraper
 * Platform-specific scraper for Gemini's active chat interface
 * Extends BaseScraper with Gemini-specific extraction logic
 */

import { BaseScraper } from '../base/BaseScraper.js';
import { GEMINI_CONFIG } from '../config/gemini.config.js';
import { getMediaType } from '../../utils-modules/mime.js';
import { extractMedia } from '../../utils-modules/media.js';

export class GeminiScraper extends BaseScraper {
  constructor() {
    super(GEMINI_CONFIG);
  }

  /**
   * Wait for Gemini's specific container
   * @returns {Promise<Element>}
   */
  async waitForContainer() {
    const chatApp = await this.waitForElement(this.selectors.CHAT_CONTAINER, 10000);
    if (!chatApp) {
      throw new Error('Could not find chat app container');
    }

    console.log(`[${this.platform}-Scraper] Chat app found`);

    // Additional wait for rendering
    await this.sleep(this.scrollConfig.stabilityDelay || 500);

    let container = chatApp.querySelector(this.selectors.CONVERSATION_CONTAINER);
    if (!container) {
      container = chatApp;
    }

    return container;
  }

  /**
   * Extract all messages from the Gemini conversation
   * @param {Element} container - Conversation container
   * @returns {Promise<Array>} Array of message objects
   */
  async extractAllMessages(container) {
    const messages = [];
    let turnIndex = 0;

    const messageSets = container.querySelectorAll(this.selectors.MESSAGE_TURN);

    if (messageSets.length > 0) {
      console.log(`[${this.platform}-Scraper] Found ${messageSets.length} message sets`);

      for (const messageSet of messageSets) {
        try {
          // Extract user query
          const userQuery = messageSet.querySelector(this.selectors.USER_QUERY);
          if (userQuery) {
            const userText = this.extractUserQueryText(userQuery);
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
            const modelText = this.extractModelResponseText(modelResponse);
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
      console.log(`[${this.platform}-Scraper] Using fallback extraction method`);

      const userQueries = Array.from(container.querySelectorAll(this.selectors.USER_QUERY));
      const modelResponses = Array.from(container.querySelectorAll(this.selectors.MODEL_RESPONSE));

      const maxLength = Math.max(userQueries.length, modelResponses.length);

      for (let i = 0; i < maxLength; i++) {
        try {
          if (i < userQueries.length) {
            const userQuery = userQueries[i];
            const userText = this.extractUserQueryText(userQuery);
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
            const modelText = this.extractModelResponseText(modelResponse);
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
   * Extract text content from user query
   * @param {Element} userQueryElement - The user-query element
   * @returns {string} Extracted text content
   */
  extractUserQueryText(userQueryElement) {
    if (!userQueryElement) return '';

    const contentContainer = userQueryElement.querySelector(this.selectors.USER_QUERY_CONTENT) ||
      userQueryElement.querySelector(this.selectors.USER_BUBBLE);

    if (!contentContainer) {
      return userQueryElement.innerText.trim();
    }

    // Clone to avoid modifying DOM
    const clone = contentContainer.cloneNode(true);

    // Remove file preview elements
    clone.querySelectorAll(this.selectors.FILE_PREVIEW).forEach(el => el.remove());
    clone.querySelectorAll('[data-test-id="uploaded-file"]').forEach(el => el.remove());
    clone.querySelectorAll('[data-test-id="uploaded-img"]').forEach(el => el.remove());
    clone.querySelectorAll('button').forEach(el => el.remove());

    return clone.innerText.trim();
  }

  /**
   * Extract text content from model response
   * @param {Element} modelResponseElement - The model-response element
   * @returns {string} Extracted text content
   */
  extractModelResponseText(modelResponseElement) {
    if (!modelResponseElement) return '';

    const messageContent = modelResponseElement.querySelector(this.selectors.MESSAGE_CONTENT);

    if (!messageContent) {
      return modelResponseElement.innerText.trim();
    }

    const clone = messageContent.cloneNode(true);
    clone.querySelectorAll('.action-button').forEach(el => el.remove());

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

    console.log(`[${this.platform}-Scraper] Found ${chips.length} immersive chips`);
    const documents = [];

    for (const chip of chips) {
      try {
        const title = chip.innerText.trim() || "Embedded Document";
        console.log(`[${this.platform}-Scraper] Processing chip: "${title}"`);

        // Click the chip to open the panel
        const lightButton = chip.querySelector('button, [role="button"], .button');
        if (lightButton) {
          lightButton.click();
        } else {
          chip.click();
        }

        // Wait for panel
        await this.sleep(2000);

        const panel = document.querySelector(this.selectors.IMMERSIVE_PANEL);
        if (panel) {
          let editor = panel.querySelector(this.selectors.IMMERSIVE_EDITOR);

          if (!editor) {
            console.log(`[${this.platform}-Scraper] Editor not found immediately, waiting...`);
            await this.sleep(1500);
            editor = panel.querySelector(this.selectors.IMMERSIVE_EDITOR);
          }

          if (editor) {
            const content = editor.innerText || editor.textContent;
            if (content) {
              console.log(`[${this.platform}-Scraper] Extracted ${content.length} chars from document`);
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
            await this.sleep(500);
          } else {
            const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true });
            panel.dispatchEvent(escEvent);
            await this.sleep(500);
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

    console.log(`[${this.platform}-Scraper] Found ${fileButtons.length} user uploaded files`);

    for (const button of fileButtons) {
      try {
        const fileName = button.getAttribute('aria-label') || 'Uploaded Document';
        console.log(`[${this.platform}-Scraper] Processing user file: "${fileName}"`);

        button.click();
        await this.sleep(2000);
        const panel = document.querySelector(this.selectors.IMMERSIVE_PANEL);

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
            console.log(`[${this.platform}-Scraper] Extracted ${content.length} chars from user file`);
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

          await this.sleep(800);
        }
      } catch (err) {
        console.error(`[${this.platform}-Scraper] Error processing user file:`, err);
      }
    }

    return documents.length > 0 ? documents : null;
  }
}

export default GeminiScraper;
