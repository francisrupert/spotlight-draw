/**
 * Unit Tests: Shift During Free-form Drawing
 *
 * Shift keeps its multi-rectangle behavior when starting a draw, but should not
 * constrain dimensions while the rectangle is being drawn.
 */

QUnit.module("Drawing - Shift Freeform", {
  beforeEach: function() {
    this.snapToEdges = userPreferences.snapToEdges;
    isAltHeld = false;
    isCmdCtrlHeld = false;
    axisConstraintMode = null;
    startX = 100;
    startY = 100;
    currentRectangle = null;
  },
  afterEach: function() {
    if (currentRectangle && currentRectangle.parentNode) {
      currentRectangle.parentNode.removeChild(currentRectangle);
    }
    currentRectangle = null;
    isDrawingMode = false;
    isCurrentlyDrawing = false;
    isAltHeld = false;
    isCmdCtrlHeld = false;
    axisConstraintMode = null;
    userPreferences.snapToEdges = this.snapToEdges;
  }
});

QUnit.test("No constraint when Shift is not held", function(assert) {
  var result = calculateRectCoords(250, 180);
  assert.strictEqual(result.width, 150, "width is free-form");
  assert.strictEqual(result.height, 80, "height is free-form");
});

QUnit.test("Shift does not constrain when dragging wider", function(assert) {
  var result = calculateRectCoords(300, 180);

  assert.strictEqual(result.width, 200, "width follows horizontal drag");
  assert.strictEqual(result.height, 80, "height follows vertical drag");
});

QUnit.test("Shift does not constrain when dragging taller", function(assert) {
  var result = calculateRectCoords(160, 250);

  assert.strictEqual(result.width, 60, "width follows horizontal drag");
  assert.strictEqual(result.height, 150, "height follows vertical drag");
});

QUnit.test("Shift preserves free-form direction when dragging right-down", function(assert) {
  var result = calculateRectCoords(300, 180);

  assert.strictEqual(result.x, 100, "x = startX");
  assert.strictEqual(result.y, 100, "y = startY");
  assert.strictEqual(result.width, 200, "width follows horizontal drag");
  assert.strictEqual(result.height, 80, "height follows vertical drag");
});

QUnit.test("Shift preserves free-form direction when dragging left-up", function(assert) {
  var result = calculateRectCoords(-20, 20);

  assert.strictEqual(result.width, 120, "width follows horizontal drag");
  assert.strictEqual(result.height, 80, "height follows vertical drag");
  assert.strictEqual(result.x, -20, "x follows currentX");
  assert.strictEqual(result.y, 20, "y follows currentY");
});

QUnit.test("Shift preserves free-form direction when dragging right-up", function(assert) {
  var result = calculateRectCoords(180, -50);

  assert.strictEqual(result.width, 80, "width follows horizontal drag");
  assert.strictEqual(result.height, 150, "height follows vertical drag");
  assert.strictEqual(result.x, 100, "x = startX");
  assert.strictEqual(result.y, -50, "y follows currentY");
});

QUnit.test("Shift preserves free-form direction when dragging left-down", function(assert) {
  var result = calculateRectCoords(-100, 190);

  assert.strictEqual(result.width, 200, "width follows horizontal drag");
  assert.strictEqual(result.height, 90, "height follows vertical drag");
  assert.strictEqual(result.x, -100, "x follows currentX");
  assert.strictEqual(result.y, 100, "y = startY");
});

QUnit.test("Shift does not constrain Alt center-outward drawing", function(assert) {
  isAltHeld = true;

  var result = calculateRectCoords(300, 180);

  assert.strictEqual(result.width, 400, "width uses horizontal radius");
  assert.strictEqual(result.height, 160, "height uses vertical radius");
  assert.strictEqual(result.x, -100, "x = startX - horizontal radius");
  assert.strictEqual(result.y, 20, "y = startY - vertical radius");
});

QUnit.test("Shift mousemove keeps active drawing free-form", function(assert) {
  isDrawingMode = true;
  isCurrentlyDrawing = true;
  startX = 100;
  startY = 100;
  userPreferences.snapToEdges = false;
  currentRectangle = createRectangle(100, 100, 0, 0);
  document.body.appendChild(currentRectangle);

  var event = new MouseEvent("mousemove", {
    clientX: 300,
    clientY: 180,
    shiftKey: true,
    bubbles: true,
    cancelable: true
  });
  var preventDefaultCalled = false;
  event.preventDefault = function() { preventDefaultCalled = true; };

  handleMouseMove(event);

  assert.strictEqual(currentRectangle.style.left, "100px", "left stays anchored");
  assert.strictEqual(currentRectangle.style.top, "100px", "top stays anchored");
  assert.strictEqual(currentRectangle.style.width, "200px", "width follows horizontal drag");
  assert.strictEqual(currentRectangle.style.height, "80px", "height follows vertical drag");
  assert.ok(preventDefaultCalled, "mousemove is handled");
});
