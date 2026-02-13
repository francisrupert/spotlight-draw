/**
 * Unit Tests: Shift to Constrain Drawing to Square
 *
 * Tests for square constraint when Shift is held during drawing:
 * - Uses larger dimension as side length
 * - Preserves drag direction
 * - Composes with Alt (center-outward square)
 * - Mid-drag toggle on/off
 */

// ============================================================================
// calculateRectCoords() square constraint tests
// ============================================================================

QUnit.module("Drawing - Square Constraint", {
  beforeEach: function() {
    isShiftHeld = false;
    isAltHeld = false;
    isCmdCtrlHeld = false;
    axisConstraintMode = null;
    startX = 100;
    startY = 100;
  }
});

QUnit.test("No constraint when Shift is not held", function(assert) {
  isShiftHeld = false;
  var result = calculateRectCoords(250, 180);
  assert.strictEqual(result.width, 150, "width is free-form");
  assert.strictEqual(result.height, 80, "height is free-form");
});

QUnit.test("Square uses larger dimension when dragging wider", function(assert) {
  isShiftHeld = true;
  // Drag right 200, down 80 → larger is 200
  var result = calculateRectCoords(300, 180);
  assert.strictEqual(result.width, 200, "width = larger dimension");
  assert.strictEqual(result.height, 200, "height = larger dimension");
});

QUnit.test("Square uses larger dimension when dragging taller", function(assert) {
  isShiftHeld = true;
  // Drag right 60, down 150 → larger is 150
  var result = calculateRectCoords(160, 250);
  assert.strictEqual(result.width, 150, "width = larger dimension");
  assert.strictEqual(result.height, 150, "height = larger dimension");
});

QUnit.test("Direction preserved: dragging right-down", function(assert) {
  isShiftHeld = true;
  var result = calculateRectCoords(300, 180);
  assert.strictEqual(result.x, 100, "x = startX");
  assert.strictEqual(result.y, 100, "y = startY");
  assert.strictEqual(result.width, 200, "side = 200");
  assert.strictEqual(result.height, 200, "side = 200");
});

QUnit.test("Direction preserved: dragging left-up", function(assert) {
  isShiftHeld = true;
  // Drag left 120, up 80 → larger is 120
  var result = calculateRectCoords(-20, 20);
  assert.strictEqual(result.width, 120, "side = 120");
  assert.strictEqual(result.height, 120, "side = 120");
  assert.strictEqual(result.x, -20, "x = startX - side");
  assert.strictEqual(result.y, -20, "y = startY - side");
});

QUnit.test("Direction preserved: dragging right-up", function(assert) {
  isShiftHeld = true;
  // Drag right 80, up 150 → larger is 150
  var result = calculateRectCoords(180, -50);
  assert.strictEqual(result.width, 150, "side = 150");
  assert.strictEqual(result.height, 150, "side = 150");
  assert.strictEqual(result.x, 100, "x = startX (dragging right)");
  assert.strictEqual(result.y, -50, "y = startY - side (dragging up)");
});

QUnit.test("Direction preserved: dragging left-down", function(assert) {
  isShiftHeld = true;
  // Drag left 200, down 90 → larger is 200
  var result = calculateRectCoords(-100, 190);
  assert.strictEqual(result.width, 200, "side = 200");
  assert.strictEqual(result.height, 200, "side = 200");
  assert.strictEqual(result.x, -100, "x = startX - side");
  assert.strictEqual(result.y, 100, "y = startY (dragging down)");
});

QUnit.test("Composes with Alt: center-outward square", function(assert) {
  isShiftHeld = true;
  isAltHeld = true;
  // Drag right 200, down 80 → larger is 200 → square 200x200 from center
  var result = calculateRectCoords(300, 180);
  assert.strictEqual(result.width, 400, "width = 2 * side");
  assert.strictEqual(result.height, 400, "height = 2 * side");
  assert.strictEqual(result.x, -100, "x = startX - side");
  assert.strictEqual(result.y, -100, "y = startY - side");
});

QUnit.test("Equal deltas produce square", function(assert) {
  isShiftHeld = true;
  var result = calculateRectCoords(250, 250);
  assert.strictEqual(result.width, 150, "width = delta");
  assert.strictEqual(result.height, 150, "height = delta");
});

QUnit.test("Mid-drag toggle: Shift off returns to free-form", function(assert) {
  isShiftHeld = true;
  var constrained = calculateRectCoords(300, 180);
  assert.strictEqual(constrained.width, constrained.height, "constrained to square");

  isShiftHeld = false;
  var free = calculateRectCoords(300, 180);
  assert.strictEqual(free.width, 200, "width is free-form");
  assert.strictEqual(free.height, 80, "height is free-form");
});
