/**
 * Markdown Conversion Module
 * Functions for converting scraping results to Markdown format
 */

import { escapeHtmlForMarkdown } from './html.js';
import { urlToBase64 } from './media.js';

function normalizeFenceLanguage(label) {
  const raw = (label || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'c++' || raw === 'cpp') return 'cpp';
  if (raw === 'c#' || raw === 'csharp') return 'csharp';
  return raw.replace(/\s+/g, '');
}

function looksLikeCodeStart(line) {
  const text = (line || '').trim();
  if (!text) return false;
  return /^(#include|import\s+\w+|from\s+\w+\s+import|const\s+\w+|let\s+\w+|var\s+\w+|function\s+\w+|class\s+\w+|void\s+\w+|int\s+\w+|bool\s+\w+|if\s*\(|for\s*\(|while\s*\(|public\s+class|package\s+\w+)/.test(text);
}

function autoFenceLanguagePrefixedCode(text) {
  if (!text || text.includes('```')) return text;

  const lines = text.split('\n');
  if (lines.length < 2) return text;

  // Support outputs like "... flicker-free.C++" followed by code
  const firstLine = lines[0] || '';
  const inlineLanguageMatch = firstLine.match(/(?:^|\s)(C\+\+|CPP|Python|JavaScript|TypeScript|Java|Go|Rust|C#)\s*$/i);
  if (inlineLanguageMatch && looksLikeCodeStart(lines[1])) {
    const language = normalizeFenceLanguage(inlineLanguageMatch[1]);
    const trimmedFirstLine = firstLine.replace(/\s*(C\+\+|CPP|Python|JavaScript|TypeScript|Java|Go|Rust|C#)\s*$/i, '').trimEnd();
    const prefix = trimmedFirstLine ? `${trimmedFirstLine}\n\n` : '';
    const code = lines.slice(1).join('\n');
    return `${prefix}\`\`\`${language}\n${code}\n\`\`\``;
  }

  // Support outputs where first line is just "C++"
  const firstLabelMatch = firstLine.trim().match(/^(C\+\+|CPP|Python|JavaScript|TypeScript|Java|Go|Rust|C#)$/i);
  if (firstLabelMatch && looksLikeCodeStart(lines[1])) {
    const language = normalizeFenceLanguage(firstLabelMatch[1]);
    const code = lines.slice(1).join('\n');
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }

  return text;
}

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
export async function convertToMarkdown(result, options = {}) {
  const embedRemoteMedia = Boolean(options.embedRemoteMedia);
  let md = `# Chat Export - ${escapeHtmlForMarkdown(result.platform || 'Unknown Platform')}\n\n`;
  md += `**URL:** ${escapeHtmlForMarkdown(result.url)}\n`;
  md += `**Date:** ${new Date(result.timestamp).toLocaleString()}\n\n`;
  md += `---\n\n`;

  if (result.messages && result.messages.length > 0) {
    for (const msg of result.messages) {
      const role = msg.role === 'user' ? '👤 **User**' : (msg.role === 'assistant' ? '🤖 **Assistant**' : '🤖 **Model**');
      md += `${role}:\n\n`;

      // Handle both field name formats (content vs text)
      const messageText = autoFenceLanguagePrefixedCode(msg.content || msg.text || '');
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

          // Use base64 if already present, otherwise embed only when enabled
          if (base64Data) {
            mediaUrl = base64Data;
          } else if (embedRemoteMedia && mediaUrl && (m.type === 'image' || !m.type)) {
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
