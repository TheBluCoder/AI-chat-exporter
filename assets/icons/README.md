# Extension Icons

This directory contains the official PNG icon files for the browser extension.

## Icon Files

The extension uses the following icon sizes:

- **icon-16.png** - 16x16px - Toolbar icon (small)
- **icon-32.png** - 32x32px - Toolbar icon (retina displays)
- **icon-48.png** - 48x48px - Extension management page
- **icon-128.png** - 128x128px - Chrome Web Store & larger displays

## Usage

These icons are referenced in `manifest.json`:

```json
{
  "icons": {
    "16": "assets/icons/icon-16.png",
    "32": "assets/icons/icon-32.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  },
  "action": {
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "32": "assets/icons/icon-32.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  }
}
```

## File Format

- **Format:** PNG with transparency
- **Color depth:** 24-bit or 32-bit with alpha channel
- **Optimized:** Yes, for web distribution

## Notes

- Icons are already created and configured
- Do not modify or replace without testing across all browsers
- Test visibility on both light and dark browser themes
