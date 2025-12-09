/**
 * Google Gemini Shared Chat Scraper
 * Specialized scraper for Gemini's shared conversation pages
 * Uses shared utilities from utils.js
 */

/**
 * Main scraping function for Gemini shared chat pages
 * @returns {Promise<Object>} Scraping result with messages and metadata
 */
async function scrapeGeminiSharedChat() {
    try {
        console.log("[Gemini-Shared] Starting scrape for:", location.href);

        // Wait for the main chat container
        const container = await waitForElement("section.share-viewer_chat-container", UTILS_CONFIG.ELEMENT_WAIT_TIMEOUT);
        console.log("[Gemini-Shared] Container found");

        // Allow time for dynamic content to render
        await new Promise((resolve) => setTimeout(resolve, UTILS_CONFIG.RENDER_DELAY));

        // Wait for content to stabilize
        await waitForStableContent(container, 500, 8000).catch(() => {
            console.warn("[Gemini-Shared] Content did not stabilize, proceeding anyway");
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
                    console.warn(`[Gemini-Shared] Error parsing turn ${index}:`, error);
                }
            });
        } else {
            // Fallback: extract all user queries and model responses in order
            console.log("[Gemini-Shared] Using fallback extraction method");
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
                    console.warn(`[Gemini-Shared] Error in fallback parsing at index ${index}:`, error);
                }
            });
        }

        console.log(`[Gemini-Shared] Successfully extracted ${messages.length} messages`);

        return {
            success: true,
            messages,
            count: messages.length,
            timestamp: new Date().toISOString(),
            url: location.href,
            platform: "Google Gemini (Shared)",
            containerFound: true,
        };

    } catch (error) {
        console.error("[Gemini-Shared] Scrape error:", error);

        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            url: location.href,
            platform: "Google Gemini (Shared)",
            containerFound: false,
            debug_info: {
                body_preview: document.body?.innerHTML?.substring(0, 500) || null,
                available_selectors: getAvailableSelectors(),
            },
        };
    }
}

// Make scraper available globally (used by router)
if (typeof window !== 'undefined') {
    window.scrapeGeminiSharedChat = scrapeGeminiSharedChat;
}
