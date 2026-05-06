# AI Chat Exporter 2.0.0 Release Notes

Release date: 2026-05-06

## Highlights

- Added **Export Selected** workflow:
  - Select one message to export from that point to latest.
  - Select multiple messages to export only selected messages in original order.
- Added **privacy-first controls**:
  - Media embedding toggle (embed vs URL-only for MD/PDF).
  - Cache toggle (default off for persistent cache).
  - Optional broad media host access with explicit grant/revoke flow.
- Improved **reliability**:
  - Auto-recovery when content script receiver is missing (inject + retry once).
  - Better diagnostics and failure feedback in popup.
- Expanded **Gemini compatibility**:
  - Support on root Gemini routes (not only `/app/*`).
  - Improved guidance when no active Gemini conversation is detected.
- Improved export output quality:
  - Non-embedded PDF path now keeps plain URLs instead of markdown image tokens.
  - Gemini hidden screen-reader prefix text ("You said") is removed from user export text.

## Security and Privacy Improvements

- Narrow default host scope with optional broad access model.
- Added explicit permission lifecycle controls in UI.
- Disabled persistent full-export caching by default.

Special thanks to [InfoSpunj](https://github.com/InfoSpunj) for security and privacy hardening contributions.

## Notable Known Issue

- Claude artifact/preview extraction still has edge cases in some complex UI states.

