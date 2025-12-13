/**
 * Google Gemini Platform Configuration
 * Selectors and settings specific to Gemini's active chat interface
 */

export const GEMINI_CONFIG = {
  platform: 'Google Gemini',

  selectors: {
    // Main container
    CONTAINER: 'chat-app',
    CHAT_CONTAINER: 'chat-app',
    CONVERSATION_CONTAINER: 'conversation-container',

    // Message elements
    MESSAGE_TURN: 'message-set',
    USER_QUERY: 'user-query',
    USER_QUERY_CONTENT: 'user-query-content',
    MODEL_RESPONSE: 'model-response',
    MESSAGE_CONTENT: 'message-content',

    // File/media elements
    UPLOADED_FILE: '[data-test-id="uploaded-file"]',
    UPLOADED_IMG: '[data-test-id="uploaded-img"]',
    FILE_PREVIEW: 'user-query-file-preview',

    // Alternative selectors for fallback
    USER_BUBBLE: '.user-query-bubble-with-background',
    MODEL_TEXT: '.model-response-text',

    // Immersive elements
    IMMERSIVE_CHIP: 'immersive-entry-chip',
    IMMERSIVE_PANEL: 'immersive-panel',
    IMMERSIVE_EDITOR: 'immersive-editor',

    // User Uploaded Documents
    USER_FILE_CAROUSEL: 'user-query-file-carousel',
    USER_FILE_BUTTON: '.new-file-preview-file',
    DRIVE_VIEWER_TEXT: 'pre.drive-viewer-text-page',
  },

  scrollConfig: {
    maxAttempts: 50,
    delay: 1500,
    stabilityDelay: 500,
    stabilityTimeout: 8000,
  },
};

export default GEMINI_CONFIG;
