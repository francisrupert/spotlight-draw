# SpotlightDraw Extension - Test Suite

This directory contains the test suite for the SpotlightDraw Chrome Extension. Tests are written using **QUnit** and run directly in the browser without requiring Node.js or a build process.

## Running Tests

### Option 1: Using npm script (recommended)
```bash
npm test
```
This opens `tests/test-runner.html` in your default browser.

### Option 2: Manual
Open `tests/test-runner.html` directly in Chrome.

### Watching for Changes
After making code changes, simply refresh the test runner page in your browser to re-run all tests.

## Test Organization

```
tests/
├── test-runner.html          # QUnit test runner (open in browser)
├── lib/                      # Testing libraries
│   ├── qunit.js              # QUnit framework (v2.19.4)
│   ├── qunit.css             # QUnit styles
│   └── chrome-mock.js        # Chrome API mocks (chrome.storage, chrome.tabs)
├── unit/                     # Pure function tests
│   ├── helpers.test.js                  # Helper functions (getRectBounds, clampMouse, etc.)
│   └── spacing-guides-rendering.test.js # showSpacingGuides() DOM rendering
├── integration/              # User flow tests (to be added)
│   ├── drawing-flow.test.js
│   ├── duplication-flow.test.js
│   └── ...
└── regression/               # Bug-specific tests
    ├── spacebar-bug.test.js           # Spacebar pan mode state management
    └── duplication-offset-bug.test.js # Offset calculation with getRectBounds()
```

## Current Test Coverage

### ✅ Unit Tests (helpers.test.js)
- **getRectBounds()** - Extracts bounds from rectangle elements
- **clampMouse()** - Clamps mouse coordinates to viewport
- **applyAxisLock()** - Applies Shift key axis locking
- **removeColorClasses()** - Removes color classes from elements
- **resetDragState()** - Resets dragging state variables
- **getEvenSpacingTargets()** - Generates even spacing snap targets between rectangle pairs
- **updateHoverCursors()** - Updates cursor mode classes based on modifier keys and mouse position

### ✅ Unit Tests (spacing-guides-rendering.test.js)
- **showSpacingGuides()** - Renders visual guide lines for even spacing

### ✅ Regression Tests
- **Spacebar Pan Mode Bug** - Ensures spacebar state is not reset by mouseup
- **Duplication Offset Bug** - Ensures offset calculation uses correct variable references

## Writing New Tests

### Test File Structure
```javascript
QUnit.module("Feature Name", {
  beforeEach: function() {
    // Setup code - reset state, create elements
  },
  afterEach: function() {
    // Cleanup code - remove elements, disable modes
  }
});

QUnit.test("test description", function(assert) {
  // Arrange
  var element = document.createElement("div");

  // Act
  var result = functionUnderTest(element);

  // Assert
  assert.equal(result, expectedValue, "assertion message");
});
```

### Async Tests (for chrome.storage or setTimeout)
```javascript
QUnit.test("async operation", function(assert) {
  var done = assert.async();

  enableDrawingMode();

  setTimeout(function() {
    assert.ok(isDrawingMode, "mode enabled");
    done(); // Signal test completion
  }, 50);
});
```

### Event Simulation
```javascript
// Mouse event
handleMouseDown({
  clientX: 100,
  clientY: 200,
  altKey: false,
  metaKey: false,
  ctrlKey: false,
  button: 0,
  preventDefault: function() {},
  stopPropagation: function() {}
});

// Keyboard event
handleSpacebarDown({
  key: " ",
  keyCode: 32,
  preventDefault: function() {},
  stopPropagation: function() {}
});
```

## Test Guidelines

1. **Test Isolation** - Each test should be independent. Use `beforeEach`/`afterEach` to reset state.

2. **Descriptive Names** - Test names should clearly describe what's being tested:
   - ✅ "clamps negative coordinates to zero"
   - ❌ "test clampMouse"

3. **Arrange-Act-Assert** - Structure tests in three phases:
   - **Arrange**: Set up test data and state
   - **Act**: Call the function/trigger the behavior
   - **Assert**: Verify the result

4. **Cleanup** - Always clean up DOM elements and state in `afterEach`:
   ```javascript
   afterEach: function() {
     if (isDrawingMode) disableDrawingMode();
     var rects = document.querySelectorAll(".spotlight-draw-rectangle");
     rects.forEach(function(rect) { rect.parentNode.removeChild(rect); });
   }
   ```

5. **Chrome API Mocking** - `chrome-mock.js` provides stubs for:
   - `chrome.storage.sync.get/set`
   - `chrome.tabs.sendMessage`
   - `chrome.runtime.onMessage`

## Adding Tests to Test Runner

To include new test files, edit `test-runner.html`:

```html
<!-- Add after existing test scripts -->
<script src="unit/your-new-test.test.js"></script>
```

## Test Coverage Goals

- **Unit Tests**: 90%+ coverage for pure functions
- **Integration Tests**: 80%+ coverage for user flows
- **Regression Tests**: 100% coverage for fixed bugs

## Known Limitations

1. **No Headless Mode** - Tests must run in a browser. For CI/CD, consider adding Puppeteer (see main test plan).

2. **Global Scope** - Tests run in the same global scope as the extension code. Be careful with variable name collisions.

3. **Chrome Extension APIs** - We mock `chrome.*` APIs. Real extension behavior may differ slightly.

4. **Timing-Dependent Tests** - Some tests use `setTimeout` delays (50ms). If tests are flaky, increase delays.

## Troubleshooting

### Tests not loading
- Check browser console for JavaScript errors
- Verify all script paths in `test-runner.html` are correct
- Ensure `chrome-mock.js` loads before `content.js`

### Tests failing unexpectedly
- Clear browser cache and reload
- Check that state is being reset in `beforeEach`
- Verify DOM cleanup in `afterEach`

### Async tests timing out
- Ensure `done()` is called in all async test code paths
- Increase timeout in `setTimeout` if needed

## Future Enhancements

- [ ] Integration tests for full user flows
- [ ] Geometry calculation tests (snapping, viewport clamping)
- [ ] Color cycling tests
- [ ] Settings persistence tests
- [ ] Element inspection tests
- [ ] Headless test runner for CI/CD
- [ ] Code coverage reporting
