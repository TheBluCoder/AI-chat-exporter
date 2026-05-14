# AI Chat Exporter 2.0.1 Release Notes

Release date: 2026-05-14

## Highlights

- Improved **ChatGPT export reliability** for long/virtualized chats:
  - Added virtualized-turn-aware extraction.
  - Added recovery sweeps to reduce skipped middle messages.
  - Improved scroll-root targeting for ChatGPT layouts.
- Improved **long-run UX**:
  - Added progress heartbeat updates from content script to popup during long exports.
  - Increased popup-side export wait windows to reduce false timeouts on heavy chats.
- Improved **code block fidelity** in Markdown exports:
  - Better code-language normalization from platform code headers.
  - Better preservation of fenced code blocks for ChatGPT and Gemini exports.
- Continued **architecture cleanup**:
  - Kept `content-script.js` as a thin bootstrap entrypoint.
  - Moved orchestration/message handling into `src/content/handler.js`.
  - Consolidated shared scraper helpers in `BaseScraper` and platform config aliases.

## Notes

- This release focuses on stabilization and output quality, especially for ChatGPT long conversations and Markdown code blocks.
- No breaking changes to export formats.
