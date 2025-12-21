# Privacy Policy for AI Chat Exporter

**Last Updated:** December 20, 2024

## Overview

AI Chat Exporter is a browser extension that exports conversations from AI platforms (ChatGPT, Claude, and Google Gemini) to various formats (JSON, Markdown, PDF). This privacy policy explains how the extension handles your data.

## Data Collection

**We do not collect, store, or transmit any personal data.**

The AI Chat Exporter extension:
- ✅ Processes all data **locally** in your browser
- ✅ Does **not** send any data to external servers
- ✅ Does **not** track your usage or behavior
- ✅ Does **not** collect analytics or telemetry
- ✅ Does **not** use cookies or tracking technologies

## Data Processing

### What the extension accesses:
1. **Conversation Content**: The extension reads conversation text, code blocks, and messages from AI chat pages when you click "Export Current Page"
2. **Images and Media**: The extension converts images to base64 format for embedding in exported files
3. **Temporary Cache**: Exported data is cached locally in your browser for up to 12 hours to allow quick format switching

### How your data is used:
- All data processing happens **locally in your browser**
- Exported conversations are saved **only to your device** (downloads folder)
- Cached data is stored **only in your browser's local storage**
- **No data leaves your device** except when you manually save export files

## Permissions Explained

### activeTab
Grants temporary access to the current tab when you click the extension icon. Required to read conversation content from AI chat pages.

### scripting
Allows the extension to inject scripts into AI chat pages to extract conversation data from the page structure.

### storage
Allows the extension to temporarily cache exported data in your browser's local storage (up to 12 hours) for quick format switching.

### host_permissions
Allows the extension to fetch images from various CDN domains used by ChatGPT, Claude, and Gemini. Images are converted to base64 format for embedding in exports. All processing happens locally.

## Third-Party Services

This extension does **not** integrate with any third-party services, analytics platforms, or external APIs.

The extension only interacts with:
- **ChatGPT** (chatgpt.com, chat.openai.com)
- **Claude** (claude.ai)
- **Google Gemini** (gemini.google.com)

These interactions are read-only and occur only when you explicitly click "Export Current Page."

## Data Security

- All data processing occurs in your browser's secure sandbox environment
- No data is transmitted over the network (except loading images from AI platforms for base64 conversion)
- Exported files are saved directly to your device
- Cached data is stored using Chrome's secure storage API

## Children's Privacy

This extension does not knowingly collect data from anyone, including children under 13. Since we don't collect any data at all, there are no special provisions for children's data.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected by updating the "Last Updated" date at the top of this policy. Changes will be posted in the GitHub repository.

## Open Source

This extension is open source. You can review the complete source code at:
https://github.com/TheBluCoder/AI-chat-exporter

## Contact

If you have questions about this privacy policy or the extension:
- **Report issues**: https://github.com/TheBluCoder/AI-chat-exporter/issues
- **GitHub**: https://github.com/TheBluCoder

## Your Rights

Since we don't collect any data:
- There is no data to request, delete, or export
- You maintain full control over your exported files
- You can uninstall the extension at any time with no data remaining on our end (because we never had it)

---

**Summary**: AI Chat Exporter processes all data locally in your browser. We do not collect, store, transmit, or have access to any of your data. Your conversations and exports remain private and under your control.
