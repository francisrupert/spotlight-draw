# Box Highlight

A Chrome extension for highlighting element boxes on web pages. Perfect for developers and designers who need to visualize layout structures.

## Features

- ✏️ Draw custom rectangles anywhere on any webpage
- ⌨️ Activate with **Alt+A** keyboard shortcut (Option+A on Mac)
- 🎨 Customizable colors and border sizes via options page
- 🛡️ Complete interaction blocking: prevents all clicks, hovers, and text selection while drawing
- ⚡ Click-and-drag interface with modifier keys:
  - **Alt**: Draw from center outward
  - **Spacebar**: Reposition while drawing (cursor hidden)
  - **Cmd/Ctrl (drawing)**: Constrain to horizontal/vertical axis
  - **Cmd/Ctrl (over rectangle)**: Shows default cursor on hover; click and drag to reposition (cursor hidden while dragging, hold Shift to constrain axis)
  - **Alt (over rectangle)**: Shows copy cursor on hover; click and drag to duplicate (cursor hidden while dragging, hold Shift to constrain axis)
  - **Shift**: Multi-rectangle mode
  - **Tab**: Cycle through colors (orange → green → blue → purple → gray)
  - **Delete/Backspace**: Remove rectangle under cursor
- 🔄 Press ESC to exit drawing mode
- ⚙️ Configurable settings with auto-save (border size: 0.5px-3px, default color)
- 🔒 Privacy-focused (no data collection, settings sync across devices)
- 🚀 Lightweight and fast (Manifest V3)

## Quick Start

### Running Locally

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top-right corner)
4. Click **Load unpacked**
5. Select the `extension/` directory from this project
6. Open any webpage and press **Alt+A** to start drawing

For detailed instructions, see [Running the Extension Locally](docs/running-box-highlight-extension-locally.md).

### Configuring Settings

Access the options page to customize your experience:

1. Right-click the extension icon and select **Options**, OR
2. Go to `chrome://extensions`, find **Box Highlight**, and click **Options**

**Available settings:**

- **Border Size**: Choose between 0.5px, 1px (default), 2px, or 3px
- **Default Color**: Set your preferred starting color (orange, green, blue, purple, or gray)

Settings save automatically and sync across all your Chrome devices.

### Development

```bash
# Package extension for distribution
npm run zip

# Package with generic filename (for testing)
npm run zip:latest

# Clean build artifacts
npm run clean
```

#### Setting Up Icons

The extension includes a browser-based icon converter:

1. Open `extension/icons/convert-icon.html` in your browser
2. Download all three PNG sizes (16×16, 48×48, 128×128)
3. Save them in `extension/icons/` directory
4. Reload the extension in Chrome

See [extension/icons/README.md](extension/icons/README.md) for alternative methods.

## Project Structure

```text
box-highlight/
├── extension/              # Extension source code
│   ├── manifest.json       # Extension manifest (Manifest V3)
│   ├── tokens.css          # Shared color design tokens
│   ├── background.js       # Service worker
│   ├── content/            # Content scripts
│   │   ├── content.js      # Page interaction logic
│   │   └── content.css     # Highlighting styles
│   ├── options/            # Settings page
│   │   ├── options.html    # Options UI
│   │   ├── options.js      # Options logic
│   │   └── options.css     # Options styling
│   └── icons/              # Extension icons
│       └── convert-icon.html
└── docs/                   # Documentation
    ├── plans/              # Project plans
    └── *.md                # Guides and documentation
```

## How It Works

1. Press **Alt+A** (Option+A on Mac) to activate drawing mode
2. Your cursor changes to a crosshair and the page becomes non-interactive
3. Click and drag anywhere on the page to draw a rectangle
4. **Hold Alt** while dragging to draw from center outward
5. **Hold Spacebar** while dragging to reposition the rectangle without resizing (cursor hidden)
6. **Hold Cmd/Ctrl** during drawing to constrain to horizontal or vertical axis
7. **Hold Shift** when starting a new draw to keep previous rectangles (multi-rectangle mode)
8. **Hold Cmd/Ctrl** and hover over a rectangle to see the default cursor, then click and drag to reposition (cursor hidden while dragging, hold Shift to constrain axis)
9. **Hold Alt** and hover over a rectangle to see the copy cursor, then click and drag to duplicate (cursor hidden while dragging, hold Shift to constrain axis)
10. **Press Tab** while hovering over a rectangle (or while drawing/dragging) to cycle through colors (orange → green → blue → purple → gray)
11. **Press Delete or Backspace** while hovering over a rectangle to remove it
12. Release spacebar/alt/cmd to continue normal resizing
13. Release mouse to place the rectangle
14. Click without Shift to clear all rectangles and draw a new one
15. Press **ESC** to exit drawing mode (clears all rectangles and restores normal cursor)
16. Press **Alt+A** again to also exit drawing mode

No permanent page modifications are made—just visual overlays using positioned div elements. While in drawing mode, all page interactions (clicks, hovers, text selection) are blocked to prevent accidental navigation.

## Documentation

- [Running Locally](docs/running-box-highlight-extension-locally.md) - Detailed setup guide
- [Development Plan](docs/plans/active/chrome-extension-scaffold.md) - Project roadmap and progress

## Browser Support

- Chrome (Manifest V3)
- Other Chromium-based browsers (Edge, Brave, etc.)

## License

MIT
