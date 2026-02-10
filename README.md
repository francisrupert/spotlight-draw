# Box Highlight

A Chrome extension for highlighting element boxes on web pages. Perfect for developers and designers who need to visualize layout structures.

## Features

- ✏️ Draw custom rectangles anywhere on any webpage
- ⌨️ Activate with **Alt+C** keyboard shortcut (Option+C on Mac)
- 🎨 Orange border with 20% opacity orange background
- ⚡ Click-and-drag interface with spacebar repositioning
- 🔄 Press ESC to exit drawing mode
- 🔒 Privacy-focused (no data collection)
- 🚀 Lightweight and fast (Manifest V3)

## Quick Start

### Running Locally

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top-right corner)
4. Click **Load unpacked**
5. Select the `extension/` directory from this project
6. Open any webpage and press **Alt+C** to start drawing

For detailed instructions, see [Running the Extension Locally](docs/running-box-highlight-extension-locally.md).

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
│   ├── background.js       # Service worker
│   ├── content/            # Content scripts
│   │   ├── content.js      # Page interaction logic
│   │   └── content.css     # Highlighting styles
│   └── popup/              # Extension popup UI
│       ├── popup.html
│       ├── popup.js
│       └── popup.css
└── docs/                   # Documentation
    ├── plans/              # Project plans
    └── *.md                # Guides and documentation
```

## How It Works

1. Press **Alt+C** (Option+C on Mac) to activate drawing mode
2. Your cursor changes to a crosshair
3. Click and drag anywhere on the page to draw a rectangle
4. **Hold Spacebar** while dragging to reposition the rectangle without resizing
5. Release spacebar to continue resizing
6. Release mouse to place the rectangle
7. Click anywhere to clear and redraw a rectangle
8. Press **ESC** to exit drawing mode (clears rectangle and restores normal cursor)
9. Press **Alt+C** again to also exit drawing mode

No permanent page modifications are made—just visual overlays using positioned div elements.

## Documentation

- [Running Locally](docs/running-box-highlight-extension-locally.md) - Detailed setup guide
- [Development Plan](docs/plans/active/chrome-extension-scaffold.md) - Project roadmap and progress

## Browser Support

- Chrome (Manifest V3)
- Other Chromium-based browsers (Edge, Brave, etc.)

## License

MIT
