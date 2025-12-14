export const CLAUDE_CONFIG = {
    platform: 'Claude',

    selectors: {
        // Main container
        CONTAINER: 'div.flex-1.flex.flex-col.h-full', // Generic container
        CHAT_CONTAINER: 'div.flex-1.flex.flex-col.h-full', // Helper to find the chat

        // This is the specific container that holds the message list
        CONVERSATION_CONTAINER: 'div.flex-1.flex.flex-col.px-4.max-w-3xl.mx-auto.w-full.pt-1',

        // Message elements
        // Each message (user or model) seems to be wrapped in a div with data-test-render-count
        MESSAGE_TURN: 'div[data-test-render-count]',

        USER_QUERY: 'div[data-testid="user-message"]',
        USER_QUERY_CONTENT: 'div.font-user-message',

        // User uploaded images (appear before user message text)
        USER_MESSAGE_GROUP: 'div.mb-1.mt-6.group',
        USER_IMAGES_CONTAINER: 'div.gap-2.mx-0\\.5.mb-3.flex.flex-wrap.justify-end',

        MODEL_RESPONSE: 'div.font-claude-response',

        // Artifacts / Previews
        // The trigger is a div with role="button" and aria-label="Preview contents"
        ARTIFACT_PREVIEW_DIV: 'div[role="button"][aria-label="Preview contents"]',
        // The content is in a code block
        ARTIFACT_CONTENT: '.code-block__code',
        // The close button for the side panel
        ARTIFACT_CLOSE_BUTTON: 'button[aria-label="Close"][data-testid="wiggle-controls-actions-toggle"]',

        // Fallbacks / Other
        MODEL_TEXT: '.font-claude-response',
    },

    scrollConfig: {
        maxAttempts: 50,
        delay: 1500,
        stabilityDelay: 500,
        stabilityTimeout: 8000,
    },
};

export default CLAUDE_CONFIG;
