/**
 * HTML Utilities Module
 * HTML entity escaping and sanitization functions
 */

/**
 * Escape HTML entities for safe insertion into HTML
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
export function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape HTML entities to prevent them from being rendered as HTML in Markdown
 * Preserves code blocks (text between triple backticks) without escaping
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtmlForMarkdown(text) {
  if (!text) return '';

  // Split text by code blocks (triple backticks)
  const parts = [];
  let currentIndex = 0;
  const codeBlockRegex = /```[\s\S]*?```/g;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Escape text before the code block
    if (match.index > currentIndex) {
      const beforeBlock = text.substring(currentIndex, match.index);
      parts.push(beforeBlock
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;'));
    }

    // Keep code block as-is (no escaping)
    parts.push(match[0]);
    currentIndex = match.index + match[0].length;
  }

  // Escape remaining text after last code block
  if (currentIndex < text.length) {
    const remaining = text.substring(currentIndex);
    parts.push(remaining
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;'));
  }

  return parts.join('');
}

export default {
  escapeHtml,
  escapeHtmlForMarkdown,
};
