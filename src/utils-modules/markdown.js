/**
 * Markdown Conversion Module
 * Functions for converting scraping results to Markdown format
 */

import { escapeHtmlForMarkdown } from './html.js';
import { urlToBase64 } from './media.js';

/**
 * Generate a safe filename from platform and timestamp
 * @param {Object} result - Scraping result
 * @param {string} extension - File extension
 * @returns {string} Generated filename
 */
export function generateFilename(result, extension) {
  const platform = (result.platform || 'chat').toLowerCase().replace(/\s+/g, '-');
  const timestamp = new Date(result.timestamp || Date.now())
    .toISOString()
    .replace(/[:.]/g, '-')
    .split('T')[0];
  return `${platform}-export-${timestamp}.${extension}`;
}

/**
 * Convert scraped chat data to Markdown format with base64 embedded media
 * @param {Object} result - Scraping result object
 * @returns {Promise<string>} Markdown formatted string
 */
export async function convertToMarkdown(result) {
  let md = `# Chat Export - ${escapeHtmlForMarkdown(result.platform || 'Unknown Platform')}\n\n`;
  md += `**URL:** ${escapeHtmlForMarkdown(result.url)}\n`;
  md += `**Date:** ${new Date(result.timestamp).toLocaleString()}\n\n`;
  md += `---\n\n`;

  if (result.messages && result.messages.length > 0) {
    for (const msg of result.messages) {
      const role = msg.role === 'user' ? '👤 **User**' : (msg.role === 'assistant' ? '🤖 **Assistant**' : '🤖 **Model**');
      md += `${role}:\n\n`;

      // Handle both field name formats (content vs text)
      const messageText = msg.content || msg.text || '';
      // Escape HTML entities to prevent them from being rendered as HTML
      md += `${escapeHtmlForMarkdown(messageText)}\n\n`;

      // Handle uploaded files (both formats: uploaded_files vs uploadedFiles)
      const uploadedFiles = msg.uploaded_files || msg.uploadedFiles;
      if (uploadedFiles && uploadedFiles.length > 0) {
        md += `*Uploaded Files:*\n`;
        uploadedFiles.forEach(file => {
          md += `- [${file.type.toUpperCase()}] ${escapeHtmlForMarkdown(file.name)}\n`;
        });
        md += `\n`;
      }

      // Handle generated media with base64 embedding (both formats: media vs images)
      const media = msg.media || msg.images;
      if (media && media.length > 0) {
        md += `*Media:*\n`;
        for (const m of media) {
          // Handle different image object formats
          let mediaUrl = m.url || m.src;
          const base64Data = m.base64;

          // Use base64 if available, otherwise try to convert
          if (base64Data) {
            mediaUrl = base64Data;
          } else if (mediaUrl && (m.type === 'image' || !m.type)) {
            const base64 = await urlToBase64(mediaUrl);
            if (base64) mediaUrl = base64;
          }

          md += `![${escapeHtmlForMarkdown(m.name || m.alt || 'Image')}](${mediaUrl})\n`;
        }
        md += `\n`;
      }

      // Handle embedded documents
      if (msg.embedded_documents && msg.embedded_documents.length > 0) {
        md += `*Embedded Documents:*\n\n`;
        msg.embedded_documents.forEach(doc => {
          md += `### ${escapeHtmlForMarkdown(doc.title)}\n`;
          if (doc.content.includes('```')) {
            // Content already has code blocks, escape HTML entities
            md += `${escapeHtmlForMarkdown(doc.content)}\n\n`;
          } else {
            // Wrap in code block (content inside code blocks is auto-escaped)
            md += `\`\`\`${doc.type === 'text/markdown' ? 'markdown' : ''}\n${doc.content}\n\`\`\`\n\n`;
          }
        });
      }

      md += `---\n\n`;
    }
  } else {
    md += `*No messages found.*\n`;
  }

  return md;
}

export default {
  generateFilename,
  convertToMarkdown,
};
