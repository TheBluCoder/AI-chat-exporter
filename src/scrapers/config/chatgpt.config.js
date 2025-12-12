/**
 * ChatGPT Platform Configuration
 * Selectors and settings specific to ChatGPT's interface
 */

export const CHATGPT_CONFIG = {
  platform: 'ChatGPT',

  selectors: {
    // Main container
    CONTAINER: 'main',
    CHAT_CONTAINER: 'main',

    // Turns (The atomic units of conversation)
    USER_TURN: 'article[data-turn="user"]',
    MODEL_TURN: 'article[data-turn="assistant"]',
    ARTICLE_TURN: 'article[data-turn]',

    // Content Containers (Where the actual stuff is)
    USER_CONTENT: '[data-message-author-role="user"]',
    MODEL_CONTENT: '[data-message-author-role="assistant"]',

    // Text Specifics
    USER_TEXT: '.whitespace-pre-wrap',
    MODEL_TEXT: '.markdown',

    // Images
    UPLOADED_IMG: 'img[alt="Uploaded image"]',
    GENERATED_IMG: 'img[alt="Generated image"]',

    // Fallbacks
    GENERIC_TEXT: '.text-message',
  },

  scrollConfig: {
    maxAttempts: 50,
    delay: 800,
    stabilityDelay: 500,
    stabilityTimeout: 10000,
    scrollIncrement: 0.8, // 80% of viewport height
  },
};

export default CHATGPT_CONFIG;
