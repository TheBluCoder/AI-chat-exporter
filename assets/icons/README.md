# Extension Icons

This directory contains icon files for the browser extension.

## Required Icons

The extension requires the following icon sizes:

- **icon-16.png** - 16x16px - Toolbar icon (small)
- **icon-32.png** - 32x32px - Toolbar icon (retina)
- **icon-48.png** - 48x48px - Extension management page
- **icon-128.png** - 128x128px - Chrome Web Store & larger displays

## Icon Guidelines

### Design Requirements
- **Simple & Clear**: Icon should be recognizable at 16x16px
- **Consistent Style**: Use the same design language across all sizes
- **High Contrast**: Ensure visibility on both light and dark backgrounds
- **Brand Identity**: Reflect the purpose (chat export, data archiving)

### Suggested Design Elements
- Chat bubble icon
- Download arrow
- Database/archive symbol
- AI/bot representation
- Document/file icon

### File Format
- **PNG format** with transparency
- **24-bit color** or **32-bit with alpha channel**
- Optimized for web (compressed but not lossy)

## Creating Icons

### Using Online Tools
1. [Figma](https://figma.com) - Professional design tool
2. [Canva](https://canva.com) - Easy icon creator
3. [IconScout](https://iconscout.com) - Free icon generator

### Using Code
```bash
# Example: Convert SVG to PNG at different sizes (requires ImageMagick)
convert icon.svg -resize 16x16 icon-16.png
convert icon.svg -resize 32x32 icon-32.png
convert icon.svg -resize 48x48 icon-48.png
convert icon.svg -resize 128x128 icon-128.png
```

## Temporary Development Icons

For development, you can use placeholder icons or generate simple colored squares:

```javascript
// Create a simple colored square as temporary icon
const canvas = document.createElement('canvas');
canvas.width = 128;
canvas.height = 128;
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#2196F3';
ctx.fillRect(0, 0, 128, 128);
ctx.fillStyle = '#fff';
ctx.font = 'bold 48px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('AI', 64, 64);
```

## Notes

- **Do not commit large icon files** to version control unnecessarily
- Optimize icons before final release using tools like [TinyPNG](https://tinypng.com)
- Test icons in both light and dark browser themes
