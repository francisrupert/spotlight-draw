/**
 * Unit Tests: Quick Draw Gesture
 */

QUnit.module("Quick Draw Gesture", function(hooks) {
  var originalState = {};

  function quickMouseEvent(type, x, y, modifiers) {
    modifiers = modifiers || {};
    return new MouseEvent(type, {
      clientX: x,
      clientY: y,
      button: typeof modifiers.button === "number" ? modifiers.button : 0,
      ctrlKey: modifiers.ctrlKey !== false,
      altKey: modifiers.altKey !== false,
      metaKey: modifiers.metaKey !== false,
      bubbles: true,
      cancelable: true
    });
  }

  function quickKeyEvent(type, key, modifiers) {
    modifiers = modifiers || {};
    return new KeyboardEvent(type, {
      key: key,
      ctrlKey: modifiers.ctrlKey === true,
      altKey: modifiers.altKey === true,
      metaKey: modifiers.metaKey === true,
      bubbles: true,
      cancelable: true
    });
  }

  function rectangles() {
    return document.querySelectorAll(".spotlight-draw-rectangle");
  }

  hooks.beforeEach(function() {
    originalState = {
      isDrawingMode: window.isDrawingMode,
      isCurrentlyDrawing: window.isCurrentlyDrawing,
      isQuickDrawing: window.isQuickDrawing,
      isQuickDrawSpacebarDown: window.isQuickDrawSpacebarDown,
      isSpacebarHeld: window.isSpacebarHeld,
      currentRectangle: window.currentRectangle,
      quickDrawRectangle: window.quickDrawRectangle,
      quickDrawSuppressClickUntil: window.quickDrawSuppressClickUntil,
      panModeWidth: window.panModeWidth,
      panModeHeight: window.panModeHeight,
      panOffsetX: window.panOffsetX,
      panOffsetY: window.panOffsetY,
      placedRectangles: window.placedRectangles,
      userPreferences: {
        borderSize: window.userPreferences.borderSize,
        defaultColor: window.userPreferences.defaultColor,
        snapToEdges: window.userPreferences.snapToEdges
      }
    };

    window.resetChromeStorage();
    window.setChromeStorage({
      borderSize: "3",
      defaultColor: "spotlight-draw-rectangle--blue",
      snapToEdges: false
    });

    window.isDrawingMode = false;
    window.isCurrentlyDrawing = false;
    window.isQuickDrawSpacebarDown = false;
    window.isSpacebarHeld = false;
    window.currentRectangle = null;
    window.placedRectangles = [];
  });

  hooks.afterEach(function() {
    document.querySelectorAll(".spotlight-draw-rectangle").forEach(function(rect) {
      if (rect.parentNode) {
        rect.parentNode.removeChild(rect);
      }
    });
    document.documentElement.classList.remove("spotlight-draw-quick-draw-mode");
    document.documentElement.classList.remove("spotlight-draw-pan-mode");

    window.isDrawingMode = originalState.isDrawingMode;
    window.isCurrentlyDrawing = originalState.isCurrentlyDrawing;
    window.isQuickDrawing = originalState.isQuickDrawing;
    window.isQuickDrawSpacebarDown = originalState.isQuickDrawSpacebarDown;
    window.isSpacebarHeld = originalState.isSpacebarHeld;
    window.currentRectangle = originalState.currentRectangle;
    window.quickDrawRectangle = originalState.quickDrawRectangle;
    window.quickDrawSuppressClickUntil = originalState.quickDrawSuppressClickUntil;
    window.panModeWidth = originalState.panModeWidth;
    window.panModeHeight = originalState.panModeHeight;
    window.panOffsetX = originalState.panOffsetX;
    window.panOffsetY = originalState.panOffsetY;
    window.placedRectangles = originalState.placedRectangles;
    window.userPreferences.borderSize = originalState.userPreferences.borderSize;
    window.userPreferences.defaultColor = originalState.userPreferences.defaultColor;
    window.userPreferences.snapToEdges = originalState.userPreferences.snapToEdges;
    window.resetChromeStorage();
  });

  QUnit.test("draws a temporary rectangle without drawing mode", function(assert) {
    var done = assert.async();

    document.dispatchEvent(quickMouseEvent("mousedown", 100, 100));

    setTimeout(function() {
      document.dispatchEvent(quickMouseEvent("mousemove", 260, 180));

      var rect = rectangles()[0];
      assert.ok(rect, "temporary rectangle is created");
      assert.strictEqual(window.isDrawingMode, false, "drawing mode stays off");
      assert.strictEqual(window.placedRectangles.length, 0, "rectangle is not placed");
      if (rect) {
        assert.strictEqual(rect.style.left, "100px", "left is anchored at drag start");
        assert.strictEqual(rect.style.top, "100px", "top is anchored at drag start");
        assert.strictEqual(rect.style.width, "160px", "width follows the drag");
        assert.strictEqual(rect.style.height, "80px", "height follows the drag");
        assert.strictEqual(rect.style.borderWidth, "3px", "stored border size is used");
        assert.ok(rect.classList.contains("spotlight-draw-rectangle--blue"), "stored color is used");
      }

      done();
    }, 0);
  });

  QUnit.test("removes the temporary rectangle on mouseup", function(assert) {
    var done = assert.async();

    document.dispatchEvent(quickMouseEvent("mousedown", 100, 100));

    setTimeout(function() {
      document.dispatchEvent(quickMouseEvent("mousemove", 260, 180));
      assert.strictEqual(rectangles().length, 1, "temporary rectangle exists during drag");

      document.dispatchEvent(quickMouseEvent("mouseup", 260, 180));

      assert.strictEqual(rectangles().length, 0, "temporary rectangle is removed");
      assert.strictEqual(window.placedRectangles.length, 0, "nothing is stored as placed");
      assert.ok(
        document.documentElement.classList.contains("spotlight-draw-quick-draw-mode"),
        "cursor class remains while chord is still held"
      );

      done();
    }, 0);
  });

  QUnit.test("keeps the temporary rectangle until mouseup when a modifier is released", function(assert) {
    var done = assert.async();

    document.dispatchEvent(quickMouseEvent("mousedown", 100, 100));

    setTimeout(function() {
      document.dispatchEvent(quickMouseEvent("mousemove", 260, 180));
      assert.strictEqual(rectangles().length, 1, "temporary rectangle exists during drag");

      document.dispatchEvent(quickKeyEvent("keyup", "Alt", {
        ctrlKey: true,
        altKey: false,
        metaKey: true
      }));

      assert.strictEqual(rectangles().length, 1, "temporary rectangle remains during active drag");
      assert.notOk(
        document.documentElement.classList.contains("spotlight-draw-quick-draw-mode"),
        "cursor class is removed when the chord is released"
      );

      document.dispatchEvent(quickMouseEvent("mousemove", 300, 220, { altKey: false }));

      var rect = rectangles()[0];
      if (rect) {
        assert.strictEqual(rect.style.width, "200px", "width continues following the drag");
        assert.strictEqual(rect.style.height, "120px", "height continues following the drag");
      }

      document.dispatchEvent(quickMouseEvent("mouseup", 300, 220, { altKey: false }));

      assert.strictEqual(rectangles().length, 0, "temporary rectangle is removed on mouseup");

      done();
    }, 0);
  });

  QUnit.test("spacebar moves the temporary rectangle after modifiers are released", function(assert) {
    var done = assert.async();

    document.dispatchEvent(quickMouseEvent("mousedown", 100, 100));

    setTimeout(function() {
      document.dispatchEvent(quickMouseEvent("mousemove", 260, 180));

      document.dispatchEvent(quickKeyEvent("keyup", "Alt", {
        ctrlKey: false,
        altKey: false,
        metaKey: false
      }));

      document.dispatchEvent(quickKeyEvent("keydown", " ", {
        ctrlKey: false,
        altKey: false,
        metaKey: false
      }));

      assert.ok(
        document.documentElement.classList.contains("spotlight-draw-pan-mode"),
        "pan mode starts after modifier release"
      );

      document.dispatchEvent(quickMouseEvent("mousemove", 300, 220, {
        ctrlKey: false,
        altKey: false,
        metaKey: false
      }));

      var rect = rectangles()[0];
      assert.strictEqual(rect.style.left, "140px", "rectangle moves horizontally");
      assert.strictEqual(rect.style.top, "140px", "rectangle moves vertically");
      assert.strictEqual(rect.style.width, "160px", "move keeps the current width");
      assert.strictEqual(rect.style.height, "80px", "move keeps the current height");

      document.dispatchEvent(quickKeyEvent("keyup", " ", {
        ctrlKey: false,
        altKey: false,
        metaKey: false
      }));

      assert.notOk(
        document.documentElement.classList.contains("spotlight-draw-pan-mode"),
        "pan mode stops when spacebar is released"
      );

      document.dispatchEvent(quickMouseEvent("mousemove", 340, 250, {
        ctrlKey: false,
        altKey: false,
        metaKey: false
      }));

      assert.strictEqual(rect.style.left, "140px", "resize continues from moved left edge");
      assert.strictEqual(rect.style.top, "140px", "resize continues from moved top edge");
      assert.strictEqual(rect.style.width, "200px", "resize continues after moving");
      assert.strictEqual(rect.style.height, "110px", "resize continues after moving");

      document.dispatchEvent(quickKeyEvent("keydown", " ", {
        ctrlKey: false,
        altKey: false,
        metaKey: false
      }));

      document.dispatchEvent(quickMouseEvent("mousemove", 360, 270, {
        ctrlKey: false,
        altKey: false,
        metaKey: false
      }));

      assert.strictEqual(rect.style.left, "160px", "spacebar can move the resized rectangle again");
      assert.strictEqual(rect.style.top, "160px", "spacebar can move the resized rectangle again");
      assert.strictEqual(rect.style.width, "200px", "second move keeps width");
      assert.strictEqual(rect.style.height, "110px", "second move keeps height");

      document.dispatchEvent(quickMouseEvent("mouseup", 360, 270, {
        ctrlKey: false,
        altKey: false,
        metaKey: false
      }));

      assert.strictEqual(rectangles().length, 0, "temporary rectangle is removed on mouseup");
      assert.notOk(
        document.documentElement.classList.contains("spotlight-draw-pan-mode"),
        "mouseup clears pan mode"
      );

      done();
    }, 0);
  });

  QUnit.test("held spacebar starts moving when modifiers are released", function(assert) {
    var done = assert.async();

    document.dispatchEvent(quickMouseEvent("mousedown", 100, 100));

    setTimeout(function() {
      document.dispatchEvent(quickMouseEvent("mousemove", 260, 180));

      document.dispatchEvent(quickKeyEvent("keydown", " ", {
        ctrlKey: true,
        altKey: true,
        metaKey: true
      }));

      assert.notOk(
        document.documentElement.classList.contains("spotlight-draw-pan-mode"),
        "spacebar does not move while chord is still held"
      );

      document.dispatchEvent(quickKeyEvent("keyup", "Alt", {
        ctrlKey: false,
        altKey: false,
        metaKey: false
      }));

      assert.ok(
        document.documentElement.classList.contains("spotlight-draw-pan-mode"),
        "pan mode starts when modifiers are released while spacebar is held"
      );

      document.dispatchEvent(quickMouseEvent("mousemove", 300, 220, {
        ctrlKey: false,
        altKey: false,
        metaKey: false
      }));

      var rect = rectangles()[0];
      assert.strictEqual(rect.style.left, "140px", "held spacebar moves horizontally after modifier release");
      assert.strictEqual(rect.style.top, "140px", "held spacebar moves vertically after modifier release");
      assert.strictEqual(rect.style.width, "160px", "held spacebar move keeps width");
      assert.strictEqual(rect.style.height, "80px", "held spacebar move keeps height");

      document.dispatchEvent(quickMouseEvent("mouseup", 300, 220, {
        ctrlKey: false,
        altKey: false,
        metaKey: false
      }));

      assert.strictEqual(rectangles().length, 0, "temporary rectangle is removed on mouseup");

      done();
    }, 0);
  });

  QUnit.test("does not draw without the full modifier chord", function(assert) {
    document.dispatchEvent(quickMouseEvent("mousedown", 100, 100, { metaKey: false }));
    document.dispatchEvent(quickMouseEvent("mousemove", 260, 180, { metaKey: false }));

    assert.strictEqual(rectangles().length, 0, "no temporary rectangle is created");
  });

  QUnit.test("draws when macOS reports the chord drag as secondary button", function(assert) {
    var done = assert.async();

    document.dispatchEvent(quickMouseEvent("mousedown", 100, 100, { button: 2 }));

    setTimeout(function() {
      document.dispatchEvent(quickMouseEvent("mousemove", 260, 180, { button: 2 }));

      assert.strictEqual(rectangles().length, 1, "temporary rectangle is created for secondary-button chord");

      done();
    }, 0);
  });

  QUnit.test("prevents the context menu for the full modifier chord", function(assert) {
    var event = quickMouseEvent("contextmenu", 100, 100, { button: 2 });

    document.dispatchEvent(event);

    assert.ok(event.defaultPrevented, "context menu event is prevented");
  });

  QUnit.test("shows crosshair cursor class while the modifier chord is held", function(assert) {
    document.dispatchEvent(quickKeyEvent("keydown", "Meta", {
      ctrlKey: true,
      altKey: true,
      metaKey: true
    }));

    assert.ok(
      document.documentElement.classList.contains("spotlight-draw-quick-draw-mode"),
      "quick-draw cursor class is added"
    );

    document.dispatchEvent(quickKeyEvent("keyup", "Alt", {
      ctrlKey: true,
      altKey: false,
      metaKey: true
    }));

    assert.notOk(
      document.documentElement.classList.contains("spotlight-draw-quick-draw-mode"),
      "quick-draw cursor class is removed"
    );
  });
});
