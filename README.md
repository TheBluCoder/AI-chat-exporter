# AI Chat Exporter

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/yourusername/ai-chat-exporter)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Browser](https://img.shields.io/badge/browser-Chrome%20%7C%20Edge%20%7C%20Firefox%20%7C%20Safari-orange.svg)](#browser-compatibility)
[![Architecture](https://img.shields.io/badge/architecture-ES6%20Modules-brightgreen.svg)](docs/ES6_MIGRATION.md)

A powerful, browser-agnostic extension to export conversations from popular AI platforms including Google Gemini, Claude, ChatGPT, and Meta AI. Built with modern ES6 architecture for maximum extensibility and maintainability.

## Features

- **Multi-Platform Support**: Export from Gemini, Claude, ChatGPT, and Meta AI
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

#### Chrome / Edge
1. Download the latest release
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
| **Meta AI** | 🔄 Planned | 🔄 Planned | 🔄 Planned | Planned |

### Platform-Specific Features
- **Gemini**: Extracts uploaded documents, immersive editor content, and shared conversation links
- **ChatGPT**: Progressive scroll extraction for lazy-loaded conversations, code blocks, generated images
- **Claude**: Preview panel extraction (artifacts), code blocks with syntax highlighting

## Project Structure (v3.0 ES6 Architecture)

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

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-chat-exporter.git
cd ai-chat-exporter

# Install dependencies
npm install

# Lint code
npm run lint

# Format code
npm run format
```

### Building

```bash
# Create production build
npm run build

# Package for distribution
npm run package
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

- [Report a Bug](https://github.com/yourusername/ai-chat-exporter/issues)
- [Request a Feature](https://github.com/yourusername/ai-chat-exporter/issues)
- [Contact](mailto:your.email@example.com)

## Roadmap

### v3.0 (Current) ✅
- [x] ES6 modules architecture migration
- [x] Template method pattern with BaseScraper
- [x] Complete ChatGPT scraper implementation
- [x] Complete Gemini scraper implementation
- [x] Complete Claude scraper implementation
- [x] Preview/artifact extraction (Claude, Gemini)
- [x] 70% code reduction through shared utilities

### v3.1 (Planned)
- [ ] Complete Meta AI scraper implementation
- [ ] Enhance ChatGPT scraper for PDF file extraction
- [ ] Add Gemini shared links enhancement
- [ ] Add export templates customization

### v4.0 (Future)
- [ ] Conversation search/filter within extension
- [ ] Batch export functionality
- [ ] Cloud storage integration (optional)
- [ ] Conversation statistics dashboard
- [ ] Export scheduling/automation

---

Made with care by the community
