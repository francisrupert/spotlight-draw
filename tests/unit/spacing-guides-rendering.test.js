/**
 * Unit Tests: Spacing Guides - DOM Rendering
 *
 * Tests the showSpacingGuides() function which renders visual guide lines
 * for even spacing feature. These tests validate DOM element creation,
 * positioning, styling, and cleanup behavior.
 */

QUnit.module("Spacing Guides - DOM Rendering", {
  beforeEach: function() {
    spacingGuideElements = [];
    // Clear existing guides from DOM
    var existingGuides = document.querySelectorAll("div[style*='GrayText']");
    existingGuides.forEach(function(guide) {
      if (guide.parentNode) guide.parentNode.removeChild(guide);
    });
  },
  afterEach: function() {
    // Cleanup guides
    for (var i = 0; i < spacingGuideElements.length; i++) {
      if (spacingGuideElements[i] && spacingGuideElements[i].parentNode) {
        spacingGuideElements[i].parentNode.removeChild(spacingGuideElements[i]);
      }
    }
    spacingGuideElements = [];
  }
});

QUnit.test("creates horizontal spacing guide (vertical line)", function(assert) {
  var guides = [{
    axis: 'horizontal',
    gapStart: 100,
    gapEnd: 300,
    between: null,
    referenceRects: [
      { left: 50, top: 100, width: 50, height: 100 },
      { left: 300, top: 150, width: 50, height: 100 }
    ]
  }];

  showSpacingGuides(guides);

  assert.equal(spacingGuideElements.length, 1, "one guide element created");

  var guide = spacingGuideElements[0];
  assert.ok(guide, "guide element exists");
  assert.equal(guide.style.position, "fixed", "fixed positioning");
  assert.equal(guide.style.pointerEvents, "none", "pointer events disabled");
  assert.equal(guide.style.borderTop, "1px solid GrayText", "border style correct");
  assert.equal(guide.style.height, "0px", "zero height (horizontal line)");
  assert.equal(guide.style.left, "100px", "positioned at gap start");
  assert.equal(guide.style.width, "200px", "spans gap width (300-100)");
  assert.ok(guide.parentNode === document.body, "appended to document.body");
});

QUnit.test("creates vertical spacing guide (horizontal line)", function(assert) {
  var guides = [{
    axis: 'vertical',
    gapStart: 200,
    gapEnd: 500,
    between: null,
    referenceRects: [
      { left: 100, top: 50, width: 100, height: 50 },
      { left: 150, top: 500, width: 100, height: 50 }
    ]
  }];

  showSpacingGuides(guides);

  assert.equal(spacingGuideElements.length, 1, "one guide element created");

  var guide = spacingGuideElements[0];
  assert.equal(guide.style.borderLeft, "1px solid GrayText", "border style correct");
  assert.equal(guide.style.width, "0px", "zero width (vertical line)");
  assert.equal(guide.style.top, "200px", "positioned at gap start");
  assert.equal(guide.style.height, "300px", "spans gap height (500-200)");
});

QUnit.test("renders multiple guides simultaneously", function(assert) {
  var guides = [
    {
      axis: 'horizontal',
      gapStart: 100,
      gapEnd: 300,
      between: null,
      referenceRects: [
        { left: 50, top: 100, width: 50, height: 100 },
        { left: 300, top: 100, width: 50, height: 100 }
      ]
    },
    {
      axis: 'horizontal',
      gapStart: 400,
      gapEnd: 600,
      between: null,
      referenceRects: [
        { left: 300, top: 100, width: 50, height: 100 },
        { left: 600, top: 100, width: 50, height: 100 }
      ]
    }
  ];

  showSpacingGuides(guides);

  assert.equal(spacingGuideElements.length, 2, "two guide elements created");
  assert.ok(spacingGuideElements[0].parentNode === document.body, "first guide in DOM");
  assert.ok(spacingGuideElements[1].parentNode === document.body, "second guide in DOM");
  assert.equal(spacingGuideElements[0].style.left, "100px", "first guide at first position");
  assert.equal(spacingGuideElements[1].style.left, "400px", "second guide at second position");
});

QUnit.test("removes previous guides before creating new ones", function(assert) {
  // First call - create one guide
  var guides1 = [{
    axis: 'horizontal',
    gapStart: 100,
    gapEnd: 300,
    between: null,
    referenceRects: [
      { left: 50, top: 100, width: 50, height: 100 },
      { left: 300, top: 100, width: 50, height: 100 }
    ]
  }];

  showSpacingGuides(guides1);
  var firstGuide = spacingGuideElements[0];
  assert.equal(spacingGuideElements.length, 1, "first call creates one guide");

  // Second call - create different guide
  var guides2 = [{
    axis: 'vertical',
    gapStart: 200,
    gapEnd: 400,
    between: null,
    referenceRects: [
      { left: 100, top: 50, width: 100, height: 50 },
      { left: 100, top: 400, width: 100, height: 50 }
    ]
  }];

  showSpacingGuides(guides2);

  assert.equal(spacingGuideElements.length, 1, "only new guide remains");
  assert.notOk(firstGuide.parentNode, "first guide removed from DOM");
  assert.equal(spacingGuideElements[0].style.top, "200px", "new guide created");
});

QUnit.test("handles empty guides array (cleanup only)", function(assert) {
  // Create initial guides
  var guides = [{
    axis: 'horizontal',
    gapStart: 100,
    gapEnd: 300,
    between: null,
    referenceRects: [
      { left: 50, top: 100, width: 50, height: 100 },
      { left: 300, top: 100, width: 50, height: 100 }
    ]
  }];

  showSpacingGuides(guides);
  assert.equal(spacingGuideElements.length, 1, "guide created");

  // Call with empty array
  showSpacingGuides([]);

  assert.equal(spacingGuideElements.length, 0, "array length is zero");

  // Check DOM has no guide elements with GrayText border
  var guidesInDOM = document.querySelectorAll("div[style*='GrayText']");
  assert.equal(guidesInDOM.length, 0, "no guide elements in DOM");
});

QUnit.test("guides have correct z-index and pointer-events", function(assert) {
  var guides = [{
    axis: 'horizontal',
    gapStart: 100,
    gapEnd: 300,
    between: null,
    referenceRects: [
      { left: 50, top: 100, width: 50, height: 100 },
      { left: 300, top: 100, width: 50, height: 100 }
    ]
  }];

  showSpacingGuides(guides);

  var guide = spacingGuideElements[0];
  assert.equal(guide.style.zIndex, Z_INDEX_GUIDE.toString(), "z-index uses Z_INDEX_GUIDE constant");
  assert.equal(guide.style.pointerEvents, "none", "pointer-events set to none for click-through");
});

QUnit.test("positions guides at vertical midpoint for horizontal spacing", function(assert) {
  var guides = [{
    axis: 'horizontal',
    gapStart: 100,
    gapEnd: 300,
    between: null,
    referenceRects: [
      { left: 50, top: 100, width: 50, height: 50 },  // bottom at 150
      { left: 300, top: 200, width: 50, height: 100 } // bottom at 300
    ]
  }];

  showSpacingGuides(guides);

  // Expected midpoint: (min(100, 200) + max(150, 300)) / 2 = (100 + 300) / 2 = 200
  var guide = spacingGuideElements[0];
  assert.equal(guide.style.top, "200px", "guide positioned at vertical midpoint");
});

QUnit.test("uses referenceRects when between is null", function(assert) {
  // Test the left/right positioning case where between is null
  var guides = [{
    axis: 'horizontal',
    gapStart: 100,
    gapEnd: 300,
    between: null,
    referenceRects: [
      { left: 50, top: 100, width: 50, height: 100 },
      { left: 300, top: 150, width: 50, height: 100 }
    ]
  }];

  showSpacingGuides(guides);

  var guide = spacingGuideElements[0];
  // Should calculate midpoint from referenceRects
  // topExtent = min(100, 150) = 100
  // bottomExtent = max(200, 250) = 250
  // midY = (100 + 250) / 2 = 175
  assert.equal(guide.style.top, "175px", "uses referenceRects for midpoint calculation");
  assert.ok(guide.parentNode, "guide created successfully");
});
