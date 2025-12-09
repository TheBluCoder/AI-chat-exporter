# Contributing to AI Chat Exporter

Thank you for your interest in contributing to AI Chat Exporter! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Adding New Scrapers](#adding-new-scrapers)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- Git
- A Chromium-based browser (Chrome, Edge, Brave, etc.) or Firefox

### Setup Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/ai-chat-exporter.git
cd ai-chat-exporter

# Install dependencies
npm install

# Load extension in browser
# Chrome: Navigate to chrome://extensions/, enable Developer Mode, click "Load unpacked"
# Firefox: Navigate to about:debugging, click "Load Temporary Add-on"
```

## Development Workflow

### Project Structure

```
src/
├── popup/          # Extension popup UI
├── content/        # Content scripts (message handlers)
├── scrapers/       # Platform-specific scrapers
├── utils/          # Shared utilities
└── lib/            # Third-party libraries
```

### Making Changes

1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our [coding standards](#coding-standards)

3. Test your changes thoroughly

4. Commit with a descriptive message:
   ```bash
   git commit -m "feat: add support for Platform X"
   ```

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Coding Standards

### JavaScript Style Guide

- Use ES6+ features
- Use `const` and `let`, never `var`
- Use arrow functions when appropriate
- Add JSDoc comments for functions
- Follow the DRY (Don't Repeat Yourself) principle
- Keep functions small and focused

### Example:

```javascript
/**
 * Extract messages from chat container
 * @param {Element} container - The chat container element
 * @returns {Array<Object>} Array of message objects
 */
function extractMessages(container) {
  const messages = [];
  // Implementation
  return messages;
}
```

### File Organization

- **Shared utilities** → `src/utils/utils.js`
- **Platform scrapers** → `src/scrapers/platform-name-scraper.js`
- **Content scripts** → `src/content/`
- **UI components** → `src/popup/`

### Naming Conventions

- **Files**: kebab-case (`gemini-scraper.js`)
- **Functions**: camelCase (`extractMessages`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Classes**: PascalCase (`MessageExtractor`)

## Adding New Scrapers

To add support for a new AI platform:

### 1. Create a New Scraper File

Create `src/scrapers/platform-name-scraper.js`:

```javascript
/**
 * Platform Name Scraper
 * Specialized scraper for Platform Name
 */

async function scrapePlatformName() {
  try {
    console.log("[PlatformName-Scraper] Starting scrape");

    // Wait for main container
    const container = await waitForElement(".chat-container");

    // Extract messages
    const messages = extractMessages(container);

    return {
      success: true,
      messages,
      count: messages.length,
      timestamp: new Date().toISOString(),
      url: location.href,
      platform: "Platform Name",
    };
  } catch (error) {
    console.error("[PlatformName-Scraper] Error:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      url: location.href,
    };
  }
}

// Export globally
if (typeof window !== 'undefined') {
  window.scrapePlatformName = scrapePlatformName;
}
```

### 2. Update the Router

Add platform detection in `src/scrapers/scraper-router.js`:

```javascript
const PLATFORM_CONFIG = {
  // ... existing platforms

  PLATFORM_NAME: {
    pattern: /^https:\/\/platform\.com\/chat\//,
    scraper: 'platform-name',
    name: 'Platform Name',
  },
};
```

Add scraper function mapping:

```javascript
function getScraperFunction() {
  const platform = detectPlatform();

  switch (platform.scraper) {
    // ... existing cases

    case 'platform-name':
      if (typeof scrapePlatformName !== 'undefined') {
        return scrapePlatformName;
      }
      return scrapeGeneric;
  }
}
```

### 3. Update Manifest

Add your scraper to `manifest.json`:

```json
{
  "content_scripts": [{
    "js": [
      "src/lib/browser-polyfill.js",
      "src/utils/utils.js",
      "src/scrapers/platform-name-scraper.js",
      "src/scrapers/scraper-router.js",
      // ... other scripts
    ]
  }]
}
```

### 4. Document Your Scraper

Create documentation in `docs/PLATFORM_NAME_SCRAPER_GUIDE.md` explaining:
- How the scraper works
- Platform-specific challenges
- Selectors used
- Known limitations

## Testing

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] Platform detection works correctly
- [ ] Messages are extracted completely
- [ ] Images/media are captured
- [ ] JSON export works
- [ ] Markdown export works
- [ ] PDF export works
- [ ] Works across different browsers (Chrome, Firefox, Edge)

### Testing Your Scraper

1. Navigate to the target platform
2. Open browser DevTools → Console
3. Click the extension icon
4. Click "Export Current Page"
5. Verify:
   - All messages extracted
   - Media captured correctly
   - No console errors
   - Export formats work

## Submitting Changes

### Pull Request Process

1. Update the README.md with details of changes if needed
2. Update documentation in `docs/` if needed
3. Ensure all tests pass
4. Update the version number in `package.json` and `manifest.json` (following [SemVer](https://semver.org/))

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested in Edge

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
```

## Getting Help

- Check existing [Issues](https://github.com/yourusername/ai-chat-exporter/issues)
- Read the [Documentation](docs/)
- Ask in [Discussions](https://github.com/yourusername/ai-chat-exporter/discussions)

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

---

Thank you for contributing to AI Chat Exporter!
