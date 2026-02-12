/**
 * Unit Tests: Resize Functions
 *
 * Tests for rectangle resize by dragging edges/corners:
 * - getResizeHandle() - Detect edge/corner hit zones
 * - calculateResizeBounds() - Compute new bounds during resize
 * - setResizeCursor() / clearResizeCursor() - Cursor helpers
 * - updateHoverCursors() with resize - Edge priority over modifiers
 */

// ============================================================================
// getResizeHandle() Tests
// ============================================================================

QUnit.module("Resize - getResizeHandle", {
  beforeEach: function() {
    placedRectangles = [];
  },
  afterEach: function() {
    for (var i = 0; i < placedRectangles.length; i++) {
      if (placedRectangles[i].parentNode) {
        placedRectangles[i].parentNode.removeChild(placedRectangles[i]);
      }
    }
    placedRectangles = [];
  }
});

function createPlacedRect(left, top, width, height) {
  var rect = document.createElement("div");
  rect.style.cssText = "position:fixed;left:" + left + "px;top:" + top + "px;width:" + width + "px;height:" + height + "px;";
  document.body.appendChild(rect);
  placedRectangles.push(rect);
  return rect;
}

QUnit.test("returns null when no rectangles exist", function(assert) {
  var result = getResizeHandle(100, 100);
  assert.strictEqual(result, null, "no handle when no rectangles");
});

QUnit.test("returns null when point is far outside any rectangle", function(assert) {
  createPlacedRect(100, 100, 200, 200);
  var result = getResizeHandle(500, 500);
  assert.strictEqual(result, null, "no handle for distant point");
});

QUnit.test("detects north edge", function(assert) {
  var rect = createPlacedRect(100, 100, 200, 200);
  var result = getResizeHandle(200, 100); // middle of top edge
  assert.ok(result, "handle detected");
  assert.strictEqual(result.handle, "n", "north handle");
  assert.strictEqual(result.rect, rect, "correct rectangle");
});

QUnit.test("detects south edge", function(assert) {
  var rect = createPlacedRect(100, 100, 200, 200);
  var result = getResizeHandle(200, 300); // middle of bottom edge
  assert.ok(result, "handle detected");
  assert.strictEqual(result.handle, "s", "south handle");
});

QUnit.test("detects east edge", function(assert) {
  var rect = createPlacedRect(100, 100, 200, 200);
  var result = getResizeHandle(300, 200); // middle of right edge
  assert.ok(result, "handle detected");
  assert.strictEqual(result.handle, "e", "east handle");
});

QUnit.test("detects west edge", function(assert) {
  var rect = createPlacedRect(100, 100, 200, 200);
  var result = getResizeHandle(100, 200); // middle of left edge
  assert.ok(result, "handle detected");
  assert.strictEqual(result.handle, "w", "west handle");
});

QUnit.test("detects northeast corner", function(assert) {
  createPlacedRect(100, 100, 200, 200);
  var result = getResizeHandle(300, 100); // top-right corner
  assert.ok(result, "handle detected");
  assert.strictEqual(result.handle, "ne", "northeast handle");
});

QUnit.test("detects northwest corner", function(assert) {
  createPlacedRect(100, 100, 200, 200);
  var result = getResizeHandle(100, 100); // top-left corner
  assert.ok(result, "handle detected");
  assert.strictEqual(result.handle, "nw", "northwest handle");
});

QUnit.test("detects southeast corner", function(assert) {
  createPlacedRect(100, 100, 200, 200);
  var result = getResizeHandle(300, 300); // bottom-right corner
  assert.ok(result, "handle detected");
  assert.strictEqual(result.handle, "se", "southeast handle");
});

QUnit.test("detects southwest corner", function(assert) {
  createPlacedRect(100, 100, 200, 200);
  var result = getResizeHandle(100, 300); // bottom-left corner
  assert.ok(result, "handle detected");
  assert.strictEqual(result.handle, "sw", "southwest handle");
});

QUnit.test("returns null for interior point (not near any edge)", function(assert) {
  createPlacedRect(100, 100, 200, 200);
  var result = getResizeHandle(200, 200); // center of rectangle
  assert.strictEqual(result, null, "no handle for interior point");
});

QUnit.test("hit zone extends outside the edge", function(assert) {
  createPlacedRect(100, 100, 200, 200);
  // 4px outside the top edge (within RESIZE_HANDLE_SIZE=6)
  var result = getResizeHandle(200, 96);
  assert.ok(result, "handle detected outside edge");
  assert.strictEqual(result.handle, "n", "north handle from outside");
});

QUnit.test("hit zone extends inside the edge", function(assert) {
  createPlacedRect(100, 100, 200, 200);
  // 4px inside the top edge (within RESIZE_HANDLE_SIZE=6)
  var result = getResizeHandle(200, 104);
  assert.ok(result, "handle detected inside edge");
  assert.strictEqual(result.handle, "n", "north handle from inside");
});

QUnit.test("topmost rectangle wins when overlapping", function(assert) {
  var rect1 = createPlacedRect(100, 100, 200, 200); // placed first (bottom)
  var rect2 = createPlacedRect(150, 150, 200, 200); // placed second (top)
  var result = getResizeHandle(150, 150); // on edge of rect2, inside rect1
  assert.ok(result, "handle detected");
  assert.strictEqual(result.rect, rect2, "topmost rectangle selected");
});

QUnit.test("small rectangle: corners dominate", function(assert) {
  createPlacedRect(100, 100, 8, 8); // smaller than 2*RESIZE_HANDLE_SIZE
  // Center of small rect — corners should dominate since edge zones overlap
  var result = getResizeHandle(104, 104);
  assert.ok(result, "handle detected on small rect");
  // Should be a corner since zones overlap
  assert.ok(
    result.handle === "nw" || result.handle === "ne" || result.handle === "sw" || result.handle === "se",
    "corner handle detected: " + result.handle
  );
});

QUnit.test("interior of top rect blocks detection of rect behind", function(assert) {
  var rect1 = createPlacedRect(100, 100, 200, 200);
  var rect2 = createPlacedRect(120, 120, 160, 160); // smaller, on top
  // Point in interior of rect2, on edge of rect1
  var result = getResizeHandle(150, 150);
  assert.strictEqual(result, null, "interior of top rect blocks rect behind");
});

// ============================================================================
// calculateResizeBounds() Tests
// ============================================================================

QUnit.module("Resize - calculateResizeBounds");

QUnit.test("east edge: moves right edge to mouse position", function(assert) {
  var start = { left: 100, top: 100, width: 200, height: 200 };
  var result = calculateResizeBounds(350, 200, "e", start, false);
  assert.equal(result.left, 100, "left unchanged");
  assert.equal(result.top, 100, "top unchanged");
  assert.equal(result.width, 250, "width increased");
  assert.equal(result.height, 200, "height unchanged");
});

QUnit.test("west edge: moves left edge to mouse position", function(assert) {
  var start = { left: 100, top: 100, width: 200, height: 200 };
  var result = calculateResizeBounds(50, 200, "w", start, false);
  assert.equal(result.left, 50, "left moved");
  assert.equal(result.width, 250, "width increased");
  assert.equal(result.height, 200, "height unchanged");
});

QUnit.test("north edge: moves top edge to mouse position", function(assert) {
  var start = { left: 100, top: 100, width: 200, height: 200 };
  var result = calculateResizeBounds(200, 50, "n", start, false);
  assert.equal(result.top, 50, "top moved");
  assert.equal(result.height, 250, "height increased");
  assert.equal(result.width, 200, "width unchanged");
});

QUnit.test("south edge: moves bottom edge to mouse position", function(assert) {
  var start = { left: 100, top: 100, width: 200, height: 200 };
  var result = calculateResizeBounds(200, 350, "s", start, false);
  assert.equal(result.top, 100, "top unchanged");
  assert.equal(result.height, 250, "height increased");
});

QUnit.test("southeast corner: both dimensions change", function(assert) {
  var start = { left: 100, top: 100, width: 200, height: 200 };
  var result = calculateResizeBounds(350, 350, "se", start, false);
  assert.equal(result.left, 100, "left unchanged");
  assert.equal(result.top, 100, "top unchanged");
  assert.equal(result.width, 250, "width increased");
  assert.equal(result.height, 250, "height increased");
});

QUnit.test("northwest corner: both dimensions change", function(assert) {
  var start = { left: 100, top: 100, width: 200, height: 200 };
  var result = calculateResizeBounds(50, 50, "nw", start, false);
  assert.equal(result.left, 50, "left moved");
  assert.equal(result.top, 50, "top moved");
  assert.equal(result.width, 250, "width increased");
  assert.equal(result.height, 250, "height increased");
});

QUnit.test("min size enforced: cannot flip past opposite edge", function(assert) {
  var start = { left: 100, top: 100, width: 200, height: 200 };
  // Try to drag east edge past left edge
  var result = calculateResizeBounds(50, 200, "e", start, false);
  assert.ok(result.width >= MIN_RECT_SIZE, "width at least MIN_RECT_SIZE: " + result.width);
  assert.equal(result.left, 100, "left unchanged");
});

QUnit.test("alt/from-center: symmetric resize for east edge", function(assert) {
  var start = { left: 100, top: 100, width: 200, height: 200 };
  // Center is at (200, 200). Drag east edge to 350 → dx=150 from center
  var result = calculateResizeBounds(350, 200, "e", start, true);
  // Both sides should move symmetrically: left = 200-150=50, right = 200+150=350
  assert.equal(result.left, 50, "left mirrors symmetrically");
  assert.equal(result.width, 300, "width = 2 * dx");
  assert.equal(result.top, 100, "top unchanged");
  assert.equal(result.height, 200, "height unchanged");
});

QUnit.test("alt/from-center: symmetric resize for southeast corner", function(assert) {
  var start = { left: 100, top: 100, width: 200, height: 200 };
  // Center is at (200, 200). Drag SE to (350, 350)
  var result = calculateResizeBounds(350, 350, "se", start, true);
  assert.equal(result.left, 50, "left mirrors");
  assert.equal(result.top, 50, "top mirrors");
  assert.equal(result.width, 300, "width symmetric");
  assert.equal(result.height, 300, "height symmetric");
});

QUnit.test("alt + min size enforcement", function(assert) {
  var start = { left: 100, top: 100, width: 200, height: 200 };
  // Center is (200, 200). Drag east edge to 201 → dx=1, less than MIN_RECT_SIZE/2
  var result = calculateResizeBounds(201, 200, "e", start, true);
  assert.ok(result.width >= MIN_RECT_SIZE, "width at least MIN_RECT_SIZE with alt: " + result.width);
});

QUnit.test("dragged edge tracks mouseX regardless of alt toggle", function(assert) {
  var start = { left: 100, top: 100, width: 200, height: 200 };

  // Without alt: east edge at mouse=350
  var normal = calculateResizeBounds(350, 200, "e", start, false);
  assert.equal(normal.left + normal.width, 350, "right edge at mouseX without alt");

  // With alt: east edge still at 350, but left mirrors
  var alt = calculateResizeBounds(350, 200, "e", start, true);
  assert.equal(alt.left + alt.width, 350, "right edge at mouseX with alt");
});

// ============================================================================
// setResizeCursor() / clearResizeCursor() Tests
// ============================================================================

QUnit.module("Resize - Cursor Helpers", {
  afterEach: function() {
    document.documentElement.style.removeProperty("--sd-cursor");
  }
});

QUnit.test("setResizeCursor sets correct --sd-cursor value", function(assert) {
  var handles = {
    n: "n-resize", s: "s-resize", e: "e-resize", w: "w-resize",
    ne: "ne-resize", nw: "nw-resize", se: "se-resize", sw: "sw-resize"
  };
  for (var handle in handles) {
    setResizeCursor(handle);
    var value = document.documentElement.style.getPropertyValue("--sd-cursor");
    assert.equal(value, handles[handle], handle + " → " + handles[handle]);
  }
});

QUnit.test("clearResizeCursor removes inline --sd-cursor property", function(assert) {
  document.documentElement.style.setProperty("--sd-cursor", "se-resize");
  clearResizeCursor();
  var value = document.documentElement.style.getPropertyValue("--sd-cursor");
  assert.equal(value, "", "property removed");
});

// ============================================================================
// updateHoverCursors() with resize - Edge priority Tests
// ============================================================================

QUnit.module("Resize - updateHoverCursors edge priority", {
  beforeEach: function() {
    isDrawingMode = true;
    isCurrentlyDrawing = false;
    isDuplicating = false;
    isRepositioning = false;
    isResizing = false;
    currentMouseX = 0;
    currentMouseY = 0;
    placedRectangles = [];
    document.documentElement.classList.remove("spotlight-draw-repositioning-mode");
    document.documentElement.classList.remove("spotlight-draw-duplication-hover-mode");
    document.documentElement.style.removeProperty("--sd-cursor");
  },
  afterEach: function() {
    isDrawingMode = false;
    isCurrentlyDrawing = false;
    isDuplicating = false;
    isRepositioning = false;
    isResizing = false;
    currentMouseX = 0;
    currentMouseY = 0;
    document.documentElement.classList.remove("spotlight-draw-repositioning-mode");
    document.documentElement.classList.remove("spotlight-draw-duplication-hover-mode");
    document.documentElement.style.removeProperty("--sd-cursor");
    for (var i = 0; i < placedRectangles.length; i++) {
      if (placedRectangles[i].parentNode) {
        placedRectangles[i].parentNode.removeChild(placedRectangles[i]);
      }
    }
    placedRectangles = [];
  }
});

QUnit.test("shows resize cursor on edge with no modifiers", function(assert) {
  var rect = document.createElement("div");
  rect.style.cssText = "position:fixed;left:100px;top:100px;width:200px;height:200px;";
  document.body.appendChild(rect);
  placedRectangles.push(rect);

  currentMouseX = 200;
  currentMouseY = 100; // on top edge

  updateHoverCursors(false, false);

  var cursor = document.documentElement.style.getPropertyValue("--sd-cursor");
  assert.equal(cursor, "n-resize", "resize cursor set for north edge");
  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-repositioning-mode"),
    "repositioning class not added"
  );
});

QUnit.test("shows resize cursor on edge even when Cmd held (edge wins)", function(assert) {
  var rect = document.createElement("div");
  rect.style.cssText = "position:fixed;left:100px;top:100px;width:200px;height:200px;";
  document.body.appendChild(rect);
  placedRectangles.push(rect);

  currentMouseX = 300;
  currentMouseY = 200; // on right edge

  updateHoverCursors(true, false); // Cmd held

  var cursor = document.documentElement.style.getPropertyValue("--sd-cursor");
  assert.equal(cursor, "e-resize", "resize cursor set even with Cmd");
  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-repositioning-mode"),
    "repositioning class NOT added (edge wins)"
  );
});

QUnit.test("shows resize cursor when Alt on edge (not duplication)", function(assert) {
  var rect = document.createElement("div");
  rect.style.cssText = "position:fixed;left:100px;top:100px;width:200px;height:200px;";
  document.body.appendChild(rect);
  placedRectangles.push(rect);

  currentMouseX = 100;
  currentMouseY = 200; // on left edge

  updateHoverCursors(false, true); // Alt held

  var cursor = document.documentElement.style.getPropertyValue("--sd-cursor");
  assert.equal(cursor, "w-resize", "resize cursor set on edge with Alt");
  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-duplication-hover-mode"),
    "duplication class NOT added (edge wins)"
  );
});

QUnit.test("shows duplication cursor when Alt on interior (not resize)", function(assert) {
  var rect = document.createElement("div");
  rect.style.cssText = "position:fixed;left:100px;top:100px;width:200px;height:200px;";
  document.body.appendChild(rect);
  placedRectangles.push(rect);

  currentMouseX = 200;
  currentMouseY = 200; // interior

  updateHoverCursors(false, true); // Alt held

  var cursor = document.documentElement.style.getPropertyValue("--sd-cursor");
  assert.equal(cursor, "", "no resize cursor for interior");
  assert.ok(
    document.documentElement.classList.contains("spotlight-draw-duplication-hover-mode"),
    "duplication class added for interior with Alt"
  );
});

// ============================================================================
// collectExistingGaps() Tests
// ============================================================================

QUnit.module("Resize - collectExistingGaps", {
  beforeEach: function() {
    placedRectangles = [];
  },
  afterEach: function() {
    for (var i = 0; i < placedRectangles.length; i++) {
      if (placedRectangles[i].parentNode) {
        placedRectangles[i].parentNode.removeChild(placedRectangles[i]);
      }
    }
    placedRectangles = [];
  }
});

QUnit.test("returns empty when no rectangles", function(assert) {
  var gaps = collectExistingGaps('horizontal', null);
  assert.equal(gaps.length, 0, "no gaps");
});

QUnit.test("returns empty with single rectangle", function(assert) {
  createPlacedRect(100, 100, 50, 50);
  var gaps = collectExistingGaps('horizontal', null);
  assert.equal(gaps.length, 0, "no gaps with single rect");
});

QUnit.test("finds horizontal gap between two rects", function(assert) {
  createPlacedRect(100, 100, 50, 50); // right edge at 150
  createPlacedRect(200, 100, 50, 50); // left edge at 200
  var gaps = collectExistingGaps('horizontal', null);
  assert.equal(gaps.length, 1, "one gap found");
  assert.equal(gaps[0].gapSize, 50, "gap is 50px");
  assert.equal(gaps[0].gapStart, 150, "gap starts at 150");
  assert.equal(gaps[0].gapEnd, 200, "gap ends at 200");
});

QUnit.test("finds vertical gap between two rects", function(assert) {
  createPlacedRect(100, 100, 50, 50); // bottom at 150
  createPlacedRect(100, 200, 50, 50); // top at 200
  var gaps = collectExistingGaps('vertical', null);
  assert.equal(gaps.length, 1, "one gap found");
  assert.equal(gaps[0].gapSize, 50, "gap is 50px");
  assert.equal(gaps[0].gapStart, 150, "gap starts at 150");
  assert.equal(gaps[0].gapEnd, 200, "gap ends at 200");
});

QUnit.test("excludes specified rectangle", function(assert) {
  var rect1 = createPlacedRect(100, 100, 50, 50);
  createPlacedRect(200, 100, 50, 50);
  createPlacedRect(300, 100, 50, 50);
  // Exclude rect1 → only rect2 (200-250) and rect3 (300-350) → gap = 50
  var gaps = collectExistingGaps('horizontal', rect1);
  assert.equal(gaps.length, 1, "one gap after exclusion");
  assert.equal(gaps[0].gapSize, 50, "gap size correct");
});

QUnit.test("no gap when rects touch", function(assert) {
  createPlacedRect(100, 100, 50, 50); // right edge at 150
  createPlacedRect(150, 100, 50, 50); // left edge at 150
  var gaps = collectExistingGaps('horizontal', null);
  assert.equal(gaps.length, 0, "no gap when rects touch");
});

// ============================================================================
// applyResizeSnapping() Edge Alignment Tests
// ============================================================================

QUnit.module("Resize - applyResizeSnapping edge alignment", {
  beforeEach: function() {
    placedRectangles = [];
    resizeHandle = null;
  },
  afterEach: function() {
    for (var i = 0; i < placedRectangles.length; i++) {
      if (placedRectangles[i].parentNode) {
        placedRectangles[i].parentNode.removeChild(placedRectangles[i]);
      }
    }
    placedRectangles = [];
    resizeHandle = null;
  }
});

QUnit.test("'e' handle snaps right edge to target; left stays fixed", function(assert) {
  createPlacedRect(300, 50, 100, 100); // left edge at 300
  resizeHandle = "e";
  // Resizing rect: left=100, width=195 → right=295 (within 8px of 300)
  var result = applyResizeSnapping(100, 100, 195, 200, null);
  assert.equal(result.x, 100, "left unchanged");
  assert.equal(result.x + result.width, 300, "right snapped to 300");
  assert.ok(result.verticalSnapPositions.indexOf(300) >= 0, "snap position at 300");
});

QUnit.test("'w' handle snaps left edge; right stays fixed", function(assert) {
  createPlacedRect(100, 50, 100, 100); // right edge at 200
  resizeHandle = "w";
  // Resizing rect: left=203, width=200 → right=403
  var result = applyResizeSnapping(203, 100, 200, 200, null);
  assert.equal(result.x, 200, "left snapped to 200");
  assert.equal(result.x + result.width, 403, "right stays fixed");
  assert.ok(result.verticalSnapPositions.indexOf(200) >= 0, "snap position at 200");
});

QUnit.test("'s' handle snaps bottom edge", function(assert) {
  createPlacedRect(50, 300, 100, 100); // top at 300
  resizeHandle = "s";
  // Resizing rect: top=100, height=195 → bottom=295 (within 8px of 300)
  var result = applyResizeSnapping(100, 100, 200, 195, null);
  assert.equal(result.y, 100, "top unchanged");
  assert.equal(result.y + result.height, 300, "bottom snapped to 300");
});

QUnit.test("'n' handle snaps top edge", function(assert) {
  createPlacedRect(50, 100, 100, 100); // bottom at 200
  resizeHandle = "n";
  // Resizing rect: top=203, height=200 → bottom=403
  var result = applyResizeSnapping(100, 203, 200, 200, null);
  assert.equal(result.y, 200, "top snapped to 200");
  assert.equal(result.y + result.height, 403, "bottom stays fixed");
});

QUnit.test("'se' snaps both right AND bottom independently", function(assert) {
  createPlacedRect(300, 50, 100, 100); // left at 300
  createPlacedRect(50, 300, 100, 100); // top at 300
  resizeHandle = "se";
  var result = applyResizeSnapping(100, 100, 195, 195, null);
  assert.equal(result.x, 100, "left unchanged");
  assert.equal(result.y, 100, "top unchanged");
  assert.equal(result.x + result.width, 300, "right snapped to 300");
  assert.equal(result.y + result.height, 300, "bottom snapped to 300");
});

QUnit.test("'nw' snaps both left AND top independently", function(assert) {
  createPlacedRect(100, 50, 100, 100); // right edge at 200
  createPlacedRect(50, 100, 100, 100); // bottom at 200
  resizeHandle = "nw";
  // Resizing rect: left=203, top=203, right=403, bottom=403
  var result = applyResizeSnapping(203, 203, 200, 200, null);
  assert.equal(result.x, 200, "left snapped to 200");
  assert.equal(result.y, 200, "top snapped to 200");
  assert.equal(result.x + result.width, 403, "right stays fixed");
  assert.equal(result.y + result.height, 403, "bottom stays fixed");
});

QUnit.test("'e' handle does NOT snap left edge", function(assert) {
  // Target near the left edge of resizing rect (left=100, target at 97)
  createPlacedRect(47, 50, 50, 100); // right edge at 97
  resizeHandle = "e";
  // Resizing rect: left=100 (3px from 97), right=500 (no target nearby)
  var result = applyResizeSnapping(100, 100, 400, 200, null);
  assert.equal(result.x, 100, "left not snapped even though target close");
  assert.equal(result.width, 400, "width unchanged");
});

QUnit.test("no center snapping during resize", function(assert) {
  // Target with center at 200
  createPlacedRect(150, 50, 100, 100); // centerX = 200
  resizeHandle = "e";
  // Resizing rect: left=100, width=190 → centerX=195, right=290
  // No edge targets near 290, center target at 200 is 5px from our 195
  var result = applyResizeSnapping(100, 100, 190, 200, null);
  assert.equal(result.x, 100, "x unchanged");
  assert.equal(result.width, 190, "width unchanged - no center snap");
});

// ============================================================================
// applyResizeSnapping() Gap Snapping Tests
// ============================================================================

QUnit.module("Resize - applyResizeSnapping gap snapping", {
  beforeEach: function() {
    placedRectangles = [];
    resizeHandle = null;
  },
  afterEach: function() {
    for (var i = 0; i < placedRectangles.length; i++) {
      if (placedRectangles[i].parentNode) {
        placedRectangles[i].parentNode.removeChild(placedRectangles[i]);
      }
    }
    placedRectangles = [];
    resizeHandle = null;
  }
});

QUnit.test("right edge gap snap matches existing gap", function(assert) {
  // A and B have 50px gap
  createPlacedRect(0, 100, 100, 50);   // A: 0-100
  createPlacedRect(150, 100, 100, 50);  // B: 150-250, gap A-B = 50
  var rectR = createPlacedRect(300, 100, 100, 50); // R: 300-400
  createPlacedRect(453, 100, 100, 50);  // C: 453-553
  resizeHandle = "e";
  // R right=400, gap to C=53, should snap to match 50 → right=403
  var result = applyResizeSnapping(300, 100, 100, 50, rectR);
  assert.equal(result.x, 300, "left unchanged");
  assert.equal(result.x + result.width, 403, "right snapped to create 50px gap");
});

QUnit.test("left edge gap snap matches existing gap", function(assert) {
  createPlacedRect(0, 100, 100, 50);   // A: 0-100
  createPlacedRect(150, 100, 100, 50);  // B: 150-250, gap A-B = 50
  createPlacedRect(297, 100, 50, 50);   // D: 297-347
  var rectR = createPlacedRect(400, 100, 100, 50); // R: 400-500
  resizeHandle = "w";
  // R left=400, D right=347, gap=53, should snap to match 50 → left=397
  var result = applyResizeSnapping(400, 100, 100, 50, rectR);
  assert.equal(result.x, 397, "left snapped to create 50px gap");
  assert.equal(result.x + result.width, 500, "right stays fixed");
});

QUnit.test("bottom edge gap snap matches existing gap", function(assert) {
  createPlacedRect(100, 0, 50, 100);   // A: top=0, bottom=100
  createPlacedRect(100, 150, 50, 100);  // B: top=150, gap A-B = 50
  var rectR = createPlacedRect(100, 300, 50, 100); // R: top=300, bottom=400
  createPlacedRect(100, 453, 50, 100);  // C: top=453
  resizeHandle = "s";
  // R bottom=400, gap to C=53, snap to match 50 → bottom=403
  var result = applyResizeSnapping(100, 300, 50, 100, rectR);
  assert.equal(result.y, 300, "top unchanged");
  assert.equal(result.y + result.height, 403, "bottom snapped to create 50px gap");
});

QUnit.test("edge alignment takes priority over gap snap", function(assert) {
  // Existing gap of 50px
  createPlacedRect(0, 100, 100, 50);   // A: 0-100
  createPlacedRect(150, 100, 100, 50);  // B: 150-250, gap = 50
  createPlacedRect(405, 100, 100, 50);  // C: left at 405 (edge target)
  var rectR = createPlacedRect(300, 100, 100, 50); // R: 300-400
  resizeHandle = "e";
  // R right=400. Edge snap: C left=405, |400-405|=5 ≤ 8 → snap to 405
  // Edge snap fires, gap snap skipped
  var result = applyResizeSnapping(300, 100, 100, 50, rectR);
  assert.equal(result.x + result.width, 405, "snapped to edge alignment at 405");
  assert.ok(result.verticalSnapPositions.length > 0, "edge snap position recorded");
});

QUnit.test("no gap snap when no existing gaps to match", function(assert) {
  // Only the resized rect and one other rect — no gap pair to reference
  var rectR = createPlacedRect(100, 100, 100, 50);
  createPlacedRect(253, 100, 100, 50); // 53px from R's right
  resizeHandle = "e";
  var result = applyResizeSnapping(100, 100, 100, 50, rectR);
  assert.equal(result.width, 100, "width unchanged - no gap to match");
});

// ============================================================================
// applyResizeSnapping() Spacing Guides Tests
// ============================================================================

QUnit.module("Resize - applyResizeSnapping spacing guides", {
  beforeEach: function() {
    placedRectangles = [];
    resizeHandle = null;
  },
  afterEach: function() {
    for (var i = 0; i < placedRectangles.length; i++) {
      if (placedRectangles[i].parentNode) {
        placedRectangles[i].parentNode.removeChild(placedRectangles[i]);
      }
    }
    placedRectangles = [];
    resizeHandle = null;
  }
});

QUnit.test("returns spacing guides when gap matches (>= 2 gaps)", function(assert) {
  // Three rects with 50px gaps: A(0-100) 50 B(150-250) 50 R(300-400)
  createPlacedRect(0, 100, 100, 50);   // A
  createPlacedRect(150, 100, 100, 50);  // B
  var rectR = createPlacedRect(300, 100, 100, 50); // R: right edge at 400
  // Rect C positioned so gap R-C = 50 (matching A-B gap)
  createPlacedRect(450, 100, 100, 50);  // C: left at 450, gap = 50
  resizeHandle = "e";
  // R right=400, gap to C=50 (exact match)
  // findAllGapsOfSize(50, 'horizontal', ...) should find ≥2 gaps
  var result = applyResizeSnapping(300, 100, 100, 50, rectR);
  assert.ok(result.spacingGuides.length >= 2, "at least 2 spacing guides: " + result.spacingGuides.length);
  assert.equal(result.spacingGuides[0].axis, 'horizontal', "guides are horizontal");
});

QUnit.test("no guides when gap is unique (only 1 gap of that size)", function(assert) {
  // Only two rects besides R — one gap of 50, and R creates a gap of 70
  createPlacedRect(0, 100, 100, 50);   // A: 0-100
  createPlacedRect(150, 100, 100, 50);  // B: 150-250, gap A-B = 50
  var rectR = createPlacedRect(300, 100, 100, 50); // R: 300-400
  createPlacedRect(470, 100, 100, 50);  // C: 470, gap R-C = 70 (unique)
  resizeHandle = "e";
  var result = applyResizeSnapping(300, 100, 100, 50, rectR);
  assert.equal(result.spacingGuides.length, 0, "no guides for unique gap");
});

QUnit.test("guides show in all matching gaps (3+ rects with equal spacing)", function(assert) {
  // Four rects with 50px gaps: A B C R-resized → gap to D = 50
  createPlacedRect(0, 100, 100, 50);   // A: 0-100
  createPlacedRect(150, 100, 100, 50);  // B: 150-250
  createPlacedRect(300, 100, 100, 50);  // C: 300-400
  var rectR = createPlacedRect(450, 100, 100, 50); // R: 450-550
  createPlacedRect(600, 100, 100, 50);  // D: 600, gap R-D = 50
  resizeHandle = "e";
  var result = applyResizeSnapping(450, 100, 100, 50, rectR);
  // Gaps: A-B=50, B-C=50, C-R=50, R-D=50 → all 4 gaps match
  assert.ok(result.spacingGuides.length >= 4, "guides in all matching gaps: " + result.spacingGuides.length);
});
