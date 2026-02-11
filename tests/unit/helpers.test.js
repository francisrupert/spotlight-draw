/**
 * Unit Tests: Helper Functions
 *
 * Tests pure helper functions extracted during refactoring:
 * - getRectBounds() - Extract bounds from rectangle element
 * - clampMouse() - Clamp mouse coordinates to viewport
 * - applyAxisLock() - Apply Shift key axis locking
 * - removeColorClasses() - Remove all color classes from element
 * - resetDragState() - Reset dragging state variables
 */

QUnit.module("Helper Functions - getRectBounds", {
  beforeEach: function() {
    this.rect = document.createElement("div");
    this.rect.className = "box-highlight-rectangle";
  },
  afterEach: function() {
    if (this.rect.parentNode) {
      this.rect.parentNode.removeChild(this.rect);
    }
  }
});

QUnit.test("extracts bounds from rectangle element", function(assert) {
  this.rect.style.left = "100px";
  this.rect.style.top = "200px";
  this.rect.style.width = "300px";
  this.rect.style.height = "400px";

  var bounds = getRectBounds(this.rect);

  assert.equal(bounds.left, 100, "left position extracted");
  assert.equal(bounds.top, 200, "top position extracted");
  assert.equal(bounds.width, 300, "width extracted");
  assert.equal(bounds.height, 400, "height extracted");
});

QUnit.test("handles fractional pixels (parses as integers)", function(assert) {
  this.rect.style.left = "100.7px";
  this.rect.style.top = "200.3px";
  this.rect.style.width = "300.9px";
  this.rect.style.height = "400.1px";

  var bounds = getRectBounds(this.rect);

  assert.equal(bounds.left, 100, "left parsed as integer");
  assert.equal(bounds.top, 200, "top parsed as integer");
  assert.equal(bounds.width, 300, "width parsed as integer");
  assert.equal(bounds.height, 400, "height parsed as integer");
});

QUnit.test("handles zero values", function(assert) {
  this.rect.style.left = "0px";
  this.rect.style.top = "0px";
  this.rect.style.width = "0px";
  this.rect.style.height = "0px";

  var bounds = getRectBounds(this.rect);

  assert.equal(bounds.left, 0, "left is zero");
  assert.equal(bounds.top, 0, "top is zero");
  assert.equal(bounds.width, 0, "width is zero");
  assert.equal(bounds.height, 0, "height is zero");
});

QUnit.test("handles large viewport values", function(assert) {
  this.rect.style.left = "5000px";
  this.rect.style.top = "10000px";
  this.rect.style.width = "2000px";
  this.rect.style.height = "3000px";

  var bounds = getRectBounds(this.rect);

  assert.equal(bounds.left, 5000, "large left value");
  assert.equal(bounds.top, 10000, "large top value");
  assert.equal(bounds.width, 2000, "large width value");
  assert.equal(bounds.height, 3000, "large height value");
});

// ============================================================================
// clampMouse() Tests
// ============================================================================

QUnit.module("Helper Functions - clampMouse");

QUnit.test("clamps negative coordinates to zero", function(assert) {
  var result = clampMouse(-10, -20);

  assert.equal(result.x, 0, "negative X clamped to 0");
  assert.equal(result.y, 0, "negative Y clamped to 0");
});

QUnit.test("clamps coordinates beyond viewport to max bounds", function(assert) {
  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;

  var result = clampMouse(viewportWidth + 100, viewportHeight + 200);

  assert.equal(result.x, viewportWidth, "X clamped to viewport width");
  assert.equal(result.y, viewportHeight, "Y clamped to viewport height");
});

QUnit.test("preserves coordinates within viewport bounds", function(assert) {
  var result = clampMouse(500, 300);

  assert.equal(result.x, 500, "valid X unchanged");
  assert.equal(result.y, 300, "valid Y unchanged");
});

QUnit.test("handles edge case at viewport boundaries", function(assert) {
  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;

  var result = clampMouse(viewportWidth, viewportHeight);

  assert.equal(result.x, viewportWidth, "X at max boundary");
  assert.equal(result.y, viewportHeight, "Y at max boundary");
});

QUnit.test("handles zero coordinates", function(assert) {
  var result = clampMouse(0, 0);

  assert.equal(result.x, 0, "zero X unchanged");
  assert.equal(result.y, 0, "zero Y unchanged");
});

// ============================================================================
// applyAxisLock() Tests
// ============================================================================

QUnit.module("Helper Functions - applyAxisLock");

QUnit.test("no axis lock when Shift not held", function(assert) {
  var result = applyAxisLock(200, 350, 100, 200, false);

  assert.equal(result.x, 200, "X unchanged without Shift");
  assert.equal(result.y, 350, "Y unchanged without Shift");
});

QUnit.test("locks to horizontal axis when X delta is larger", function(assert) {
  // Start: (100, 200), Current: (300, 250)
  // Delta X: 200, Delta Y: 50 -> Lock to X axis
  var result = applyAxisLock(300, 250, 100, 200, true);

  assert.equal(result.x, 300, "X preserves movement");
  assert.equal(result.y, 200, "Y locked to start position");
});

QUnit.test("locks to vertical axis when Y delta is larger", function(assert) {
  // Start: (100, 200), Current: (150, 500)
  // Delta X: 50, Delta Y: 300 -> Lock to Y axis
  var result = applyAxisLock(150, 500, 100, 200, true);

  assert.equal(result.x, 100, "X locked to start position");
  assert.equal(result.y, 500, "Y preserves movement");
});

QUnit.test("handles equal deltas (defaults to horizontal)", function(assert) {
  // Start: (100, 200), Current: (200, 300)
  // Delta X: 100, Delta Y: 100 -> Equal, lock to X
  var result = applyAxisLock(200, 300, 100, 200, true);

  assert.equal(result.x, 200, "X preserves movement on tie");
  assert.equal(result.y, 200, "Y locked to start position on tie");
});

QUnit.test("handles negative deltas", function(assert) {
  // Start: (200, 300), Current: (50, 250)
  // Delta X: 150, Delta Y: 50 -> Lock to X axis
  var result = applyAxisLock(50, 250, 200, 300, true);

  assert.equal(result.x, 50, "X preserves backward movement");
  assert.equal(result.y, 300, "Y locked to start position");
});

QUnit.test("handles zero movement", function(assert) {
  var result = applyAxisLock(100, 200, 100, 200, true);

  assert.equal(result.x, 100, "X unchanged with no movement");
  assert.equal(result.y, 200, "Y unchanged with no movement");
});

// ============================================================================
// removeColorClasses() Tests
// ============================================================================

QUnit.module("Helper Functions - removeColorClasses", {
  beforeEach: function() {
    this.element = document.createElement("div");
  }
});

QUnit.test("removes single color class", function(assert) {
  this.element.className = "box-highlight-rectangle color-blue";

  removeColorClasses(this.element);

  assert.notOk(
    this.element.classList.contains("color-blue"),
    "color-blue removed"
  );
  assert.ok(
    this.element.classList.contains("box-highlight-rectangle"),
    "non-color class preserved"
  );
});

QUnit.test("removes multiple color classes", function(assert) {
  this.element.className = "box-highlight-rectangle color-blue color-red color-green";

  removeColorClasses(this.element);

  assert.notOk(this.element.classList.contains("color-blue"), "color-blue removed");
  assert.notOk(this.element.classList.contains("color-red"), "color-red removed");
  assert.notOk(this.element.classList.contains("color-green"), "color-green removed");
  assert.ok(
    this.element.classList.contains("box-highlight-rectangle"),
    "non-color class preserved"
  );
});

QUnit.test("handles element with no color classes", function(assert) {
  this.element.className = "box-highlight-rectangle other-class";

  removeColorClasses(this.element);

  assert.ok(
    this.element.classList.contains("box-highlight-rectangle"),
    "non-color classes unchanged"
  );
  assert.ok(
    this.element.classList.contains("other-class"),
    "non-color classes unchanged"
  );
});

QUnit.test("handles element with only color classes", function(assert) {
  this.element.className = "color-blue color-red";

  removeColorClasses(this.element);

  assert.equal(this.element.className, "", "all classes removed");
});

QUnit.test("preserves non-color classes in correct order", function(assert) {
  this.element.className = "class-a color-blue class-b color-red class-c";

  removeColorClasses(this.element);

  assert.ok(this.element.classList.contains("class-a"), "class-a preserved");
  assert.ok(this.element.classList.contains("class-b"), "class-b preserved");
  assert.ok(this.element.classList.contains("class-c"), "class-c preserved");
  assert.notOk(this.element.classList.contains("color-blue"), "color-blue removed");
  assert.notOk(this.element.classList.contains("color-red"), "color-red removed");
});

// ============================================================================
// resetDragState() Tests
// ============================================================================

QUnit.module("Helper Functions - resetDragState", {
  beforeEach: function() {
    // Set dragging state variables
    isDraggingRectangle = true;
    draggedRectangle = document.createElement("div");
    dragOffsetX = 25;
    dragOffsetY = 50;
    dragStartX = 100;
    dragStartY = 200;
  }
});

QUnit.test("resets all dragging state variables", function(assert) {
  resetDragState();

  assert.equal(isDraggingRectangle, false, "isDraggingRectangle reset");
  assert.equal(draggedRectangle, null, "draggedRectangle reset");
  assert.equal(dragOffsetX, 0, "dragOffsetX reset");
  assert.equal(dragOffsetY, 0, "dragOffsetY reset");
  assert.equal(dragStartX, 0, "dragStartX reset");
  assert.equal(dragStartY, 0, "dragStartY reset");
});

QUnit.test("can be called multiple times safely", function(assert) {
  resetDragState();
  resetDragState();
  resetDragState();

  assert.equal(isDraggingRectangle, false, "still false after multiple calls");
  assert.equal(draggedRectangle, null, "still null after multiple calls");
  assert.equal(dragOffsetX, 0, "still 0 after multiple calls");
  assert.equal(dragOffsetY, 0, "still 0 after multiple calls");
});

QUnit.test("resets state when already in reset state", function(assert) {
  resetDragState();

  // Call again when already reset
  resetDragState();

  assert.equal(isDraggingRectangle, false, "still false");
  assert.equal(draggedRectangle, null, "still null");
  assert.equal(dragOffsetX, 0, "still 0");
  assert.equal(dragOffsetY, 0, "still 0");
  assert.equal(dragStartX, 0, "still 0");
  assert.equal(dragStartY, 0, "still 0");
});
