# AI Chat Exporter

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/TheBluCoder/AI-chat-exporter)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Browser](https://img.shields.io/badge/browser-Chrome%20%7C%20Edge%20%7C%20Firefox%20%7C%20Safari-orange.svg)](#browser-compatibility)
[![Architecture](https://img.shields.io/badge/architecture-ES6%20Modules-brightgreen.svg)](docs/ES6_MIGRATION.md)

A powerful, browser-agnostic extension to export conversations from popular AI platforms including Google Gemini, Claude, and ChatGPT. Built with modern ES6 architecture for maximum extensibility and maintainability.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-blue?logo=google-chrome)](https://chromewebstore.google.com/detail/ai-chat-exporter/dfkonbknfdohjkabbajhghecgjpbmphc)

## Features

- **Multi-Platform Support**: Export from Gemini, Claude, and ChatGPT
- **Multiple Export Formats**: JSON, Markdown, and PDF
- **Media Embedding**: Automatically embeds images as base64 in exports
- **Document Extraction**: Captures uploaded files, embedded documents, and preview panels
- **Browser Agnostic**: Works on Chrome, Edge, Firefox, and Safari
- **Modern UI**: Clean, dark-themed interface
- **Fast & Efficient**: Optimized scraping with automatic scroll handling
- **ES6 Modules**: Modern architecture with 70% less code duplication
- **Template Pattern**: Easily extensible for new platforms

## Quick Start

### Installation

#### Chrome Web Store (Recommended)
Install directly from the Chrome Web Store:

**[Install AI Chat Exporter](https://chromewebstore.google.com/detail/ai-chat-exporter/dfkonbknfdohjkabbajhghecgjpbmphc)**

Works on Chrome, Edge, Brave, and other Chromium-based browsers.

#### Manual Installation (Chrome / Edge)
1. Download the latest release from [GitHub](https://github.com/TheBluCoder/AI-chat-exporter/releases)
2. Open `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension folder

#### Firefox
1. Download the latest release
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file

#### Safari
1. Convert using Safari Web Extensions Converter
2. Build and run through Xcode

### Usage

1. Navigate to any supported AI chat page
2. Click the extension icon in your browser toolbar
3. Click "Export Current Page"
4. Choose your desired export format:
   - **Copy JSON**: Copy to clipboard
   - **Download JSON**: Save as JSON file
   - **Download MD**: Save as Markdown with embedded images
   - **Export PDF**: Print to PDF

## Supported Platforms

| Platform | Active Chat | Shared Links | Preview/Artifacts | Status |
|----------|-------------|--------------|-------------------|--------|
| **Google Gemini** | ✅ Full Support | ✅ Full Support | ✅ Immersive Docs | Stable |
| **ChatGPT** | ✅ Full Support | ❌ Not Yet | ✅ Image Generation | Stable |
| **Claude** | ✅ Full Support | ❌ Not Yet | ✅ Code Previews | Stable |

### Platform-Specific Features
- **Gemini**: Extracts uploaded documents, immersive editor content, and shared conversation links
- **ChatGPT**: Progressive scroll extraction for lazy-loaded conversations, code blocks, generated images
- **Claude**: Preview panel extraction (artifacts), code blocks with syntax highlighting (PDF extraction not yet supported)

## Project Structure (v1.0 ES6 Architecture)

```
ai-chat-exporter/
├── src/
│   ├── popup/                    # Extension popup UI
│   │   ├── popup.html
│   │   └── popup.js
│   ├── scrapers/
│   │   ├── base/
│   │   │   └── BaseScraper.js    # Abstract base class (template pattern)
│   │   ├── config/
│   │   │   ├── chatgpt.config.js # Platform selectors & settings
│   │   │   ├── gemini.config.js
│   │   │   └── claude.config.js
│   │   ├── platforms/
│   │   │   ├── ChatGPTScraper.js # Platform-specific implementations
│   │   │   ├── GeminiScraper.js
│   │   │   └── ClaudeScraper.js
│   │   └── init.js               # Platform detection & initialization
│   ├── utils-modules/            # Shared ES6 utilities
│   │   ├── html.js               # HTML escaping
│   │   ├── mime.js               # MIME type detection
│   │   ├── media.js              # Media handling
│   │   └── markdown.js           # Markdown conversion
│   ├── content-script.js         # Entry point (dynamic imports)
│   └── lib/
│       └── browser-polyfill.js   # Browser API compatibility
├── assets/
│   └── icons/                    # Extension icons
├── docs/                         # Documentation
│   ├── ES6_MIGRATION.md          # Architecture guide
│   ├── TECHNICAL_GUIDE.md
│   └── ...
├── manifest.json                 # Manifest V3
└── README.md
```

## Development

### No Build Required

This extension uses pure ES6 modules - **no build process required!**

```bash
# Clone the repository
git clone https://github.com/TheBluCoder/AI-chat-exporter.git
cd AI-chat-exporter

# Load in browser
# Chrome: chrome://extensions → "Load unpacked"
# Firefox: about:debugging → "Load Temporary Add-on"

# Make changes and reload - that's it!
```

## Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- **[ES6 Migration Guide](docs/ES6_MIGRATION.md)** - ⭐ NEW: Modern architecture, template pattern, extending scrapers
- [Technical Guide](docs/TECHNICAL_GUIDE.md) - Architecture and implementation details
- [Quickstart Guide](docs/QUICKSTART.md) - Getting started quickly
- [Setup Instructions](docs/SETUP_INSTRUCTIONS.md) - Detailed installation guide
- [Gemini Scraper Guide](docs/GEMINI_SCRAPER_GUIDE.md) - Gemini-specific scraping details
- [Router Guide](docs/ROUTER_GUIDE.md) - Platform detection system
- [Scraper Comparison](docs/SCRAPER_COMPARISON.md) - Comparing different scrapers

### For Developers

Want to add support for a new AI platform? See the [ES6 Migration Guide](docs/ES6_MIGRATION.md#adding-a-new-platform) for step-by-step instructions. With the new architecture, adding a platform requires only ~180 lines of code!

## Browser Compatibility

This extension uses the WebExtensions API and is compatible with:

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | >= 88 | Full |
| Edge | >= 88 | Full |
| Firefox | >= 109 | Full |
| Safari | >= 14 | Requires conversion |

## Privacy & Security

- **No Data Collection**: This extension does not collect or transmit any user data
- **Local Processing**: All scraping and exporting happens locally in your browser
- **No External Requests**: No data is sent to external servers
- **Open Source**: Full source code is available for audit

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with modern web technologies
- Uses [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/) for future-proof compatibility
- Inspired by the need for portable AI conversation archives

## Support

Found an issue? The extension includes a built-in "Report Issue" button that automatically collects diagnostic information.

- [Report a Bug](https://github.com/TheBluCoder/AI-chat-exporter/issues)
- [Request a Feature](https://github.com/TheBluCoder/AI-chat-exporter/issues)

**Like this extension?** ⭐ Star us on GitHub!

## Roadmap

### v1.0 (Current) ✅
- [x] ES6 modules architecture with template method pattern
- [x] Complete ChatGPT scraper (text, code blocks, generated images)
- [x] Complete Gemini scraper (uploaded documents, immersive docs, shared links)
- [x] Complete Claude scraper (artifacts, code blocks, preview panels)
- [x] Multiple export formats (JSON, Markdown, PDF)
- [x] Base64 media embedding
- [x] 70% code reduction through shared utilities
- [x] Cross-browser compatibility (Chrome, Edge, Firefox, Safari)
- [x] GitHub issue reporting integration

### v2.0 (Planned)
- [ ] Complete migration to TypeScript
- [ ] Type-safe scraper implementations
- [ ] Enhanced IDE support with full type inference
- [ ] Improved error handling with typed exceptions
- [ ] Build process optimization

### v3.0 (Future)
- [ ] PDF content extraction from ChatGPT (user-uploaded and AI-generated)
- [ ] PDF content extraction from Claude (user-uploaded)
- [ ] Extract other file formats uploaded by users (Word, Excel, TXT, etc.)
- [ ] Enhanced file metadata preservation
- [ ] Batch export functionality
- [ ] Conversation search/filter within extension

---

**Made with ❤️ by [bluCoder](https://github.com/TheBluCoder)**

[⭐ Star this repo](https://github.com/TheBluCoder/AI-chat-exporter) if you find it helpful!
