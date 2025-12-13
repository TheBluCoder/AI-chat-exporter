/**
 * Claude Platform Configuration
 * Selectors and settings specific to Claude's chat interface
 */

export const CLAUDE_CONFIG = {
  platform: 'Claude',

  selectors: {
    // Main container
    CONTAINER: 'main',
    CHAT_CONTAINER: 'main',

    // Message elements
    MESSAGE_TURN: 'div[data-test-render-count]', // Each turn has this attribute
    USER_CONTENT: 'div[data-is-streaming="false"]', // User message container
    MODEL_CONTENT: 'div[data-is-streaming="false"]', // Model message container

    // Text content
    USER_TEXT: 'p',
    MODEL_TEXT: 'p',

    // Preview/Artifact elements (similar to Gemini's immersive docs)
    PREVIEW_BUTTON: '[aria-label="Preview contents"]',
    ARTIFACT_BLOCK: '.artifact-block-cell',
    PREVIEW_PANEL: 'div[role="dialog"]', // Preview panel that appears
    PREVIEW_CODE: 'pre.code-block__code', // Code content in preview
    PREVIEW_TITLE: '.leading-tight', // Title of the preview

    // Images
    UPLOADED_IMG: 'img',
    GENERATED_IMG: 'img',
  },

  scrollConfig: {
    maxAttempts: 50,
    delay: 1500,
    stabilityDelay: 500,
    stabilityTimeout: 8000,
  },
};

export default CLAUDE_CONFIG;
