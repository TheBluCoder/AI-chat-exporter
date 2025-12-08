# AI Chat Exporter

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/yourusername/ai-chat-exporter)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Browser](https://img.shields.io/badge/browser-Chrome%20%7C%20Edge%20%7C%20Firefox%20%7C%20Safari-orange.svg)](#browser-compatibility)

> A powerful, browser-agnostic extension to export conversations from popular AI platforms including Google Gemini, Claude, ChatGPT, and Meta AI.

## ✨ Features

- 🚀 **Multi-Platform Support**: Export from Gemini, Claude, ChatGPT, and Meta AI
- 📦 **Multiple Export Formats**: JSON, Markdown, and PDF
- 🖼️ **Media Embedding**: Automatically embeds images as base64 in exports
- 📄 **Document Extraction**: Captures uploaded files and embedded documents
- 🌐 **Browser Agnostic**: Works on Chrome, Edge, Firefox, and Safari
- 🎨 **Modern UI**: Clean, dark-themed interface
- ⚡ **Fast & Efficient**: Optimized scraping with automatic scroll handling

## 🚀 Quick Start

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

## 🎯 Supported Platforms

| Platform | Active Chat | Shared Links | Status |
|----------|-------------|--------------|--------|
| **Google Gemini** | ✅ Full Support | ✅ Full Support | 🟢 Stable |
| **Claude** | 🚧 In Progress | 🚧 In Progress | 🟡 Planned |
| **ChatGPT** | 🚧 In Progress | 🚧 In Progress | 🟡 Planned |
| **Meta AI** | 🚧 In Progress | 🚧 In Progress | 🟡 Planned |

## 🏗️ Project Structure

```
ai-chat-exporter/
├── src/
│   ├── popup/              # Extension popup UI
│   │   ├── popup.html
│   │   └── popup.js
│   ├── content/            # Content scripts
│   │   └── content.js
│   ├── scrapers/           # Platform-specific scrapers
│   │   ├── gemini-scraper.js
│   │   ├── gemini-shared.js
│   │   ├── generic-scraper.js
│   │   └── scraper-router.js
│   ├── utils/              # Shared utilities
│   │   └── utils.js
│   └── lib/                # Third-party libraries
│       └── browser-polyfill.js
├── assets/
│   └── icons/              # Extension icons
├── docs/                   # Documentation
├── manifest.json           # Extension manifest
├── package.json
└── README.md
```

## 🛠️ Development

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

## 📖 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- [Technical Guide](docs/TECHNICAL_GUIDE.md) - Architecture and implementation details
- [Quickstart Guide](docs/QUICKSTART.md) - Getting started quickly
- [Setup Instructions](docs/SETUP_INSTRUCTIONS.md) - Detailed installation guide
- [Gemini Scraper Guide](docs/GEMINI_SCRAPER_GUIDE.md) - Gemini-specific scraping details
- [Router Guide](docs/ROUTER_GUIDE.md) - Platform detection system
- [Scraper Comparison](docs/SCRAPER_COMPARISON.md) - Comparing different scrapers

## 🌐 Browser Compatibility

This extension uses the WebExtensions API and is compatible with:

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | >= 88 | ✅ Full |
| Edge | >= 88 | ✅ Full |
| Firefox | >= 109 | ✅ Full |
| Safari | >= 14 | ⚠️ Requires conversion |

## 🔒 Privacy & Security

- **No Data Collection**: This extension does not collect or transmit any user data
- **Local Processing**: All scraping and exporting happens locally in your browser
- **No External Requests**: No data is sent to external servers
- **Open Source**: Full source code is available for audit

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Uses [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/) for future-proof compatibility
- Inspired by the need for portable AI conversation archives

## 📞 Support

- 🐛 [Report a Bug](https://github.com/yourusername/ai-chat-exporter/issues)
- 💡 [Request a Feature](https://github.com/yourusername/ai-chat-exporter/issues)
- 📧 [Contact](mailto:your.email@example.com)

## 🗺️ Roadmap

- [ ] Complete Claude scraper implementation
- [ ] Complete ChatGPT scraper implementation
- [ ] Complete Meta AI scraper implementation
- [ ] Add export templates customization
- [ ] Add conversation search/filter
- [ ] Add batch export functionality
- [ ] Add cloud storage integration (optional)
- [ ] Add conversation statistics dashboard

---

<p align="center">Made with ❤️ by the community</p>
