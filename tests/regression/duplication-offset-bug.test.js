/**
 * Regression Test: Duplication Offset Calculation Bug
 *
 * Bug Description:
 * When duplicating a rectangle via Alt+drag, the offset calculation was using
 * stale variable references (rectLeft, rectTop) instead of the bounds object
 * properties (b.left, b.top) returned by getRectBounds().
 *
 * Root Cause:
 * During refactoring, we replaced:
 *   var rectLeft = parseInt(rect.style.left, 10);
 * with:
 *   var b = getRectBounds(rect);
 *
 * But later code still referenced the old variable names:
 *   duplicateOffsetX = rectLeft - event.clientX;  // rectLeft is undefined!
 *
 * This caused undefined values to be used in offset calculations, breaking
 * duplication positioning.
 *
 * Fix:
 * Changed all references from rectLeft/rectTop to b.left/b.top after the
 * getRectBounds() refactoring.
 *
 * This test ensures the bug doesn't regress.
 */

QUnit.module("Regression: Duplication Offset Bug", {
  beforeEach: function() {
    // Reset state
    isDrawingMode = false;
    isDuplicating = false;
    duplicatingRectangle = null;
    duplicateOffsetX = 0;
    duplicateOffsetY = 0;
    duplicateStartX = 0;
    duplicateStartY = 0;
    placedRectangles = [];

    // Clear any existing rectangles
    var existingRects = document.querySelectorAll(".box-highlight-rectangle");
    existingRects.forEach(function(rect) {
      rect.parentNode.removeChild(rect);
    });

    document.documentElement.classList.remove("box-highlight-drawing-mode");
  },

  afterEach: function() {
    if (isDrawingMode) {
      disableDrawingMode();
    }
    // Clean up test rectangles
    var rects = document.querySelectorAll(".box-highlight-rectangle");
    rects.forEach(function(rect) {
      rect.parentNode.removeChild(rect);
    });
  }
});

QUnit.test("duplication offset calculation uses getRectBounds result correctly", function(assert) {
  var done = assert.async();

  enableDrawingMode();

  setTimeout(function() {
    // Create a placed rectangle to duplicate
    var original = createRectangle(100, 200, 150, 250);
    original.setAttribute("data-color-index", "0");
    original.classList.add("color-blue");
    document.body.appendChild(original);
    placedRectangles.push(original);

    // Verify original rectangle position
    var bounds = getRectBounds(original);
    assert.equal(bounds.left, 100, "original left position");
    assert.equal(bounds.top, 200, "original top position");

    // Simulate Alt+click inside the rectangle to start duplication
    handleMouseDown({
      clientX: 125, // Inside the rectangle (100 + 25)
      clientY: 225, // Inside the rectangle (200 + 25)
      altKey: true,
      metaKey: false,
      ctrlKey: false,
      button: 0,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    assert.equal(isDuplicating, true, "duplication mode started");
    assert.ok(duplicatingRectangle, "duplicate rectangle created");

    // CRITICAL: Offset calculation should use b.left/b.top, not stale rectLeft/rectTop
    // Expected offset: b.left - event.clientX = 100 - 125 = -25
    //                  b.top - event.clientY = 200 - 225 = -25
    assert.equal(
      duplicateOffsetX,
      -25,
      "X offset calculated correctly using b.left (BUG FIX)"
    );
    assert.equal(
      duplicateOffsetY,
      -25,
      "Y offset calculated correctly using b.top (BUG FIX)"
    );

    // CRITICAL: Start position for axis locking should use b.left/b.top
    assert.equal(
      duplicateStartX,
      100,
      "start X position uses b.left (BUG FIX)"
    );
    assert.equal(
      duplicateStartY,
      200,
      "start Y position uses b.top (BUG FIX)"
    );

    // Verify duplicate inherits color from original
    var colorIndex = duplicatingRectangle.getAttribute("data-color-index");
    assert.equal(colorIndex, "0", "color index copied from original");

    done();
  }, 50);
});

QUnit.test("duplication with mouse at rectangle top-left corner", function(assert) {
  var done = assert.async();

  enableDrawingMode();

  setTimeout(function() {
    // Create original at (300, 400)
    var original = createRectangle(300, 400, 450, 550);
    original.setAttribute("data-color-index", "1");
    document.body.appendChild(original);
    placedRectangles.push(original);

    // Alt+click exactly at top-left corner
    handleMouseDown({
      clientX: 300, // Exactly at left edge
      clientY: 400, // Exactly at top edge
      altKey: true,
      metaKey: false,
      ctrlKey: false,
      button: 0,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    // Offset should be zero when clicking at corner
    assert.equal(duplicateOffsetX, 0, "X offset is zero at corner");
    assert.equal(duplicateOffsetY, 0, "Y offset is zero at corner");
    assert.equal(duplicateStartX, 300, "start X matches corner");
    assert.equal(duplicateStartY, 400, "start Y matches corner");

    done();
  }, 50);
});

QUnit.test("duplication with mouse at rectangle bottom-right corner", function(assert) {
  var done = assert.async();

  enableDrawingMode();

  setTimeout(function() {
    // Create original: left=100, top=200, width=50, height=50
    // Bottom-right corner: (150, 250)
    var original = createRectangle(100, 200, 150, 250);
    original.setAttribute("data-color-index", "2");
    document.body.appendChild(original);
    placedRectangles.push(original);

    // Alt+click at bottom-right corner
    handleMouseDown({
      clientX: 150, // Right edge
      clientY: 250, // Bottom edge
      altKey: true,
      metaKey: false,
      ctrlKey: false,
      button: 0,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    // Offset calculation: b.left - clientX = 100 - 150 = -50
    //                     b.top - clientY = 200 - 250 = -50
    assert.equal(duplicateOffsetX, -50, "X offset correct at bottom-right");
    assert.equal(duplicateOffsetY, -50, "Y offset correct at bottom-right");
    assert.equal(duplicateStartX, 100, "start X still uses top-left");
    assert.equal(duplicateStartY, 200, "start Y still uses top-left");

    done();
  }, 50);
});

QUnit.test("duplication with negative offset values", function(assert) {
  var done = assert.async();

  enableDrawingMode();

  setTimeout(function() {
    // Create original at (500, 600)
    var original = createRectangle(500, 600, 600, 700);
    original.setAttribute("data-color-index", "3");
    document.body.appendChild(original);
    placedRectangles.push(original);

    // Alt+click to the right and below the top-left corner
    handleMouseDown({
      clientX: 550, // 50px right of left edge
      clientY: 650, // 50px below top edge
      altKey: true,
      metaKey: false,
      ctrlKey: false,
      button: 0,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    // Offset: b.left - clientX = 500 - 550 = -50
    //         b.top - clientY = 600 - 650 = -50
    assert.equal(duplicateOffsetX, -50, "negative X offset calculated");
    assert.equal(duplicateOffsetY, -50, "negative Y offset calculated");

    done();
  }, 50);
});

QUnit.test("multiple duplications use correct offsets", function(assert) {
  var done = assert.async();

  enableDrawingMode();

  setTimeout(function() {
    // First duplication
    var original1 = createRectangle(100, 100, 200, 200);
    original1.setAttribute("data-color-index", "0");
    document.body.appendChild(original1);
    placedRectangles.push(original1);

    handleMouseDown({
      clientX: 150,
      clientY: 150,
      altKey: true,
      metaKey: false,
      ctrlKey: false,
      button: 0,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    assert.equal(duplicateOffsetX, -50, "first duplication X offset");
    assert.equal(duplicateOffsetY, -50, "first duplication Y offset");

    // Cancel first duplication
    handleMouseUp({
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    // Second duplication with different rectangle
    var original2 = createRectangle(300, 400, 400, 500);
    original2.setAttribute("data-color-index", "1");
    document.body.appendChild(original2);
    placedRectangles.push(original2);

    handleMouseDown({
      clientX: 310,
      clientY: 420,
      altKey: true,
      metaKey: false,
      ctrlKey: false,
      button: 0,
      preventDefault: function() {},
      stopPropagation: function() {}
    });

    // Offset should be recalculated correctly for second rectangle
    assert.equal(duplicateOffsetX, -10, "second duplication X offset (BUG FIX)");
    assert.equal(duplicateOffsetY, -20, "second duplication Y offset (BUG FIX)");

    done();
  }, 50);
});
