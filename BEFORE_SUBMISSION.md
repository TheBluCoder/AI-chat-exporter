# Before Google Web Store Submission Checklist

## Critical: Replace Placeholder Values

### 1. Update manifest.json
**File:** `manifest.json`

✅ **Already Updated:**
- Author: `bluCoder`
- Homepage URL: `https://github.com/TheBluCoder/AI-chat-exporter`

### 2. Update popup.html
**File:** `src/popup/popup.html`

✅ **Already Updated:**
- GitHub icon link: `https://github.com/TheBluCoder/AI-chat-exporter`
- GitHub call-to-action link: `https://github.com/TheBluCoder/AI-chat-exporter`

❌ **Still Needs Updating:**

#### Line ~542 - How to Use Video Link:
```html
<a href="https://youtu.be/YOUR_VIDEO_ID" target="_blank" ...>
```
Replace `YOUR_VIDEO_ID` with your actual YouTube video ID after uploading tutorial.

**Example:** `https://youtu.be/dQw4w9WgXcQ`

---

## Required: Create Extension Icons

✅ **COMPLETED**

### Icon Files Created
- ✅ `assets/icons/icon-16.png` - 16x16 pixels
- ✅ `assets/icons/icon-32.png` - 32x32 pixels
- ✅ `assets/icons/icon-48.png` - 48x48 pixels
- ✅ `assets/icons/icon-128.png` - 128x128 pixels

### Manifest Updated
- ✅ Icon references added to `manifest.json`
- ✅ Toolbar icon configured
- ✅ Extension management icons configured

---

## Recommended: Create Tutorial Video

Create a "How to Use" tutorial video showing:
1. Installing the extension
2. Navigating to ChatGPT/Gemini/Claude
3. Clicking the extension icon
4. Exporting a conversation
5. Viewing exported files (JSON, MD, PDF)

Upload to YouTube and update the link in `popup.html` (line 497).

---

## Final Testing Checklist

Before submission, test the following:

### All Three Platforms
- [ ] ChatGPT conversation export works
- [ ] Gemini conversation export works
- [ ] Claude conversation export works

### Export Formats
- [ ] JSON export works and is valid
- [ ] Markdown export works and is readable
- [ ] PDF export works and prints correctly

### Media Handling
- [ ] User-uploaded images are preserved
- [ ] AI-generated images are preserved
- [ ] Embedded documents (Gemini) are extracted
- [ ] Code blocks (Claude artifacts) are extracted

### UI/UX
- [ ] Popup opens correctly
- [ ] Statistics display correctly
- [ ] GitHub link works
- [ ] Video tutorial link works (if video created)
- [ ] All buttons function properly

### Browser Compatibility
- [ ] Test in Chrome
- [ ] Test in Edge (optional but recommended)

---

## Google Web Store Submission Requirements

### Store Listing Information Needed:

1. **Detailed Description** (132-4000 characters)
   - Explain what the extension does
   - List supported platforms (ChatGPT, Gemini, Claude)
   - Mention export formats (JSON, MD, PDF)
   - Highlight privacy (all processing client-side)

2. **Screenshots** (1280x800 or 640x400)
   - Take 3-5 screenshots showing:
     - Extension popup interface
     - Export in action
     - Exported conversation examples
     - Different format exports

3. **Promotional Tile** (440x280)
   - Eye-catching graphic with extension name
   - Shows key features visually

4. **Category**
   - Recommended: "Productivity"

5. **Privacy Policy** (if collecting any data)
   - This extension doesn't collect data
   - Can state: "This extension processes all data locally and does not collect, store, or transmit any user data."

---

## Quick Replace Guide

✅ **Already Completed:**
1. ✅ Author name set to `bluCoder`
2. ✅ GitHub URLs updated to `https://github.com/TheBluCoder/AI-chat-exporter`
3. ✅ "Report Issue" button added with automatic diagnostic info

❌ **Still Needs Replacing:**
1. ❌ `YOUR_VIDEO_ID` → Your YouTube video ID (after uploading tutorial)

---

## Files Modified for Web Store Readiness

### Code Quality
✅ Removed all `console.log()` statements (kept `console.error` and `console.warn`)
✅ Extracted magic numbers to constants in `src/scrapers/base/constants.js`
✅ Cleaned up dead code
✅ Removed unused .ico files (converted to PNG)
✅ Updated .gitignore to exclude .claude/ and .ico files

### User-Facing Changes
✅ Added GitHub link in popup
✅ Added "How to Use" video link placeholder
✅ Added call-to-action to star on GitHub
✅ Added "Report Issue" button with auto-diagnostic info
✅ Updated manifest description
✅ Created GitHub issue template for bug reports

### Repository & Documentation
✅ Replace GitHub URLs with actual repository
✅ Create extension icons (PNG format)
✅ Updated README.md with correct URLs and info
✅ Updated assets/icons/README.md with icon documentation
✅ Added .github/ISSUE_TEMPLATE/bug_report.md

### Remaining Tasks
❌ Replace `YOUR_VIDEO_ID` with YouTube video ID (after uploading tutorial)
❌ Create tutorial video (optional but recommended)
❌ Final testing on all platforms (ChatGPT, Gemini, Claude)
❌ Take screenshots for Chrome Web Store listing

---

## Post-Submission

After your extension is approved:

1. Update README.md with Chrome Web Store link
2. Add installation instructions
3. Add screenshots to repository
4. Consider creating a demo GIF for the README
5. Share on social media / relevant communities

Good luck with your submission! 🚀
