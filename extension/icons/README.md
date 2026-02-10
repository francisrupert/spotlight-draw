# Extension Icons

This directory contains the icons for the Box Highlight Chrome extension.

## Quick Start

### Option 1: Browser-Based Converter (Easiest)

1. Open `convert-icon.html` in your browser (it should have opened automatically)
2. Click each download button to save the PNG files:
   - `icon-16.png` (16×16)
   - `icon-48.png` (48×48)
   - `icon-128.png` (128×128)
3. Save all three files in this `icons/` directory
4. Reload the extension in Chrome to see the new icons

### Option 2: Use SVG Source

The source SVG file is `icon.svg`. You can:
- Edit it in any vector graphics editor (Figma, Illustrator, Inkscape)
- Export to PNG at the required sizes manually
- Use online converters like CloudConvert or Convertio

### Option 3: Create Custom Icons

If you want different icons:
1. Create PNG files at 16×16, 48×48, and 128×128 pixels
2. Name them `icon-16.png`, `icon-48.png`, and `icon-128.png`
3. Place them in this directory
4. The manifest is already configured to use them

## Icon Sizes Explained

- **16×16**: Shown in the browser toolbar (favicon)
- **48×48**: Used in the Extensions management page
- **128×128**: Used during installation and in the Chrome Web Store

## Current Design

The current icon design features:
- Blue background (#2196F3) - matches the popup button color
- Orange outlined box (#FF9800) - represents the highlighting feature
- Lighter inner outline (#FFB74D) - adds depth and visual interest
- Rounded corners for a modern look
