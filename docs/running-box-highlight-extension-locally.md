# Running the Box Highlight Chrome Extension Locally

This document describes how to load and run the Box Highlight Chrome extension from this repository on your local machine.

## Prerequisites

- Google Chrome (or a Chromium-based browser that supports Manifest V3)
- A local clone of this repository

## Extension directory

The extension source lives under the `extension/` directory at the root of this project:

- `extension/manifest.json`
- `extension/background.js`
- `extension/content/` (content script JavaScript and CSS)
- `extension/popup/` (popup HTML, CSS, and JavaScript)

You will point Chrome to this `extension/` directory when loading the extension.

## Loading the extension in Chrome

1. Open Chrome.
2. Navigate to `chrome://extensions` in the address bar.
3. In the top-right corner of the Extensions page, enable **Developer mode**.
4. Click the **Load unpacked** button.
5. In the folder picker dialog, select the `extension/` directory in this repository and confirm.
6. Verify that "Box Highlight" now appears in the list of installed extensions and is enabled.

If you prefer to work with relative paths:

- From the project root, the extension directory is: `./extension`

## Using the extension

1. Open any page served over `http` or `https`.
2. In Chrome's toolbar, click the Extensions icon.
3. Pin **Box Highlight** if it is not already pinned.
4. Click the **Box Highlight** icon to open the popup.
5. In the popup, click the **Toggle highlight** button.
6. The page should show outlines around elements when highlighting is enabled; click the button again to toggle the highlighting off.

## Reloading changes during development

When you modify files under `extension/` (such as the popup, content script, or styles):

1. Save your changes in your editor.
2. Return to `chrome://extensions`.
3. Find the **Box Highlight** extension.
4. Click the **Reload** button for the extension.
5. Refresh any open pages where you are testing the extension if needed.

The updated code will now be active in Chrome.
