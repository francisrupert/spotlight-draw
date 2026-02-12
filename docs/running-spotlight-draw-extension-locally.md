# Running the SpotlightDraw Chrome Extension Locally

This document describes how to load and run the SpotlightDraw Chrome extension from this repository on your local machine.

## Prerequisites

- Google Chrome (or a Chromium-based browser that supports Manifest V3)
- A local clone of this repository

## Extension directory

The extension source lives under the `extension/` directory at the root of this project:

- `extension/manifest.json`
- `extension/tokens.css` (shared color design tokens)
- `extension/background.js`
- `extension/content/` (content script JavaScript and CSS)
- `extension/options/` (settings page HTML, CSS, and JavaScript)
- `extension/icons/` (extension icons)

You will point Chrome to this `extension/` directory when loading the extension.

## Loading the extension in Chrome

1. Open Chrome.
2. Navigate to `chrome://extensions` in the address bar.
3. In the top-right corner of the Extensions page, enable **Developer mode**.
4. Click the **Load unpacked** button.
5. In the folder picker dialog, select the `extension/` directory in this repository and confirm.
6. Verify that "SpotlightDraw" now appears in the list of installed extensions and is enabled.

If you prefer to work with relative paths:

- From the project root, the extension directory is: `./extension`

## Using the extension

1. Open any page served over `http` or `https`.
2. Press **Alt+A** (Option+A on Mac) to activate drawing mode.
3. Your cursor will change to a crosshair and the page becomes non-interactive.
4. Click and drag anywhere on the page to draw a rectangle.
5. **Press Tab** to cycle through colors (orange → green → blue → purple → gray).
6. **Hold Shift** when starting a new draw to keep previous rectangles (multi-rectangle mode).
7. **Hold Alt** while dragging to draw from center outward.
8. **Hold Spacebar** while dragging to reposition the rectangle.
9. **Hold Cmd/Ctrl** during drawing to constrain to horizontal or vertical axis.
10. **Hold Cmd/Ctrl** and drag over existing rectangle to reposition it.
11. **Hold Alt** and drag over existing rectangle to duplicate it.
12. While repositioning with Cmd/Ctrl, **press Alt** mid-drag to switch to duplicate mode.
13. **Press Delete/Backspace** while hovering over a rectangle to remove it.
14. Press **ESC** to exit drawing mode (clears all rectangles and restores normal cursor).
15. Press **Alt+A** again to also exit drawing mode.

## Configuring settings

Right-click the extension icon and select **Options** (or go to `chrome://extensions` → SpotlightDraw → Options) to access:

- **Border Size**: 0.5px, 1px (default), 2px, or 3px
- **Default Color**: Orange (default), green, blue, purple, or gray

Settings save automatically and sync across your Chrome devices.

## Reloading changes during development

When you modify files under `extension/` (such as content scripts, options page, or styles):

1. Save your changes in your editor.
2. Return to `chrome://extensions`.
3. Find the **SpotlightDraw** extension.
4. Click the **Reload** button (🔄) for the extension.
5. Refresh any open pages where you are testing the extension.

The updated code will now be active in Chrome. Note: Changes to JavaScript files require a full extension reload to take effect.
