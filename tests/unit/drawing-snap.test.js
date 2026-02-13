/**
 * Unit Tests: Drawing Dimension Snap
 *
 * Tests for dimension matching during rectangle creation (drawing mode):
 * - Width snaps to matching rectangle when no edge alignment
 * - Height snaps to matching rectangle when no edge alignment
 * - Edge alignment takes priority over dimension snap
 * - Dimension guides appear on matching rectangles
 */

// ============================================================================
// Helper
// ============================================================================

function createDrawingRect(left, top, width, height) {
  var rect = document.createElement("div");
  rect.style.cssText = "position:fixed;left:" + left + "px;top:" + top + "px;width:" + width + "px;height:" + height + "px;";
  document.body.appendChild(rect);
  placedRectangles.push(rect);
  return rect;
}

// ============================================================================
// applySnapping() dimension matching tests
// ============================================================================

QUnit.module("Drawing - Dimension Snap", {
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

QUnit.test("width snaps to matching rect when no edge alignment", function(assert) {
  // Existing rect: 200px wide at x=100
  createDrawingRect(100, 100, 200, 150);

  // Drawing rect far away (no edge alignment), width close to 200
  var result = applySnapping(500, 400, 195, 100, null);

  assert.strictEqual(result.width, 200, "width snapped to matching rect");
  assert.strictEqual(result.x, 500, "x unchanged — left edge stays fixed");
});

QUnit.test("height snaps to matching rect when no edge alignment", function(assert) {
  // Existing rect: 150px tall at y=100
  createDrawingRect(100, 100, 200, 150);

  // Drawing rect far away (no edge alignment), height close to 150
  var result = applySnapping(500, 400, 100, 145, null);

  assert.strictEqual(result.height, 150, "height snapped to matching rect");
  assert.strictEqual(result.y, 400, "y unchanged — top edge stays fixed");
});

QUnit.test("both width and height snap independently", function(assert) {
  createDrawingRect(100, 100, 200, 150);

  var result = applySnapping(500, 400, 196, 146, null);

  assert.strictEqual(result.width, 200, "width snapped");
  assert.strictEqual(result.height, 150, "height snapped");
});

QUnit.test("edge alignment takes priority over width dimension snap", function(assert) {
  // Existing rect at x=100, width=200 (right edge at 300)
  createDrawingRect(100, 100, 200, 150);

  // Drawing rect with left edge near 100 (within SNAP_THRESHOLD), width=195
  // Left edge should snap to 100, width should NOT dimension-snap because edge snapped
  var result = applySnapping(103, 400, 195, 100, null);

  assert.strictEqual(result.x, 100, "left edge snapped to alignment");
  // Width adjusted by edge snap (103 - 100 = 3px shift), not dimension snap
  assert.strictEqual(result.width, 198, "width adjusted by edge shift, not dimension snap");
});

QUnit.test("edge alignment takes priority over height dimension snap", function(assert) {
  // Existing rect at y=100, height=150 (bottom edge at 250)
  createDrawingRect(100, 100, 200, 150);

  // Drawing rect with top edge near 100 (within SNAP_THRESHOLD), height=145
  var result = applySnapping(500, 103, 100, 145, null);

  assert.strictEqual(result.y, 100, "top edge snapped to alignment");
  assert.strictEqual(result.height, 148, "height adjusted by edge shift, not dimension snap");
});

QUnit.test("no snap when width difference exceeds SNAP_THRESHOLD", function(assert) {
  createDrawingRect(100, 100, 200, 150);

  // Width 180 is 20px away — well beyond SNAP_THRESHOLD of 8
  var result = applySnapping(500, 400, 180, 100, null);

  assert.strictEqual(result.width, 180, "width unchanged — too far from match");
});

QUnit.test("no snap when height difference exceeds SNAP_THRESHOLD", function(assert) {
  createDrawingRect(100, 100, 200, 150);

  var result = applySnapping(500, 400, 100, 130, null);

  assert.strictEqual(result.height, 130, "height unchanged — too far from match");
});

QUnit.test("dimension guide appears for matching width", function(assert) {
  createDrawingRect(100, 100, 200, 150);

  var result = applySnapping(500, 400, 200, 100, null);

  assert.ok(result.spacingGuides.length > 0, "spacingGuides populated");
  var widthGuide = result.spacingGuides.filter(function(g) { return g.axis === 'horizontal'; });
  assert.strictEqual(widthGuide.length, 1, "one horizontal dimension guide");
  assert.strictEqual(widthGuide[0].gapStart, 100, "guide starts at matching rect left");
  assert.strictEqual(widthGuide[0].gapEnd, 300, "guide ends at matching rect right");
});

QUnit.test("dimension guide appears for matching height", function(assert) {
  createDrawingRect(100, 100, 200, 150);

  var result = applySnapping(500, 400, 100, 150, null);

  var heightGuide = result.spacingGuides.filter(function(g) { return g.axis === 'vertical'; });
  assert.strictEqual(heightGuide.length, 1, "one vertical dimension guide");
  assert.strictEqual(heightGuide[0].gapStart, 100, "guide starts at matching rect top");
  assert.strictEqual(heightGuide[0].gapEnd, 250, "guide ends at matching rect bottom");
});

QUnit.test("snaps to closest width match when multiple rects exist", function(assert) {
  createDrawingRect(100, 100, 200, 100); // width 200
  createDrawingRect(100, 300, 197, 100); // width 197

  // Drawing with width 196 — closer to 197 than 200
  var result = applySnapping(500, 500, 196, 100, null);

  assert.strictEqual(result.width, 197, "snapped to closest width match");
});

QUnit.test("no dimension guides when no match within 1px", function(assert) {
  createDrawingRect(100, 100, 200, 150);

  // Drawing with width=210, height=160 — no matches
  var result = applySnapping(500, 400, 210, 160, null);

  assert.strictEqual(result.spacingGuides.length, 0, "no guides when no dimension match");
});
