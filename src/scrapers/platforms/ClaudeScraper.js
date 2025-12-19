/**
 * Claude Scraper
 * Platform-specific scraper for Claude's chat interface
 * Extends BaseScraper with Claude-specific extraction logic
 * Handles preview panels (artifacts) and inline code blocks
 */

import { BaseScraper } from '../base/BaseScraper.js';
import { CLAUDE_CONFIG } from '../config/claude.config.js';
import { extractMedia } from '../../utils-modules/media.js';

// Constants
const MIN_BACKTICKS = 3;
const BACKTICK_INCREMENT = 1;
const PREVIEW_OPEN_DELAY_MS = 600;   // Reduced from 1500ms
const PREVIEW_CLOSE_DELAY_MS = 200;  // Reduced from 500ms
const PANEL_OPEN_DELAY_MS = 400;     // Reduced from 1000ms
const PANEL_CLOSE_DELAY_MS = 300;    // Reduced from 1000ms

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
        let container = document.body;
        const conversationContainer = document.querySelector(this.selectors.CONVERSATION_CONTAINER);
        if (conversationContainer) {
            container = conversationContainer;
        }
        else {
            container = document.querySelector(this.selectors.CHAT_CONTAINER);
        }

        return container;
    }

    /**
     * Determine the correct number of backticks to use for a code block
     * Ensures nested code blocks (like in markdown artifacts) are properly wrapped
     * @param {string} content - The code content to wrap
     * @returns {string} String of backticks (e.g., "```" or "````")
     */
    getBacktickWrapper(content) {
        if (!content) return '```';
        const backtickMatches = content.match(/`+/g);
        let maxBackticks = 0;
        if (backtickMatches) {
            maxBackticks = Math.max(...backtickMatches.map(m => m.length));
        }
        // Use at least 3, or max found + 1
        return '`'.repeat(Math.max(MIN_BACKTICKS, maxBackticks + BACKTICK_INCREMENT));
    }

    /**
     * Extract user message text with proper formatting
     * Overrides BaseScraper to handle code blocks, lists, and buttons
     * @param {Element} userQuery - User message element
     * @returns {string} Formatted user text
     */
    extractUserText(userQuery) {
        if (!userQuery) return '';

        // Clone to avoid modifying DOM
        const clone = userQuery.cloneNode(true);

        // Remove action buttons (Show more/less, etc.)
        clone.querySelectorAll('button').forEach(b => b.remove());

        // Remove line numbers
        if (this.selectors.LINE_NUMBERS) {
            clone.querySelectorAll(this.selectors.LINE_NUMBERS).forEach(el => el.remove());
        }

        // Process code blocks - convert to markdown format
        clone.querySelectorAll('.code-block__code').forEach(codeBlock => {
            const codeEl = codeBlock.querySelector('code');
            if (!codeEl) return;

            // Extract language from class if present
            const codeClass = codeEl.getAttribute('class') || '';
            const languageMatch = codeClass.match(/language-(\w+)/);
            const language = languageMatch ? languageMatch[1] : '';

            // Get code content
            const codeContent = codeEl.innerText || codeEl.textContent;

            // Create markdown code block with appropriate backticks
            const ticks = this.getBacktickWrapper(codeContent);
            const markdownBlock = `\n${ticks}${language}\n${codeContent}\n${ticks}\n`;

            // Replace the code block element with markdown text
            codeBlock.replaceWith(document.createTextNode(markdownBlock));
        });

        // Process ordered lists - convert to markdown numbered lists
        clone.querySelectorAll('ol').forEach(ol => {
            const items = ol.querySelectorAll('li');
            let listText = '\n';
            items.forEach((li, index) => {
                const text = li.innerText.trim();
                listText += `${index + 1}. ${text}\n`;
            });
            ol.replaceWith(document.createTextNode(listText));
        });

        // Process unordered lists - convert to markdown bullet lists
        clone.querySelectorAll('ul').forEach(ul => {
            const items = ul.querySelectorAll('li');
            let listText = '\n';
            items.forEach(li => {
                const text = li.innerText.trim();
                listText += `- ${text}\n`;
            });
            ul.replaceWith(document.createTextNode(listText));
        });

        // Process inline code elements - convert to markdown inline code
        clone.querySelectorAll('code:not(.code-block__code code)').forEach(code => {
            const text = code.innerText || code.textContent;
            code.replaceWith(document.createTextNode(`\`${text}\``));
        });

        // Get text content with preserved structure
        let text = clone.innerText.trim();

        // Clean up excessive newlines (more than 2 consecutive)
        text = text.replace(/\n{3,}/g, '\n\n');

        return text;
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
                const userPastedQuery = node.querySelector(this.selectors.USER_PASTED_QUERY);
                let userPastedText = '';
                if (userPastedQuery) {
                    console.log(`[${this.platform}-Scraper] Found user pasted query`);
                    userPastedText = await this.extractUserPastedText(userPastedQuery);
                }
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

                if (userPastedText) {
                    messages.push(this.createMessage({
                        role: "user",
                        content: userPastedText,
                        turn_index: turnIndex,
                    }));
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

    async extractUserPastedText(element) {
        if (!element) return '';
        console.log(`[${this.platform}-Scraper] Found user pasted query`);

        // Get fallback text from the thumbnail
        let fallbackText = '';
        const thumbnailTextEl = element.querySelector('p');
        if (thumbnailTextEl) {
            fallbackText = thumbnailTextEl.innerText.trim();
        }

        // First, check if a preview panel is already open (for static HTML files)
        const existingPreview = document.querySelector('[data-testid="close-file-preview"]');
        if (existingPreview) {
            console.log(`[${this.platform}-Scraper] Found existing open preview panel`);
            const previewContainer = existingPreview.closest('.flex-col');
            if (previewContainer) {
                const codeDiv = previewContainer.querySelector('.font-mono');
                if (codeDiv) {
                    const extractedText = codeDiv.innerText.trim();
                    if (extractedText) {
                        console.log(`[${this.platform}-Scraper] Successfully extracted from existing preview`);
                        return extractedText;
                    }
                }
            }
        }

        // Try to click the button to open preview (for live pages)
        try {
            const button = element.querySelector('button');
            if (!button) {
                console.warn(`[${this.platform}-Scraper] No button found in pasted element, using fallback`);
                return fallbackText || '[Pasted content - unable to extract]';
            }

            button.click();

            // Look for the close button - check if already present first
            let closeButton = document.querySelector('[data-testid="close-file-preview"]');
            if (!closeButton) {
                await this.sleep(PREVIEW_OPEN_DELAY_MS);
                closeButton = document.querySelector('[data-testid="close-file-preview"]');
            }
            if (!closeButton) {
                console.warn(`[${this.platform}-Scraper] Preview did not open after clicking, using fallback`);
                return fallbackText || '[Pasted content - unable to extract]';
            }

            // Navigate to preview container
            const previewContainer = closeButton.closest('.flex-col');
            if (!previewContainer) {
                console.warn(`[${this.platform}-Scraper] Preview container not found`);
                closeButton.click();
                return fallbackText || '[Pasted content - unable to extract]';
            }

            // Extract text from font-mono div
            const codeDiv = previewContainer.querySelector('.font-mono');
            if (!codeDiv) {
                console.warn(`[${this.platform}-Scraper] No content div found in preview`);
                closeButton.click();
                return fallbackText || '[Pasted content - unable to extract]';
            }

            const extractedText = codeDiv.innerText.trim();

            // Close the preview
            closeButton.click();
            await this.sleep(PREVIEW_CLOSE_DELAY_MS);

            if (!extractedText) {
                console.warn(`[${this.platform}-Scraper] Extracted text was empty, using fallback`);
                return fallbackText || '[Pasted content - unable to extract]';
            }

            console.log(`[${this.platform}-Scraper] Successfully extracted ${extractedText.length} chars from preview`);
            return extractedText;

        } catch (error) {
            console.error(`[${this.platform}-Scraper] Error extracting pasted text:`, error);
            // Try to close preview if it's open
            try {
                const closeBtn = document.querySelector('[data-testid="close-file-preview"]');
                if (closeBtn) closeBtn.click();
            } catch (e) { /* ignore */ }

            return fallbackText || '[Pasted content - unable to extract]';
        }
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

        // Remove line numbers from the clone
        if (this.selectors.LINE_NUMBERS) {
            clone.querySelectorAll(this.selectors.LINE_NUMBERS).forEach(el => el.remove());
        }

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

            // Create markdown code block with appropriate backticks
            const ticks = this.getBacktickWrapper(codeContent);
            const markdownBlock = `\n${ticks}${language}\n${codeContent}\n${ticks}\n`;

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

            // Wait for raw button if needed
            let rawButton = document.querySelector("button[data-testid='undefined-raw']");
            if (!rawButton) {
                await this.sleep(PANEL_OPEN_DELAY_MS);
                rawButton = document.querySelector("button[data-testid='undefined-raw']");
            }

            if (rawButton) {
                rawButton.click();
            }

            // Wait for code container if needed
            let codeblockContainer = document.querySelector("#wiggle-file-content");
            if (!codeblockContainer) {
                await this.sleep(PANEL_OPEN_DELAY_MS);
                codeblockContainer = document.querySelector("#wiggle-file-content");
            }

            const codeBlock = codeblockContainer?.querySelector(this.selectors.ARTIFACT_CONTENT);

            if (codeBlock) {
                const codeEl = codeBlock.querySelector('code');
                if (codeEl) {
                    // Clone to avoid modifying live DOM
                    const codeClone = codeEl.cloneNode(true);

                    // Remove line numbers
                    if (this.selectors.LINE_NUMBERS) {
                        codeClone.querySelectorAll(this.selectors.LINE_NUMBERS).forEach(el => el.remove());
                    }

                    // Extract language
                    const codeClass = codeEl.getAttribute('class') || '';
                    const languageMatch = codeClass.match(/language-(\w+)/);
                    const language = languageMatch ? languageMatch[1] : '';

                    // Get code content
                    const codeContent = codeClone.innerText || codeClone.textContent;

                    // Format as markdown with title comment, using safe backticks
                    const ticks = this.getBacktickWrapper(codeContent);
                    const markdownBlock = `${ticks}${language}\n# ${title}\n${codeContent}\n${ticks}`;

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

                    await this.sleep(PANEL_CLOSE_DELAY_MS);

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
