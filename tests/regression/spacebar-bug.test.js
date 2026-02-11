/**
 * Regression Test: Spacebar Pan Mode State Management Bug
 *
 * Bug Description:
 * When spacebar was held during rectangle drawing and then mouse was released,
 * the `isSpacebarHeld` flag was incorrectly reset in handleMouseUp(), causing
 * the page to scroll when spacebar was released later.
 *
 * Root Cause:
 * handleMouseUp() was resetting isSpacebarHeld, but spacebar state should only
 * be managed by keydown/keyup events, not mouse events. The pan mode CSS class
 * was also being removed at the wrong time.
 *
 * Fix:
 * 1. Removed isSpacebarHeld reset from handleMouseUp()
 * 2. Made pan mode class removal independent of isCurrentlyDrawing state
 * 3. Only handleSpacebarUp() manages the isSpacebarHeld flag
 *
 * This test ensures the bug doesn't regress.
 */

QUnit.module("Regression: Spacebar Pan Mode Bug", {
  beforeEach: function() {
    // Reset all state variables
    isDrawingMode = false;
    isCurrentlyDrawing = false;
    isSpacebarHeld = false;
    currentRectangle = null;
    placedRectangles = [];
    startX = 0;
    startY = 0;

    // Clear any rectangles from previous tests
    var existingRects = document.querySelectorAll(".box-highlight-rectangle");
    existingRects.forEach(function(rect) {
      rect.parentNode.removeChild(rect);
    });

    // Remove any lingering CSS classes
    document.documentElement.classList.remove("box-highlight-drawing-mode");
    document.documentElement.classList.remove("box-highlight-pan-mode");
  },

  afterEach: function() {
    if (isDrawingMode) {
      disableDrawingMode();
    }
    // Clean up any test rectangles
    var rects = document.querySelectorAll(".box-highlight-rectangle");
    rects.forEach(function(rect) {
      rect.parentNode.removeChild(rect);
    });
    document.documentElement.classList.remove("box-highlight-pan-mode");
  }
});

QUnit.test("spacebar state preserved after mouseup during drawing", function(assert) {
  var done = assert.async();

  // Enable drawing mode (async)
  enableDrawingMode();

  setTimeout(function() {
    assert.ok(isDrawingMode, "drawing mode enabled");

    // Simulate mousedown to start drawing
    handleMouseDown({
      clientX: 100,
      clientY: 100,
      altKey: false,
      metaKey: false,
      ctrlKey: false,
      button: 0,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    assert.equal(isCurrentlyDrawing, true, "drawing started");
    assert.ok(currentRectangle, "rectangle created");

    // Press spacebar to enter pan mode during drawing
    handleSpacebarDown({
      key: " ",
      keyCode: 32,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    assert.equal(isSpacebarHeld, true, "pan mode active");
    assert.ok(
      document.documentElement.classList.contains("box-highlight-pan-mode"),
      "pan mode CSS class added"
    );

    // Release mouse while spacebar is still held
    // CRITICAL: This should NOT reset isSpacebarHeld
    handleMouseUp({
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    // ASSERTION: isSpacebarHeld should still be true
    assert.equal(
      isSpacebarHeld,
      true,
      "spacebar state preserved after mouseup (BUG FIX)"
    );

    // ASSERTION: Pan mode class should still be present
    assert.ok(
      document.documentElement.classList.contains("box-highlight-pan-mode"),
      "pan mode CSS class still present after mouseup"
    );

    // Now release spacebar - this should clear the state
    handleSpacebarUp({
      key: " ",
      keyCode: 32,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    assert.equal(isSpacebarHeld, false, "spacebar state cleared on keyup");
    assert.notOk(
      document.documentElement.classList.contains("box-highlight-pan-mode"),
      "pan mode CSS class removed on spacebar release"
    );

    done();
  }, 50);
});

QUnit.test("pan mode class removed independently of drawing state", function(assert) {
  var done = assert.async();

  enableDrawingMode();

  setTimeout(function() {
    // Start drawing
    handleMouseDown({
      clientX: 100,
      clientY: 100,
      altKey: false,
      metaKey: false,
      ctrlKey: false,
      button: 0,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    // Enter pan mode
    handleSpacebarDown({
      key: " ",
      keyCode: 32,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    assert.ok(
      document.documentElement.classList.contains("box-highlight-pan-mode"),
      "pan mode class added"
    );

    // Release mouse (stops drawing but spacebar still held)
    handleMouseUp({
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    assert.equal(isCurrentlyDrawing, false, "drawing stopped");
    assert.equal(isSpacebarHeld, true, "spacebar still held");

    // Pan mode class should still be present even though not drawing
    assert.ok(
      document.documentElement.classList.contains("box-highlight-pan-mode"),
      "pan mode class present even when not drawing (BUG FIX)"
    );

    // Release spacebar
    handleSpacebarUp({
      key: " ",
      keyCode: 32,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    assert.notOk(
      document.documentElement.classList.contains("box-highlight-pan-mode"),
      "pan mode class removed on spacebar release"
    );

    done();
  }, 50);
});

QUnit.test("spacebar press/release without drawing works correctly", function(assert) {
  var done = assert.async();

  enableDrawingMode();

  setTimeout(function() {
    // Press spacebar without drawing
    handleSpacebarDown({
      key: " ",
      keyCode: 32,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    assert.equal(isSpacebarHeld, true, "spacebar held without drawing");
    assert.ok(
      document.documentElement.classList.contains("box-highlight-pan-mode"),
      "pan mode class added without drawing"
    );

    // Release spacebar
    handleSpacebarUp({
      key: " ",
      keyCode: 32,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    assert.equal(isSpacebarHeld, false, "spacebar released");
    assert.notOk(
      document.documentElement.classList.contains("box-highlight-pan-mode"),
      "pan mode class removed"
    );

    done();
  }, 50);
});

QUnit.test("multiple spacebar press/release cycles during drawing", function(assert) {
  var done = assert.async();

  enableDrawingMode();

  setTimeout(function() {
    // Start drawing
    handleMouseDown({
      clientX: 100,
      clientY: 100,
      altKey: false,
      metaKey: false,
      ctrlKey: false,
      button: 0,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    // First spacebar cycle
    handleSpacebarDown({
      key: " ",
      keyCode: 32,
      preventDefault: function() {},
      stopPropagation: function() {}
    });
    assert.equal(isSpacebarHeld, true, "first press: spacebar held");

    handleSpacebarUp({
      key: " ",
      keyCode: 32,
      preventDefault: function() {},
      stopPropagation: function() {}
    });
    assert.equal(isSpacebarHeld, false, "first release: spacebar released");

    // Second spacebar cycle
    handleSpacebarDown({
      key: " ",
      keyCode: 32,
      preventDefault: function() {},
      stopPropagation: function() {}
    });
    assert.equal(isSpacebarHeld, true, "second press: spacebar held");

    handleSpacebarUp({
      key: " ",
      keyCode: 32,
      preventDefault: function() {},
      stopPropagation: function() {}
    });
    assert.equal(isSpacebarHeld, false, "second release: spacebar released");

    // Drawing should still be active
    assert.equal(isCurrentlyDrawing, true, "still drawing after spacebar cycles");

    done();
  }, 50);
});
