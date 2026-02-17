/**
 * Unit tests for keyboard shortcut behavior
 * Tests arrow key sibling navigation, Tab color cycling, and removal of Tab sibling navigation
 */

QUnit.module("Keyboard Shortcuts", function(hooks) {
  let container;
  let testRectangle1, testRectangle2;
  let originalState = {};

  hooks.beforeEach(function() {
    // Save original state
    originalState = {
      isInspecting: window.isInspecting,
      isDrawingMode: window.isDrawingMode,
      currentMouseX: window.currentMouseX,
      currentMouseY: window.currentMouseY,
      isCurrentlyDrawing: window.isCurrentlyDrawing,
      isDuplicating: window.isDuplicating,
      isRepositioning: window.isRepositioning,
      isResizing: window.isResizing,
      traverseSibling: window.traverseSibling,
      cycleRectangleColor: window.cycleRectangleColor,
      getRectangleAtPosition: window.getRectangleAtPosition
    };

    // Set default state
    window.isDrawingMode = true;
    window.isCurrentlyDrawing = false;
    window.isDuplicating = false;
    window.isRepositioning = false;
    window.isResizing = false;
    window.currentMouseX = 100;
    window.currentMouseY = 100;

    // Create test container
    container = document.createElement("div");
    container.id = "test-keyboard-container";
    document.body.appendChild(container);

    // Create test rectangles
    testRectangle1 = document.createElement("div");
    testRectangle1.className = "sd-rect sd-rect-color-red";
    testRectangle1.style.left = "50px";
    testRectangle1.style.top = "50px";
    testRectangle1.style.width = "100px";
    testRectangle1.style.height = "100px";
    container.appendChild(testRectangle1);

    testRectangle2 = document.createElement("div");
    testRectangle2.className = "sd-rect sd-rect-color-blue";
    testRectangle2.style.left = "200px";
    testRectangle2.style.top = "50px";
    testRectangle2.style.width = "100px";
    testRectangle2.style.height = "100px";
    container.appendChild(testRectangle2);
  });

  hooks.afterEach(function() {
    // Restore original state
    Object.keys(originalState).forEach(function(key) {
      window[key] = originalState[key];
    });

    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  // =========================================================================
  // Arrow Key Sibling Navigation (4 tests)
  // =========================================================================

  QUnit.test("ArrowLeft calls traverseSibling(-1) when in inspection mode", function(assert) {
    window.isInspecting = true;
    let traverseCalled = false;
    let traverseDirection = null;

    window.traverseSibling = function(direction) {
      traverseCalled = true;
      traverseDirection = direction;
    };

    let event = new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true });
    let preventDefaultCalled = false;
    event.preventDefault = function() { preventDefaultCalled = true; };

    window.handleKeyDown(event);

    assert.ok(traverseCalled, "traverseSibling should be called");
    assert.strictEqual(traverseDirection, -1, "traverseSibling should be called with -1 for previous sibling");
    assert.ok(preventDefaultCalled, "preventDefault should be called");
  });

  QUnit.test("ArrowRight calls traverseSibling(1) when in inspection mode", function(assert) {
    window.isInspecting = true;
    let traverseCalled = false;
    let traverseDirection = null;

    window.traverseSibling = function(direction) {
      traverseCalled = true;
      traverseDirection = direction;
    };

    let event = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    let preventDefaultCalled = false;
    event.preventDefault = function() { preventDefaultCalled = true; };

    window.handleKeyDown(event);

    assert.ok(traverseCalled, "traverseSibling should be called");
    assert.strictEqual(traverseDirection, 1, "traverseSibling should be called with 1 for next sibling");
    assert.ok(preventDefaultCalled, "preventDefault should be called");
  });

  QUnit.test("ArrowLeft/Right do nothing when NOT in inspection mode", function(assert) {
    window.isInspecting = false;
    let traverseCalled = false;

    window.traverseSibling = function(direction) {
      traverseCalled = true;
    };

    let eventLeft = new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true });
    window.handleKeyDown(eventLeft);

    let eventRight = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    window.handleKeyDown(eventRight);

    assert.notOk(traverseCalled, "traverseSibling should not be called when not in inspection mode");
  });

  QUnit.test("ArrowLeft/Right preventDefault is called during inspection", function(assert) {
    window.isInspecting = true;
    window.traverseSibling = function() {}; // Stub

    let eventLeft = new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true });
    let preventDefaultCalledLeft = false;
    eventLeft.preventDefault = function() { preventDefaultCalledLeft = true; };
    window.handleKeyDown(eventLeft);

    let eventRight = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    let preventDefaultCalledRight = false;
    eventRight.preventDefault = function() { preventDefaultCalledRight = true; };
    window.handleKeyDown(eventRight);

    assert.ok(preventDefaultCalledLeft, "preventDefault should be called for ArrowLeft");
    assert.ok(preventDefaultCalledRight, "preventDefault should be called for ArrowRight");
  });

  // =========================================================================
  // Tab Key Behavior (6 tests)
  // =========================================================================

  QUnit.test("Tab cycles colors on rectangle under mouse when NOT inspecting", function(assert) {
    window.isInspecting = false;
    let cycleCalled = false;
    let cycledRect = null;

    window.cycleRectangleColor = function(rect) {
      cycleCalled = true;
      cycledRect = rect;
    };

    window.getRectangleAtPosition = function(x, y) {
      return testRectangle1;
    };

    let event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    let preventDefaultCalled = false;
    event.preventDefault = function() { preventDefaultCalled = true; };

    window.handleKeyDown(event);

    assert.ok(cycleCalled, "cycleRectangleColor should be called");
    assert.strictEqual(cycledRect, testRectangle1, "cycleRectangleColor should be called with the rectangle under mouse");
    assert.ok(preventDefaultCalled, "preventDefault should be called");
  });

  QUnit.test("Tab cycles colors on rectangle under mouse WHEN inspecting (NEW)", function(assert) {
    window.isInspecting = true;
    let cycleCalled = false;
    let cycledRect = null;

    window.cycleRectangleColor = function(rect) {
      cycleCalled = true;
      cycledRect = rect;
    };

    window.getRectangleAtPosition = function(x, y) {
      return testRectangle1;
    };

    let event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    let preventDefaultCalled = false;
    event.preventDefault = function() { preventDefaultCalled = true; };

    window.handleKeyDown(event);

    assert.ok(cycleCalled, "cycleRectangleColor should be called even during inspection mode");
    assert.strictEqual(cycledRect, testRectangle1, "cycleRectangleColor should be called with the rectangle under mouse");
    assert.ok(preventDefaultCalled, "preventDefault should be called");
  });

  QUnit.test("Tab does nothing if no rectangle under mouse during inspection", function(assert) {
    window.isInspecting = true;
    let cycleCalled = false;

    window.cycleRectangleColor = function(rect) {
      cycleCalled = true;
    };

    window.getRectangleAtPosition = function(x, y) {
      return null; // No rectangle under mouse
    };

    let event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    window.handleKeyDown(event);

    assert.notOk(cycleCalled, "cycleRectangleColor should not be called when no rectangle under mouse");
  });

  QUnit.test("Tab preventDefault is called when targeting a rectangle", function(assert) {
    window.isInspecting = false;
    window.cycleRectangleColor = function() {}; // Stub
    window.getRectangleAtPosition = function(x, y) {
      return testRectangle1;
    };

    let event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    let preventDefaultCalled = false;
    event.preventDefault = function() { preventDefaultCalled = true; };

    window.handleKeyDown(event);

    assert.ok(preventDefaultCalled, "preventDefault should be called when a rectangle is targeted");
  });

  QUnit.test("Tab works during drawing mode with rectangle under mouse", function(assert) {
    window.isInspecting = false;
    window.isCurrentlyDrawing = true;
    window.currentRectangle = testRectangle1;
    let cycleCalled = false;

    window.cycleRectangleColor = function(rect) {
      cycleCalled = true;
    };

    let event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    window.handleKeyDown(event);

    assert.ok(cycleCalled, "cycleRectangleColor should be called during drawing mode");
  });

  QUnit.test("Tab works during duplicating/repositioning/resizing", function(assert) {
    window.isInspecting = false;
    let cycleCalled = 0;

    window.cycleRectangleColor = function(rect) {
      cycleCalled++;
    };

    // Test during duplicating
    window.isDuplicating = true;
    window.duplicatingRectangle = testRectangle1;
    let event1 = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    window.handleKeyDown(event1);

    // Test during repositioning
    window.isDuplicating = false;
    window.isRepositioning = true;
    window.repositioningRectangle = testRectangle1;
    let event2 = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    window.handleKeyDown(event2);

    // Test during resizing
    window.isRepositioning = false;
    window.isResizing = true;
    window.resizingRectangle = testRectangle1;
    let event3 = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    window.handleKeyDown(event3);

    assert.strictEqual(cycleCalled, 3, "cycleRectangleColor should be called during duplicating, repositioning, and resizing");
  });

  // =========================================================================
  // Tab No Longer Navigates Siblings (2 tests)
  // =========================================================================

  QUnit.test("Tab does NOT call traverseSibling when in inspection mode", function(assert) {
    window.isInspecting = true;
    let traverseCalled = false;

    window.traverseSibling = function(direction) {
      traverseCalled = true;
    };

    // Mock no rectangle under mouse
    window.getRectangleAtPosition = function() {
      return null;
    };

    window.cycleRectangleColor = function() {}; // Stub

    let event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    window.handleKeyDown(event);

    assert.notOk(traverseCalled, "traverseSibling should NOT be called when Tab is pressed in inspection mode");
  });

  QUnit.test("Shift+Tab does NOT call traverseSibling when in inspection mode", function(assert) {
    window.isInspecting = true;
    let traverseCalled = false;

    window.traverseSibling = function(direction) {
      traverseCalled = true;
    };

    // Mock no rectangle under mouse
    window.getRectangleAtPosition = function() {
      return null;
    };

    window.cycleRectangleColor = function() {}; // Stub

    let event = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true });
    window.handleKeyDown(event);

    assert.notOk(traverseCalled, "traverseSibling should NOT be called when Shift+Tab is pressed in inspection mode");
  });
});
