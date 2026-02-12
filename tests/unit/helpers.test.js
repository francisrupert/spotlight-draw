/**
 * Unit Tests: Helper Functions
 *
 * Tests pure helper functions extracted during refactoring:
 * - getRectBounds() - Extract bounds from rectangle element
 * - clampMouse() - Clamp mouse coordinates to viewport
 * - applyAxisLock() - Apply Shift key axis locking
 * - removeColorClasses() - Remove all color classes from element
 * - resetDragState() - Reset dragging state variables
 * - getEvenSpacingTargets() - Generate even spacing snap targets
 * - updateHoverCursors() - Update cursor classes on modifier key changes
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

// ============================================================================
// getEvenSpacingTargets() Tests
// ============================================================================

QUnit.module("Helper Functions - getEvenSpacingTargets", {
  beforeEach: function() {
    // Clear placed rectangles
    placedRectangles = [];
  },
  afterEach: function() {
    // Clean up
    placedRectangles = [];
  }
});

QUnit.test("finds horizontal even spacing between two rectangles", function(assert) {
  // Create two rectangles with a gap of 200px
  // Rect A: x=0, width=100 (right edge at 100)
  // Rect B: x=300, width=100 (left edge at 300)
  // Gap: 200px (300 - 100)
  var rectA = document.createElement("div");
  rectA.style.left = "0px";
  rectA.style.top = "100px";
  rectA.style.width = "100px";
  rectA.style.height = "100px";
  placedRectangles.push(rectA);

  var rectB = document.createElement("div");
  rectB.style.left = "300px";
  rectB.style.top = "100px";
  rectB.style.width = "100px";
  rectB.style.height = "100px";
  placedRectangles.push(rectB);

  // Moving rectangle: width=50
  var movingRect = document.createElement("div");
  movingRect.style.left = "150px";
  movingRect.style.top = "100px";
  movingRect.style.width = "50px";
  movingRect.style.height = "50px";

  var targets = getEvenSpacingTargets(movingRect, null);

  assert.equal(targets.horizontal.length, 1, "found one horizontal spacing target");
  assert.equal(targets.horizontal[0].position, 175, "even position calculated correctly (100 + 75)");
  assert.equal(targets.horizontal[0].gap, 75, "gap size calculated correctly ((200 - 50) / 2)");
});

QUnit.test("finds vertical even spacing between two rectangles", function(assert) {
  // Create two rectangles with a vertical gap of 200px
  var rectA = document.createElement("div");
  rectA.style.left = "100px";
  rectA.style.top = "0px";
  rectA.style.width = "100px";
  rectA.style.height = "100px";
  placedRectangles.push(rectA);

  var rectB = document.createElement("div");
  rectB.style.left = "100px";
  rectB.style.top = "300px";
  rectB.style.width = "100px";
  rectB.style.height = "100px";
  placedRectangles.push(rectB);

  // Moving rectangle: height=50
  var movingRect = document.createElement("div");
  movingRect.style.left = "100px";
  movingRect.style.top = "150px";
  movingRect.style.width = "50px";
  movingRect.style.height = "50px";

  var targets = getEvenSpacingTargets(movingRect, null);

  assert.equal(targets.vertical.length, 1, "found one vertical spacing target");
  assert.equal(targets.vertical[0].position, 175, "even position calculated correctly (100 + 75)");
  assert.equal(targets.vertical[0].gap, 75, "gap size calculated correctly");
});

QUnit.test("ignores gaps where rectangle is too large to fit", function(assert) {
  // Create two rectangles with a small gap of 40px
  var rectA = document.createElement("div");
  rectA.style.left = "0px";
  rectA.style.top = "100px";
  rectA.style.width = "100px";
  rectA.style.height = "100px";
  placedRectangles.push(rectA);

  var rectB = document.createElement("div");
  rectB.style.left = "140px";
  rectB.style.top = "100px";
  rectB.style.width = "100px";
  rectB.style.height = "100px";
  placedRectangles.push(rectB);

  // Moving rectangle: width=50 (too large for 40px gap)
  var movingRect = document.createElement("div");
  movingRect.style.left = "120px";
  movingRect.style.top = "100px";
  movingRect.style.width = "50px";
  movingRect.style.height = "50px";

  var targets = getEvenSpacingTargets(movingRect, null);

  assert.equal(targets.horizontal.length, 0, "no spacing target when rectangle too large");
});

QUnit.test("handles multiple spacing opportunities", function(assert) {
  // Create three rectangles in a row with gaps
  var rectA = document.createElement("div");
  rectA.style.left = "0px";
  rectA.style.top = "100px";
  rectA.style.width = "100px";
  rectA.style.height = "100px";
  placedRectangles.push(rectA);

  var rectB = document.createElement("div");
  rectB.style.left = "300px";
  rectB.style.top = "100px";
  rectB.style.width = "100px";
  rectB.style.height = "100px";
  placedRectangles.push(rectB);

  var rectC = document.createElement("div");
  rectC.style.left = "600px";
  rectC.style.top = "100px";
  rectC.style.width = "100px";
  rectC.style.height = "100px";
  placedRectangles.push(rectC);

  // Moving rectangle: width=50
  var movingRect = document.createElement("div");
  movingRect.style.left = "150px";
  movingRect.style.top = "100px";
  movingRect.style.width = "50px";
  movingRect.style.height = "50px";

  var targets = getEvenSpacingTargets(movingRect, null);

  // With 2 pairs of rectangles (A-B and B-C), each generates 3 targets:
  // between, left, and right = 6 total
  assert.equal(targets.horizontal.length, 6, "found six horizontal spacing targets (3 per pair)");
});

QUnit.test("excludes specified rectangle from calculations", function(assert) {
  var rectA = document.createElement("div");
  rectA.style.left = "0px";
  rectA.style.top = "100px";
  rectA.style.width = "100px";
  rectA.style.height = "100px";
  placedRectangles.push(rectA);

  var rectB = document.createElement("div");
  rectB.style.left = "300px";
  rectB.style.top = "100px";
  rectB.style.width = "100px";
  rectB.style.height = "100px";
  placedRectangles.push(rectB);

  // Moving rectangle
  var movingRect = document.createElement("div");
  movingRect.style.left = "150px";
  movingRect.style.top = "100px";
  movingRect.style.width = "50px";
  movingRect.style.height = "50px";

  // Exclude rectB from calculations
  var targets = getEvenSpacingTargets(movingRect, rectB);

  assert.equal(targets.horizontal.length, 0, "no spacing targets when only one rectangle remains");
});

QUnit.test("handles no rectangles", function(assert) {
  var movingRect = document.createElement("div");
  movingRect.style.left = "150px";
  movingRect.style.top = "100px";
  movingRect.style.width = "50px";
  movingRect.style.height = "50px";

  var targets = getEvenSpacingTargets(movingRect, null);

  assert.equal(targets.horizontal.length, 0, "no horizontal targets with no rectangles");
  assert.equal(targets.vertical.length, 0, "no vertical targets with no rectangles");
});

QUnit.test("ignores overlapping rectangles", function(assert) {
  // Create two overlapping rectangles (no gap)
  var rectA = document.createElement("div");
  rectA.style.left = "0px";
  rectA.style.top = "100px";
  rectA.style.width = "100px";
  rectA.style.height = "100px";
  placedRectangles.push(rectA);

  var rectB = document.createElement("div");
  rectB.style.left = "50px";
  rectB.style.top = "100px";
  rectB.style.width = "100px";
  rectB.style.height = "100px";
  placedRectangles.push(rectB);

  var movingRect = document.createElement("div");
  movingRect.style.left = "75px";
  movingRect.style.top = "100px";
  movingRect.style.width = "30px";
  movingRect.style.height = "30px";

  var targets = getEvenSpacingTargets(movingRect, null);

  assert.equal(targets.horizontal.length, 0, "no spacing targets for overlapping rectangles");
});

QUnit.test("finds left positioning target for even spacing", function(assert) {
  // Create two rectangles with a gap of 200px
  // Rect A: x=200-300
  // Rect B: x=500-600
  // Gap A-B: 200px
  // Moving rect to LEFT of A to match gap: should position at x=-100 (so gap from C to A is also 200px)
  var rectA = document.createElement("div");
  rectA.style.left = "200px";
  rectA.style.top = "100px";
  rectA.style.width = "100px";
  rectA.style.height = "100px";
  placedRectangles.push(rectA);

  var rectB = document.createElement("div");
  rectB.style.left = "500px";
  rectB.style.top = "100px";
  rectB.style.width = "100px";
  rectB.style.height = "100px";
  placedRectangles.push(rectB);

  // Moving rectangle: width=100
  var movingRect = document.createElement("div");
  movingRect.style.left = "0px";
  movingRect.style.top = "100px";
  movingRect.style.width = "100px";
  movingRect.style.height = "100px";

  var targets = getEvenSpacingTargets(movingRect, null);

  // Should find 3 targets: between, left of A, right of B
  assert.equal(targets.horizontal.length, 3, "found three horizontal spacing targets");

  // Find the left positioning target
  var leftTarget = targets.horizontal.find(function(t) {
    return t.position === 0; // Should be at x=0 (200 - 200 gap - 0 for left edge)
  });
  assert.ok(leftTarget, "found left positioning target");
  assert.equal(leftTarget.gap, 200, "gap matches the A-B gap");
  assert.equal(leftTarget.between, null, "between is null for left positioning");
  assert.ok(leftTarget.referenceRects, "has referenceRects");
});

QUnit.test("finds right positioning target for even spacing", function(assert) {
  // Create two rectangles with a gap of 200px
  // Rect A: x=0-100
  // Rect B: x=300-400
  // Gap A-B: 200px
  // Moving rect to RIGHT of B to match gap: should position at x=600 (400 + 200 gap)
  var rectA = document.createElement("div");
  rectA.style.left = "0px";
  rectA.style.top = "100px";
  rectA.style.width = "100px";
  rectA.style.height = "100px";
  placedRectangles.push(rectA);

  var rectB = document.createElement("div");
  rectB.style.left = "300px";
  rectB.style.top = "100px";
  rectB.style.width = "100px";
  rectB.style.height = "100px";
  placedRectangles.push(rectB);

  // Moving rectangle: width=100
  var movingRect = document.createElement("div");
  movingRect.style.left = "500px";
  movingRect.style.top = "100px";
  movingRect.style.width = "100px";
  movingRect.style.height = "100px";

  var targets = getEvenSpacingTargets(movingRect, null);

  // Should find 3 targets: between, left of A, right of B
  assert.equal(targets.horizontal.length, 3, "found three horizontal spacing targets");

  // Find the right positioning target
  var rightTarget = targets.horizontal.find(function(t) {
    return t.position === 600; // Should be at x=600 (400 + 200 gap)
  });
  assert.ok(rightTarget, "found right positioning target");
  assert.equal(rightTarget.gap, 200, "gap matches the A-B gap");
  assert.equal(rightTarget.between, null, "between is null for right positioning");
  assert.ok(rightTarget.referenceRects, "has referenceRects");
});

QUnit.test("finds above positioning target for vertical even spacing", function(assert) {
  // Create two rectangles with a vertical gap of 200px
  // Rect A: y=200-300
  // Rect B: y=500-600
  // Gap A-B: 200px
  // Moving rect ABOVE A to match gap: should position at y=0 (200 - 200 gap)
  var rectA = document.createElement("div");
  rectA.style.left = "100px";
  rectA.style.top = "200px";
  rectA.style.width = "100px";
  rectA.style.height = "100px";
  placedRectangles.push(rectA);

  var rectB = document.createElement("div");
  rectB.style.left = "100px";
  rectB.style.top = "500px";
  rectB.style.width = "100px";
  rectB.style.height = "100px";
  placedRectangles.push(rectB);

  // Moving rectangle: height=100
  var movingRect = document.createElement("div");
  movingRect.style.left = "100px";
  movingRect.style.top = "0px";
  movingRect.style.width = "100px";
  movingRect.style.height = "100px";

  var targets = getEvenSpacingTargets(movingRect, null);

  // Should find 3 targets: between, above A, below B
  assert.equal(targets.vertical.length, 3, "found three vertical spacing targets");

  // Find the above positioning target
  var aboveTarget = targets.vertical.find(function(t) {
    return t.position === 0;
  });
  assert.ok(aboveTarget, "found above positioning target");
  assert.equal(aboveTarget.gap, 200, "gap matches the A-B gap");
});

QUnit.test("finds below positioning target for vertical even spacing", function(assert) {
  // Create two rectangles with a vertical gap of 200px
  // Rect A: y=0-100
  // Rect B: y=300-400
  // Gap A-B: 200px
  // Moving rect BELOW B to match gap: should position at y=600 (400 + 200 gap)
  var rectA = document.createElement("div");
  rectA.style.left = "100px";
  rectA.style.top = "0px";
  rectA.style.width = "100px";
  rectA.style.height = "100px";
  placedRectangles.push(rectA);

  var rectB = document.createElement("div");
  rectB.style.left = "100px";
  rectB.style.top = "300px";
  rectB.style.width = "100px";
  rectB.style.height = "100px";
  placedRectangles.push(rectB);

  // Moving rectangle: height=100
  var movingRect = document.createElement("div");
  movingRect.style.left = "100px";
  movingRect.style.top = "500px";
  movingRect.style.width = "100px";
  movingRect.style.height = "100px";

  var targets = getEvenSpacingTargets(movingRect, null);

  // Should find 3 targets: between, above A, below B
  assert.equal(targets.vertical.length, 3, "found three vertical spacing targets");

  // Find the below positioning target
  var belowTarget = targets.vertical.find(function(t) {
    return t.position === 600;
  });
  assert.ok(belowTarget, "found below positioning target");
  assert.equal(belowTarget.gap, 200, "gap matches the A-B gap");
});

// ============================================================================
// updateHoverCursors() Tests
// ============================================================================

QUnit.module("Helper Functions - updateHoverCursors", {
  beforeEach: function() {
    // Enable drawing mode and reset state
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
    // Clean up rectangles
    for (var i = 0; i < placedRectangles.length; i++) {
      if (placedRectangles[i].parentNode) {
        placedRectangles[i].parentNode.removeChild(placedRectangles[i]);
      }
    }
    placedRectangles = [];
  }
});

QUnit.test("adds repositioning class when Cmd/Ctrl held over rectangle", function(assert) {
  var rect = document.createElement("div");
  rect.style.cssText = "position:fixed;left:100px;top:100px;width:200px;height:200px;";
  document.body.appendChild(rect);
  placedRectangles.push(rect);

  currentMouseX = 150;
  currentMouseY = 150;

  updateHoverCursors(true, false);

  assert.ok(
    document.documentElement.classList.contains("spotlight-draw-repositioning-mode"),
    "repositioning class added"
  );
  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-duplication-hover-mode"),
    "duplication class not added"
  );
});

QUnit.test("removes repositioning class when Cmd/Ctrl held but not over rectangle", function(assert) {
  document.documentElement.classList.add("spotlight-draw-repositioning-mode");

  currentMouseX = 500;
  currentMouseY = 500;

  updateHoverCursors(true, false);

  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-repositioning-mode"),
    "repositioning class removed"
  );
});

QUnit.test("adds duplication class when Alt held over rectangle", function(assert) {
  var rect = document.createElement("div");
  rect.style.cssText = "position:fixed;left:100px;top:100px;width:200px;height:200px;";
  document.body.appendChild(rect);
  placedRectangles.push(rect);

  currentMouseX = 150;
  currentMouseY = 150;

  updateHoverCursors(false, true);

  assert.ok(
    document.documentElement.classList.contains("spotlight-draw-duplication-hover-mode"),
    "duplication class added"
  );
  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-repositioning-mode"),
    "repositioning class not added"
  );
});

QUnit.test("removes duplication class when Alt held but not over rectangle", function(assert) {
  document.documentElement.classList.add("spotlight-draw-duplication-hover-mode");

  currentMouseX = 500;
  currentMouseY = 500;

  updateHoverCursors(false, true);

  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-duplication-hover-mode"),
    "duplication class removed"
  );
});

QUnit.test("Alt takes priority over Cmd/Ctrl (duplication class shown)", function(assert) {
  var rect = document.createElement("div");
  rect.style.cssText = "position:fixed;left:100px;top:100px;width:200px;height:200px;";
  document.body.appendChild(rect);
  placedRectangles.push(rect);

  currentMouseX = 150;
  currentMouseY = 150;

  updateHoverCursors(true, true);

  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-repositioning-mode"),
    "repositioning class not added when Alt also held"
  );
  assert.ok(
    document.documentElement.classList.contains("spotlight-draw-duplication-hover-mode"),
    "duplication class added (Alt wins over Cmd/Ctrl)"
  );
});

QUnit.test("removes both classes when no modifier keys held", function(assert) {
  document.documentElement.classList.add("spotlight-draw-repositioning-mode");
  document.documentElement.classList.add("spotlight-draw-duplication-hover-mode");

  updateHoverCursors(false, false);

  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-repositioning-mode"),
    "repositioning class removed"
  );
  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-duplication-hover-mode"),
    "duplication class removed"
  );
});

QUnit.test("no-op when not in drawing mode", function(assert) {
  isDrawingMode = false;
  document.documentElement.classList.add("spotlight-draw-repositioning-mode");

  updateHoverCursors(true, false);

  assert.ok(
    document.documentElement.classList.contains("spotlight-draw-repositioning-mode"),
    "class unchanged when drawing mode disabled"
  );
});

QUnit.test("no-op when currently drawing", function(assert) {
  isCurrentlyDrawing = true;

  var rect = document.createElement("div");
  rect.style.cssText = "position:fixed;left:100px;top:100px;width:200px;height:200px;";
  document.body.appendChild(rect);
  placedRectangles.push(rect);

  currentMouseX = 150;
  currentMouseY = 150;

  updateHoverCursors(true, false);

  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-repositioning-mode"),
    "class not added during active drawing"
  );
});

QUnit.test("no-op when duplicating", function(assert) {
  isDuplicating = true;

  updateHoverCursors(true, false);

  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-repositioning-mode"),
    "class not added during duplication"
  );
});

QUnit.test("no-op when repositioning", function(assert) {
  isRepositioning = true;

  updateHoverCursors(false, true);

  assert.notOk(
    document.documentElement.classList.contains("spotlight-draw-duplication-hover-mode"),
    "class not added during repositioning"
  );
});
