/**
 * Unit Tests: Mid-drag Mode Switch (Reposition → Duplicate)
 *
 * Tests for:
 * - switchRepositionToDuplicate() - Switch from repositioning to duplicating mid-drag
 * - updateHoverCursors() with Cmd+Alt - Alt takes priority (copy cursor)
 */

// ============================================================================
// switchRepositionToDuplicate() Tests
// ============================================================================

QUnit.module("Mode Switch - switchRepositionToDuplicate", {
  beforeEach: function() {
    // Create and set up a rectangle being repositioned
    this.rect = document.createElement("div");
    this.rect.className = "spotlight-draw-rectangle";
    this.rect.style.cssText = "position:fixed;left:300px;top:400px;width:200px;height:100px;";
    this.rect.setAttribute("data-color-index", "2");
    this.rect.classList.add(COLOR_CLASSES[2]);
    document.body.appendChild(this.rect);
    placedRectangles.push(this.rect);

    // Set up repositioning state as if Cmd+drag started at (350, 450)
    isRepositioning = true;
    repositioningRectangle = this.rect;
    repositionStartX = 100;
    repositionStartY = 200;
    repositionOffsetX = -50;
    repositionOffsetY = -50;
    repositionAxisLocked = null;

    isDuplicating = false;
    duplicatingRectangle = null;

    document.documentElement.classList.add("spotlight-draw-dragging-mode");
    document.documentElement.classList.remove("spotlight-draw-duplication-dragging-mode");
  },
  afterEach: function() {
    // Clean up
    isRepositioning = false;
    isDuplicating = false;
    repositioningRectangle = null;
    repositionAxisLocked = null;
    duplicateAxisLocked = null;

    if (duplicatingRectangle && duplicatingRectangle.parentNode) {
      duplicatingRectangle.parentNode.removeChild(duplicatingRectangle);
    }
    duplicatingRectangle = null;

    document.documentElement.classList.remove("spotlight-draw-dragging-mode");
    document.documentElement.classList.remove("spotlight-draw-duplication-dragging-mode");

    for (var i = 0; i < placedRectangles.length; i++) {
      if (placedRectangles[i].parentNode) {
        placedRectangles[i].parentNode.removeChild(placedRectangles[i]);
      }
    }
    placedRectangles = [];
  }
});

QUnit.test("reverts original rectangle to starting position", function(assert) {
  switchRepositionToDuplicate();

  assert.equal(this.rect.style.left, "100px", "original rect left reverted to repositionStartX");
  assert.equal(this.rect.style.top, "200px", "original rect top reverted to repositionStartY");
});

QUnit.test("creates a clone with correct size", function(assert) {
  switchRepositionToDuplicate();

  assert.ok(duplicatingRectangle, "duplicatingRectangle is set");
  assert.notEqual(duplicatingRectangle, this.rect, "clone is different element");
  assert.equal(parseInt(duplicatingRectangle.style.width, 10), 200, "clone width matches original");
  assert.equal(parseInt(duplicatingRectangle.style.height, 10), 100, "clone height matches original");
});

QUnit.test("creates a clone with correct color", function(assert) {
  switchRepositionToDuplicate();

  assert.equal(duplicatingRectangle.getAttribute("data-color-index"), "2", "color index copied");
  assert.ok(duplicatingRectangle.classList.contains(COLOR_CLASSES[2]), "color class applied");
});

QUnit.test("clone is appended to document body", function(assert) {
  switchRepositionToDuplicate();

  assert.ok(duplicatingRectangle.parentNode === document.body, "clone in DOM");
});

QUnit.test("flips state flags correctly", function(assert) {
  switchRepositionToDuplicate();

  assert.equal(isRepositioning, false, "isRepositioning cleared");
  assert.equal(isDuplicating, true, "isDuplicating set");
  assert.equal(repositioningRectangle, null, "repositioningRectangle cleared");
  assert.ok(duplicatingRectangle !== null, "duplicatingRectangle set");
});

QUnit.test("transfers offsets from repositioning to duplication", function(assert) {
  switchRepositionToDuplicate();

  assert.equal(duplicateOffsetX, -50, "duplicateOffsetX matches repositionOffsetX");
  assert.equal(duplicateOffsetY, -50, "duplicateOffsetY matches repositionOffsetY");
  assert.equal(duplicateStartX, 100, "duplicateStartX matches repositionStartX");
  assert.equal(duplicateStartY, 200, "duplicateStartY matches repositionStartY");
});

QUnit.test("transfers axis lock state", function(assert) {
  repositionAxisLocked = "horizontal";

  switchRepositionToDuplicate();

  assert.equal(duplicateAxisLocked, "horizontal", "axis lock transferred");
  assert.equal(repositionAxisLocked, null, "repositioning axis lock cleared");
});

QUnit.test("swaps CSS cursor classes", function(assert) {
  switchRepositionToDuplicate();

  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-dragging-mode"),
    "dragging mode class removed"
  );
  assert.ok(
    document.documentElement.classList.contains("spotlight-draw-duplication-dragging-mode"),
    "duplication dragging class added"
  );
});

// ============================================================================
// updateHoverCursors() with Cmd+Alt Tests
// ============================================================================

QUnit.module("Mode Switch - updateHoverCursors Cmd+Alt priority", {
  beforeEach: function() {
    isDrawingMode = true;
    isCurrentlyDrawing = false;
    isDuplicating = false;
    isRepositioning = false;
    currentMouseX = 0;
    currentMouseY = 0;
    placedRectangles = [];
    document.documentElement.classList.remove("spotlight-draw-repositioning-mode");
    document.documentElement.classList.remove("spotlight-draw-duplication-hover-mode");
  },
  afterEach: function() {
    isDrawingMode = false;
    isCurrentlyDrawing = false;
    isDuplicating = false;
    isRepositioning = false;
    currentMouseX = 0;
    currentMouseY = 0;
    document.documentElement.classList.remove("spotlight-draw-repositioning-mode");
    document.documentElement.classList.remove("spotlight-draw-duplication-hover-mode");
    for (var i = 0; i < placedRectangles.length; i++) {
      if (placedRectangles[i].parentNode) {
        placedRectangles[i].parentNode.removeChild(placedRectangles[i]);
      }
    }
    placedRectangles = [];
  }
});

QUnit.test("Cmd+Alt over rectangle shows copy cursor (Alt wins)", function(assert) {
  var rect = document.createElement("div");
  rect.style.cssText = "position:fixed;left:100px;top:100px;width:200px;height:200px;";
  document.body.appendChild(rect);
  placedRectangles.push(rect);

  currentMouseX = 150;
  currentMouseY = 150;

  updateHoverCursors(true, true);

  assert.ok(
    document.documentElement.classList.contains("spotlight-draw-duplication-hover-mode"),
    "duplication hover class added (Alt wins over Cmd)"
  );
  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-repositioning-mode"),
    "repositioning class not added when Alt also held"
  );
});

QUnit.test("Cmd+Alt not over rectangle removes both classes", function(assert) {
  document.documentElement.classList.add("spotlight-draw-repositioning-mode");
  document.documentElement.classList.add("spotlight-draw-duplication-hover-mode");

  currentMouseX = 500;
  currentMouseY = 500;

  updateHoverCursors(true, true);

  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-repositioning-mode"),
    "repositioning class removed"
  );
  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-duplication-hover-mode"),
    "duplication class removed (not over rect)"
  );
});
