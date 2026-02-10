# Chrome Extension Scaffold (Active Plan)

This document tracks the plan and progress for scaffolding the Box Highlight Chrome extension in this repository.

## Status Overview

- Base extension structure is implemented under `extension/`.
- Manifest V3 is configured with popup, background, and content script.
- Popup UI, content script behavior, and basic styling are in place.
- Essential tooling is complete: `package.json`, `.gitignore`, and root `README.md`.
- **PIVOT (2026-02-10):** Redesigning core functionality from "highlight all elements" to "draw custom rectangles on page"

## Core Functionality (Updated)

The extension now focuses on **interactive rectangle drawing**:

1. **Activation:** User presses **Shift+C** to enter "drawing mode" (no popup UI)
2. **Draw rectangle:** Click and drag anywhere on the page to draw a rectangle
3. **Single rectangle:** Only one rectangle at a time; new draw replaces previous
4. **Clear:** Press ESC to remove the rectangle
5. **Deactivate:** Press Shift+C again to exit drawing mode
6. **Visual style:** Orange border (2px solid) with 20% opacity orange background
7. **User feedback:** Crosshair cursor when drawing mode is active

## Milestones and Progress

- [x] Requirements and stack decisions
  - Use Manifest V3 targeting Chrome/Chromium.
  - Plain JavaScript with ES modules style where helpful; no bundler yet.
  - Include three entrypoints: popup, background service worker, and content script.

- [x] Directory and manifest design
  - Extension placed under `extension/` to avoid interfering with other code.
  - `manifest.json` configured with:
    - `action.default_popup`: `popup/popup.html`.
    - `background.service_worker`: `background.js`.
    - `content_scripts`: `content/content.js` and `content/content.css` on `http`/`https` URLs.
    - `permissions`: `activeTab`.

- [x] Initial implementation scaffold (v1 - element highlighting)
  - Original implementation: highlighted all page elements with orange outlines
  - **Status:** Being replaced with new drawing-based functionality

- [ ] Interactive rectangle drawing (v2 - current focus)
  - `extension/content/content.js` will handle:
    - Drawing mode activation/deactivation
    - Mouse event listeners (mousedown, mousemove, mouseup) for rectangle drawing
    - Rectangle creation and positioning with absolute positioning
    - ESC key handler to clear all rectangles
    - Cursor style management (crosshair when active)
  - `extension/content/content.css` will style:
    - Rectangle appearance: orange border + 20% opacity orange background
    - Drawing mode cursor changes
    - Z-index management to keep rectangles visible
  - `extension/popup/popup.js` sends toggle message to activate/deactivate drawing mode
  - `extension/popup/popup.html` and `popup.css` remain mostly unchanged

- [x] Tooling and developer experience
  - `package.json` added at repo root with scripts:
    - `npm run zip`: Creates versioned zip file (e.g., `box-highlight-0.1.0.zip`)
    - `npm run zip:latest`: Creates generic `box-highlight-latest.zip` for testing
    - `npm run clean`: Removes all `.zip` build artifacts
  - `.gitignore` added to exclude node_modules, build artifacts, and OS files.
  - Root `README.md` added with project overview, quick start, and documentation links.

- [x] Documentation
  - This document serves as the initial plan and progress tracker.
  - Basic usage has been defined:
    - Load `extension/` as an unpacked extension.
    - Open any `http`/`https` page.
    - Use the popup button to toggle highlighting on and off.

## Next Steps

### Priority 2: Polish and Quality ✅ COMPLETE

1. **Add extension icons**:
   - ✅ Created SVG source icon (`extension/icons/icon.svg`)
   - ✅ Created browser-based PNG converter (`extension/icons/convert-icon.html`)
   - ✅ Updated manifest with icons configuration
   - ✅ Added icons README with conversion instructions
   - Design: Blue background with orange box outlines (matches extension theme)

2. **Add LICENSE file**:
   - ✅ Added MIT License at repository root
   - Clarifies usage rights and permissions

### Priority 3: Feature Enhancements (Future)

1. **Keyboard shortcut for drawing mode**:
   - Add `commands` section to manifest
   - Quick activation without clicking popup (e.g., `Ctrl+Shift+D`)

2. **Rectangle persistence**:
   - Save drawn rectangles to `chrome.storage.local`
   - Restore rectangles when revisiting pages
   - Per-page memory with URL tracking

3. **Enhanced rectangle management**:
   - Click existing rectangle to delete it (instead of clearing all)
   - Drag to move existing rectangles
   - Resize handles on rectangle corners
   - Copy/paste rectangles

4. **Customization options**:
   - Options page for:
     - Rectangle color picker
     - Opacity slider
     - Border thickness
     - Default drawing mode (single vs. multiple rectangles)
   - Use `chrome.storage.sync` for cross-device settings

5. **Export/sharing**:
   - Export rectangle coordinates as JSON
   - Screenshot with rectangles overlay
   - Share annotated page via URL with rectangle data

6. **Build optimization** (if extension grows):
   - Introduce bundler (Vite/Webpack) for minification
   - Add TypeScript for type safety
   - Implement automated testing
