# Chrome Extension Scaffold (Active Plan)

This document tracks the plan and progress for scaffolding the Box Highlight Chrome extension in this repository.

## Status Overview

- Base extension structure is implemented under `extension/`.
- Manifest V3 is configured with popup, background, and content script.
- Popup UI, content script behavior, and basic styling are in place.
- Essential tooling is complete: `package.json`, `.gitignore`, and root `README.md`.
- Extension is fully functional and ready for local development and testing.

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

- [x] Initial implementation scaffold
  - `extension/manifest.json` defines name, version, description, action, background, and content scripts.
  - `extension/background.js` logs on install via `chrome.runtime.onInstalled`.
  - `extension/content/content.js` provides functional helpers to enable/disable/toggle a `box-highlight--enabled` class on `html` and listens for `TOGGLE_BOX_HIGHLIGHT` messages.
  - `extension/content/content.css` adds an outline to all elements when the `box-highlight--enabled` class is present.
  - `extension/popup/popup.html` defines a minimal popup that uses BEM-style classes.
  - `extension/popup/popup.js` wires the toggle button to send `TOGGLE_BOX_HIGHLIGHT` to the active tab.
  - `extension/popup/popup.css` provides simple, non-Tailwind styling for the popup.

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

1. **Persistent toggle state**:
   - Use `chrome.storage.local` to remember toggle state per-tab
   - Restore state when revisiting pages

2. **Keyboard shortcut**:
   - Add `commands` section to manifest
   - Allow quick toggle without clicking popup (e.g., `Ctrl+Shift+H`)

3. **Customization options**:
   - Add options page for:
     - Outline color picker
     - Outline thickness selector
     - Domain-specific enable/disable rules
   - Use `chrome.storage.sync` for cross-device settings

4. **Improved visual feedback**:
   - Badge text showing toggle state
   - Toast/notification when toggling
   - Different styles for different element types

5. **Build optimization** (if extension grows):
   - Introduce bundler (Vite/Webpack) for minification
   - Add TypeScript for type safety
   - Implement automated testing
