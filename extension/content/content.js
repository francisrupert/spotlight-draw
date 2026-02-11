// State management
var isDrawingMode = false;
var isCurrentlyDrawing = false;
var isDuplicating = false;
var isRepositioning = false;
var isSpacebarHeld = false;
var isAltHeld = false;
var isCmdCtrlHeld = false;
var startX = 0;
var startY = 0;
var currentMouseX = 0;
var currentMouseY = 0;
var currentRectangle = null;
var duplicatingRectangle = null;
var repositioningRectangle = null;
var placedRectangles = []; // Array to hold multiple rectangles (when Shift is used)

// Axis constraint state (when Cmd/Ctrl is held during drawing)
var axisConstraintWidth = 0;
var axisConstraintHeight = 0;
var axisConstraintMode = null; // "horizontal" or "vertical"

// Pan mode state (when spacebar is held during drawing)
var panModeWidth = 0;
var panModeHeight = 0;
var panOffsetX = 0;
var panOffsetY = 0;

// Duplication state (when Alt+D is pressed)
var duplicateOffsetX = 0;
var duplicateOffsetY = 0;
var duplicateStartX = 0;
var duplicateStartY = 0;
var duplicateAxisLocked = null; // "horizontal" or "vertical"

// Repositioning state (when Cmd/Ctrl + drag over existing rectangle)
var repositionOffsetX = 0;
var repositionOffsetY = 0;
var repositionStartX = 0;
var repositionStartY = 0;
var repositionAxisLocked = null; // "horizontal" or "vertical"

// CSS class names
var DRAWING_MODE_CLASS = "box-highlight-drawing-mode";
var PAN_MODE_CLASS = "box-highlight-pan-mode";
var REPOSITIONING_MODE_CLASS = "box-highlight-repositioning-mode";
var DUPLICATION_HOVER_CLASS = "box-highlight-duplication-hover-mode";
var DRAGGING_MODE_CLASS = "box-highlight-dragging-mode";
var RECTANGLE_CLASS = "box-highlight-rectangle";

// Color cycling (order: orange, green, blue, purple, plain)
var COLOR_CLASSES = [
  "",                                    // orange (default)
  "box-highlight-rectangle--green",     // green
  "box-highlight-rectangle--blue",      // blue
  "box-highlight-rectangle--purple",    // purple
  "box-highlight-rectangle--plain"      // plain
];

// User preferences (loaded from chrome.storage)
var userPreferences = {
  borderSize: "1",
  defaultColor: "",
  snapToEdges: true
};

// Snap-to-edge configuration
var SNAP_THRESHOLD = 8; // pixels

// Snap guide lines
var horizontalGuideLine = null;
var verticalGuideLine = null;

// Clamp rectangle coordinates to viewport bounds
function clampToViewport(x, y, width, height) {
  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;

  // Ensure rectangle stays within viewport bounds
  var clampedX = Math.max(0, Math.min(x, viewportWidth - width));
  var clampedY = Math.max(0, Math.min(y, viewportHeight - height));

  // Ensure width and height don't exceed viewport when positioned at edge
  var clampedWidth = Math.min(width, viewportWidth - clampedX);
  var clampedHeight = Math.min(height, viewportHeight - clampedY);

  return {
    x: clampedX,
    y: clampedY,
    width: clampedWidth,
    height: clampedHeight
  };
}

// Load user preferences from chrome.storage
function loadPreferences(callback) {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get({
      borderSize: "1",
      defaultColor: "",
      snapToEdges: true
    }, function(items) {
      userPreferences.borderSize = items.borderSize;
      userPreferences.defaultColor = items.defaultColor;
      userPreferences.snapToEdges = items.snapToEdges;
      if (callback) {
        callback();
      }
    });
  } else {
    // Fallback if chrome.storage is not available
    if (callback) {
      callback();
    }
  }
}

// Create a rectangle element
function createRectangle(x, y, width, height) {
  var rect = document.createElement("div");
  rect.className = RECTANGLE_CLASS;
  rect.style.position = "fixed";
  rect.style.left = x + "px";
  rect.style.top = y + "px";
  rect.style.width = width + "px";
  rect.style.height = height + "px";
  rect.style.pointerEvents = "none";
  rect.style.zIndex = "2147483647"; // Maximum z-index

  // Apply user preference for border size
  rect.style.borderWidth = userPreferences.borderSize + "px";

  // Apply user preference for default color
  var defaultColorIndex = 0;
  if (userPreferences.defaultColor) {
    var colorIndex = COLOR_CLASSES.indexOf(userPreferences.defaultColor);
    if (colorIndex !== -1) {
      defaultColorIndex = colorIndex;
      rect.classList.add(userPreferences.defaultColor);
    }
  }
  rect.setAttribute("data-color-index", defaultColorIndex.toString());

  return rect;
}

// Update rectangle position and size
function updateRectangle(rect, x, y, width, height) {
  rect.style.left = x + "px";
  rect.style.top = y + "px";
  rect.style.width = Math.abs(width) + "px";
  rect.style.height = Math.abs(height) + "px";
}

// Get all snap target edges from placed rectangles (excluding specified rectangle)
function getSnapTargets(excludeRect) {
  var targets = {
    left: [],
    right: [],
    top: [],
    bottom: []
  };

  for (var i = 0; i < placedRectangles.length; i++) {
    var rect = placedRectangles[i];

    // Skip the rectangle we're currently moving/duplicating
    if (rect === excludeRect) {
      continue;
    }

    var left = parseInt(rect.style.left, 10);
    var top = parseInt(rect.style.top, 10);
    var width = parseInt(rect.style.width, 10);
    var height = parseInt(rect.style.height, 10);
    var right = left + width;
    var bottom = top + height;

    targets.left.push(left);
    targets.right.push(right);
    targets.top.push(top);
    targets.bottom.push(bottom);
  }

  return targets;
}

// Apply snapping to rectangle edges (for drawing/resizing - can adjust size)
function applySnapping(x, y, width, height, excludeRect) {
  var targets = getSnapTargets(excludeRect);
  var snappedX = x;
  var snappedY = y;
  var snappedWidth = width;
  var snappedHeight = height;
  var verticalSnapPos = null;
  var horizontalSnapPos = null;

  // Calculate edges of current rectangle
  var left = x;
  var right = x + width;
  var top = y;
  var bottom = y + height;

  // Snap left edge
  var leftSnap = findClosestEdge(left, targets.left);
  if (leftSnap !== null) {
    snappedX = leftSnap;
    snappedWidth = width + (x - leftSnap); // Adjust width to maintain right edge
    verticalSnapPos = leftSnap;
  }

  // Snap right edge
  var rightSnap = findClosestEdge(right, targets.right);
  if (rightSnap !== null && leftSnap === null) {
    snappedWidth = rightSnap - snappedX;
    verticalSnapPos = rightSnap;
  }

  // Also check if right edge should snap to left edges
  var rightToLeftSnap = findClosestEdge(right, targets.left);
  if (rightToLeftSnap !== null && leftSnap === null && rightSnap === null) {
    snappedWidth = rightToLeftSnap - snappedX;
    verticalSnapPos = rightToLeftSnap;
  }

  // Also check if left edge should snap to right edges
  var leftToRightSnap = findClosestEdge(left, targets.right);
  if (leftToRightSnap !== null && leftSnap === null) {
    snappedX = leftToRightSnap;
    snappedWidth = width + (x - leftToRightSnap);
    verticalSnapPos = leftToRightSnap;
  }

  // Snap top edge
  var topSnap = findClosestEdge(top, targets.top);
  if (topSnap !== null) {
    snappedY = topSnap;
    snappedHeight = height + (y - topSnap); // Adjust height to maintain bottom edge
    horizontalSnapPos = topSnap;
  }

  // Snap bottom edge
  var bottomSnap = findClosestEdge(bottom, targets.bottom);
  if (bottomSnap !== null && topSnap === null) {
    snappedHeight = bottomSnap - snappedY;
    horizontalSnapPos = bottomSnap;
  }

  // Also check if bottom edge should snap to top edges
  var bottomToTopSnap = findClosestEdge(bottom, targets.top);
  if (bottomToTopSnap !== null && topSnap === null && bottomSnap === null) {
    snappedHeight = bottomToTopSnap - snappedY;
    horizontalSnapPos = bottomToTopSnap;
  }

  // Also check if top edge should snap to bottom edges
  var topToBottomSnap = findClosestEdge(top, targets.bottom);
  if (topToBottomSnap !== null && topSnap === null) {
    snappedY = topToBottomSnap;
    snappedHeight = height + (y - topToBottomSnap);
    horizontalSnapPos = topToBottomSnap;
  }

  return {
    x: snappedX,
    y: snappedY,
    width: snappedWidth,
    height: snappedHeight,
    verticalSnapPos: verticalSnapPos,
    horizontalSnapPos: horizontalSnapPos
  };
}

// Apply snapping for moving rectangles (repositioning/duplicating - only adjusts position, keeps size fixed)
function applyPositionSnapping(x, y, width, height, excludeRect) {
  var targets = getSnapTargets(excludeRect);
  var snappedX = x;
  var snappedY = y;
  var verticalSnapPos = null;
  var horizontalSnapPos = null;

  // Calculate edges of current rectangle
  var left = x;
  var right = x + width;
  var top = y;
  var bottom = y + height;

  // Try to snap left edge to any vertical edge (left or right of other rectangles)
  var leftToLeftSnap = findClosestEdge(left, targets.left);
  var leftToRightSnap = findClosestEdge(left, targets.right);

  // Use whichever is closer
  var leftSnapDistance = leftToLeftSnap !== null ? Math.abs(left - leftToLeftSnap) : Infinity;
  var leftRightSnapDistance = leftToRightSnap !== null ? Math.abs(left - leftToRightSnap) : Infinity;

  if (leftSnapDistance <= leftRightSnapDistance && leftToLeftSnap !== null) {
    snappedX = leftToLeftSnap;
    verticalSnapPos = leftToLeftSnap;
  } else if (leftToRightSnap !== null) {
    snappedX = leftToRightSnap;
    verticalSnapPos = leftToRightSnap;
  }

  // Try to snap right edge to any vertical edge (left or right of other rectangles)
  var rightToRightSnap = findClosestEdge(right, targets.right);
  var rightToLeftSnap = findClosestEdge(right, targets.left);

  // Use whichever is closer, but only if we haven't already snapped the left edge
  var rightSnapDistance = rightToRightSnap !== null ? Math.abs(right - rightToRightSnap) : Infinity;
  var rightLeftSnapDistance = rightToLeftSnap !== null ? Math.abs(right - rightToLeftSnap) : Infinity;

  // Only apply right edge snap if left edge didn't snap
  if (snappedX === x) {
    if (rightSnapDistance <= rightLeftSnapDistance && rightToRightSnap !== null) {
      snappedX = rightToRightSnap - width; // Adjust x to align right edge
      verticalSnapPos = rightToRightSnap;
    } else if (rightToLeftSnap !== null) {
      snappedX = rightToLeftSnap - width; // Adjust x to align right edge
      verticalSnapPos = rightToLeftSnap;
    }
  }

  // Try to snap top edge to any horizontal edge (top or bottom of other rectangles)
  var topToTopSnap = findClosestEdge(top, targets.top);
  var topToBottomSnap = findClosestEdge(top, targets.bottom);

  // Use whichever is closer
  var topSnapDistance = topToTopSnap !== null ? Math.abs(top - topToTopSnap) : Infinity;
  var topBottomSnapDistance = topToBottomSnap !== null ? Math.abs(top - topToBottomSnap) : Infinity;

  if (topSnapDistance <= topBottomSnapDistance && topToTopSnap !== null) {
    snappedY = topToTopSnap;
    horizontalSnapPos = topToTopSnap;
  } else if (topToBottomSnap !== null) {
    snappedY = topToBottomSnap;
    horizontalSnapPos = topToBottomSnap;
  }

  // Try to snap bottom edge to any horizontal edge (top or bottom of other rectangles)
  var bottomToBottomSnap = findClosestEdge(bottom, targets.bottom);
  var bottomToTopSnap = findClosestEdge(bottom, targets.top);

  // Use whichever is closer, but only if we haven't already snapped the top edge
  var bottomSnapDistance = bottomToBottomSnap !== null ? Math.abs(bottom - bottomToBottomSnap) : Infinity;
  var bottomTopSnapDistance = bottomToTopSnap !== null ? Math.abs(bottom - bottomToTopSnap) : Infinity;

  // Only apply bottom edge snap if top edge didn't snap
  if (snappedY === y) {
    if (bottomSnapDistance <= bottomTopSnapDistance && bottomToBottomSnap !== null) {
      snappedY = bottomToBottomSnap - height; // Adjust y to align bottom edge
      horizontalSnapPos = bottomToBottomSnap;
    } else if (bottomToTopSnap !== null) {
      snappedY = bottomToTopSnap - height; // Adjust y to align bottom edge
      horizontalSnapPos = bottomToTopSnap;
    }
  }

  return {
    x: snappedX,
    y: snappedY,
    width: width, // Keep width unchanged
    height: height, // Keep height unchanged
    verticalSnapPos: verticalSnapPos,
    horizontalSnapPos: horizontalSnapPos
  };
}

// Find closest edge within snap threshold
function findClosestEdge(position, edges) {
  var closest = null;
  var minDistance = SNAP_THRESHOLD;

  for (var i = 0; i < edges.length; i++) {
    var distance = Math.abs(position - edges[i]);
    if (distance <= minDistance) {
      minDistance = distance;
      closest = edges[i];
    }
  }

  return closest;
}

// Create snap guide lines
function createGuideLines() {
  // Horizontal guide line
  horizontalGuideLine = document.createElement("div");
  horizontalGuideLine.style.position = "fixed";
  horizontalGuideLine.style.left = "0";
  horizontalGuideLine.style.width = "100vw";
  horizontalGuideLine.style.height = "0";
  horizontalGuideLine.style.borderTop = "0.5px dashed GrayText";
  horizontalGuideLine.style.pointerEvents = "none";
  horizontalGuideLine.style.zIndex = "2147483646"; // Just below rectangles
  horizontalGuideLine.style.display = "none";
  document.body.appendChild(horizontalGuideLine);

  // Vertical guide line
  verticalGuideLine = document.createElement("div");
  verticalGuideLine.style.position = "fixed";
  verticalGuideLine.style.top = "0";
  verticalGuideLine.style.height = "100vh";
  verticalGuideLine.style.width = "0";
  verticalGuideLine.style.borderLeft = "0.5px dashed GrayText";
  verticalGuideLine.style.pointerEvents = "none";
  verticalGuideLine.style.zIndex = "2147483646"; // Just below rectangles
  verticalGuideLine.style.display = "none";
  document.body.appendChild(verticalGuideLine);
}

// Remove snap guide lines
function removeGuideLines() {
  if (horizontalGuideLine && horizontalGuideLine.parentNode) {
    horizontalGuideLine.parentNode.removeChild(horizontalGuideLine);
    horizontalGuideLine = null;
  }
  if (verticalGuideLine && verticalGuideLine.parentNode) {
    verticalGuideLine.parentNode.removeChild(verticalGuideLine);
    verticalGuideLine = null;
  }
}

// Show horizontal guide line at specific y position
function showHorizontalGuide(y) {
  if (horizontalGuideLine) {
    horizontalGuideLine.style.top = y + "px";
    horizontalGuideLine.style.display = "block";
  }
}

// Show vertical guide line at specific x position
function showVerticalGuide(x) {
  if (verticalGuideLine) {
    verticalGuideLine.style.left = x + "px";
    verticalGuideLine.style.display = "block";
  }
}

// Hide all guide lines
function hideGuideLines() {
  if (horizontalGuideLine) {
    horizontalGuideLine.style.display = "none";
  }
  if (verticalGuideLine) {
    verticalGuideLine.style.display = "none";
  }
}

// Calculate rectangle coordinates from start and current mouse position
function calculateRectCoords(currentX, currentY) {
  var x, y, width, height;
  var effectiveCurrentX = currentX;
  var effectiveCurrentY = currentY;

  // Apply axis constraint if Cmd/Ctrl is held during drawing
  if (isCmdCtrlHeld && axisConstraintMode) {
    if (axisConstraintMode === "horizontal") {
      // Lock to horizontal: keep height fixed
      var deltaY = Math.abs(currentY - startY);
      effectiveCurrentY = startY + (currentY > startY ? deltaY : -deltaY);
      // Constrain effectiveCurrentY to maintain the locked height
      if (isAltHeld) {
        effectiveCurrentY = startY + (axisConstraintHeight / 2) * (currentY > startY ? 1 : -1);
      } else {
        var lockedHeight = axisConstraintHeight;
        effectiveCurrentY = startY + lockedHeight * (currentY > startY ? 1 : -1);
      }
    } else if (axisConstraintMode === "vertical") {
      // Lock to vertical: keep width fixed
      var deltaX = Math.abs(currentX - startX);
      effectiveCurrentX = startX + (currentX > startX ? deltaX : -deltaX);
      // Constrain effectiveCurrentX to maintain the locked width
      if (isAltHeld) {
        effectiveCurrentX = startX + (axisConstraintWidth / 2) * (currentX > startX ? 1 : -1);
      } else {
        var lockedWidth = axisConstraintWidth;
        effectiveCurrentX = startX + lockedWidth * (currentX > startX ? 1 : -1);
      }
    }
  }

  if (isAltHeld) {
    // Alt held: draw from center outward
    var halfWidth = Math.abs(effectiveCurrentX - startX);
    var halfHeight = Math.abs(effectiveCurrentY - startY);
    x = startX - halfWidth;
    y = startY - halfHeight;
    width = halfWidth * 2;
    height = halfHeight * 2;
  } else {
    // Normal: draw from corner to corner
    x = Math.min(startX, effectiveCurrentX);
    y = Math.min(startY, effectiveCurrentY);
    width = Math.abs(effectiveCurrentX - startX);
    height = Math.abs(effectiveCurrentY - startY);
  }

  return { x: x, y: y, width: width, height: height };
}

// Remove all placed rectangles
function clearAllRectangles() {
  for (var i = 0; i < placedRectangles.length; i++) {
    if (placedRectangles[i] && placedRectangles[i].parentNode) {
      placedRectangles[i].parentNode.removeChild(placedRectangles[i]);
    }
  }
  placedRectangles = [];
}

// Find rectangle at mouse position
function getRectangleAtPosition(x, y) {
  // Iterate in reverse order to check top-most rectangles first
  for (var i = placedRectangles.length - 1; i >= 0; i--) {
    var rect = placedRectangles[i];
    var left = parseInt(rect.style.left, 10);
    var top = parseInt(rect.style.top, 10);
    var width = parseInt(rect.style.width, 10);
    var height = parseInt(rect.style.height, 10);

    if (x >= left && x <= left + width && y >= top && y <= top + height) {
      return rect;
    }
  }
  return null;
}

// Cycle through rectangle colors
function cycleRectangleColor(rect) {
  if (!rect) {
    return;
  }

  // Get current color index (default to 0)
  var currentIndex = parseInt(rect.getAttribute("data-color-index") || "0", 10);

  // Calculate next index (wrap around to 0 after last color)
  var nextIndex = (currentIndex + 1) % COLOR_CLASSES.length;

  // Remove all color classes
  for (var i = 0; i < COLOR_CLASSES.length; i++) {
    if (COLOR_CLASSES[i]) {
      rect.classList.remove(COLOR_CLASSES[i]);
    }
  }

  // Add new color class (if not default)
  if (COLOR_CLASSES[nextIndex]) {
    rect.classList.add(COLOR_CLASSES[nextIndex]);
  }

  // Store new color index
  rect.setAttribute("data-color-index", nextIndex.toString());
}

// Delete a specific rectangle
function deleteRectangle(rect) {
  if (!rect) {
    return;
  }

  // Remove from DOM
  if (rect.parentNode) {
    rect.parentNode.removeChild(rect);
  }

  // Remove from placedRectangles array
  var index = placedRectangles.indexOf(rect);
  if (index > -1) {
    placedRectangles.splice(index, 1);
  }
}

// Mouse down handler - start drawing, duplication, or repositioning
function handleMouseDown(event) {
  if (!isDrawingMode) {
    return;
  }

  // If Alt is held and mouse is over a rectangle, start duplicating (Figma-style)
  if (event.altKey && !isCurrentlyDrawing && !event.metaKey && !event.ctrlKey) {
    var rectUnderMouse = getRectangleAtPosition(event.clientX, event.clientY);
    if (rectUnderMouse) {
      isDuplicating = true;

      // Hide cursor during duplication drag
      document.documentElement.classList.remove(DUPLICATION_HOVER_CLASS);
      document.documentElement.classList.add(DRAGGING_MODE_CLASS);

      // Create a duplicate of the rectangle under mouse
      var rectLeft = parseInt(rectUnderMouse.style.left, 10);
      var rectTop = parseInt(rectUnderMouse.style.top, 10);
      var rectWidth = parseInt(rectUnderMouse.style.width, 10);
      var rectHeight = parseInt(rectUnderMouse.style.height, 10);

      duplicatingRectangle = createRectangle(rectLeft, rectTop, rectWidth, rectHeight);

      // Copy color from original rectangle
      var colorIndex = rectUnderMouse.getAttribute("data-color-index") || "0";
      duplicatingRectangle.setAttribute("data-color-index", colorIndex);
      if (COLOR_CLASSES[parseInt(colorIndex, 10)]) {
        duplicatingRectangle.classList.add(COLOR_CLASSES[parseInt(colorIndex, 10)]);
      }

      document.body.appendChild(duplicatingRectangle);

      // Calculate offset from cursor to rectangle top-left
      duplicateOffsetX = rectLeft - event.clientX;
      duplicateOffsetY = rectTop - event.clientY;

      // Store starting position for axis locking
      duplicateStartX = rectLeft;
      duplicateStartY = rectTop;
      duplicateAxisLocked = null;

      event.preventDefault();
      return;
    }
  }

  // If Cmd/Ctrl is held and mouse is over a rectangle, start repositioning
  if ((event.metaKey || event.ctrlKey) && !isCurrentlyDrawing) {
    var rectUnderMouse = getRectangleAtPosition(event.clientX, event.clientY);
    if (rectUnderMouse) {
      isRepositioning = true;
      repositioningRectangle = rectUnderMouse;

      // Remove move cursor and hide cursor during drag
      document.documentElement.classList.remove(REPOSITIONING_MODE_CLASS);
      document.documentElement.classList.remove(DUPLICATION_HOVER_CLASS);
      document.documentElement.classList.add(DRAGGING_MODE_CLASS);

      // Calculate offset from cursor to rectangle top-left
      var rectLeft = parseInt(rectUnderMouse.style.left, 10);
      var rectTop = parseInt(rectUnderMouse.style.top, 10);
      repositionOffsetX = rectLeft - event.clientX;
      repositionOffsetY = rectTop - event.clientY;

      // Store starting position for axis locking
      repositionStartX = rectLeft;
      repositionStartY = rectTop;
      repositionAxisLocked = null;

      event.preventDefault();
      return;
    }
  }

  // Only clear previous rectangles if Shift is NOT held
  if (!event.shiftKey) {
    clearAllRectangles();
  }

  isCurrentlyDrawing = true;
  isSpacebarHeld = false; // Reset spacebar state
  isAltHeld = event.altKey; // Capture initial Alt state
  isCmdCtrlHeld = false; // Reset Cmd/Ctrl state
  axisConstraintMode = null; // Reset axis constraint
  startX = event.clientX;
  startY = event.clientY;

  // Remove hover cursor classes when starting to draw
  document.documentElement.classList.remove(REPOSITIONING_MODE_CLASS);
  document.documentElement.classList.remove(DUPLICATION_HOVER_CLASS);

  // Create initial rectangle
  currentRectangle = createRectangle(startX, startY, 0, 0);
  document.body.appendChild(currentRectangle);

  event.preventDefault();
}

// Mouse move handler - update rectangle size or position
function handleMouseMove(event) {
  // Always track mouse position
  currentMouseX = event.clientX;
  currentMouseY = event.clientY;

  // Show move cursor when Cmd/Ctrl is held over a rectangle (not actively drawing or repositioning)
  if (isDrawingMode && !isCurrentlyDrawing && !isDuplicating && !isRepositioning) {
    if (event.metaKey || event.ctrlKey) {
      var rectUnderMouse = getRectangleAtPosition(currentMouseX, currentMouseY);
      if (rectUnderMouse) {
        document.documentElement.classList.add(REPOSITIONING_MODE_CLASS);
      } else {
        document.documentElement.classList.remove(REPOSITIONING_MODE_CLASS);
      }
    } else {
      document.documentElement.classList.remove(REPOSITIONING_MODE_CLASS);
    }

    // Show copy cursor when Alt is held over a rectangle (not actively drawing or duplicating)
    if (event.altKey && !event.metaKey && !event.ctrlKey) {
      var rectUnderMouse = getRectangleAtPosition(currentMouseX, currentMouseY);
      if (rectUnderMouse) {
        document.documentElement.classList.add(DUPLICATION_HOVER_CLASS);
      } else {
        document.documentElement.classList.remove(DUPLICATION_HOVER_CLASS);
      }
    } else {
      document.documentElement.classList.remove(DUPLICATION_HOVER_CLASS);
    }
  }

  // Handle repositioning mode
  if (isRepositioning && repositioningRectangle) {
    // Clamp mouse position to viewport bounds
    var clampedMouseX = Math.max(0, Math.min(currentMouseX, window.innerWidth));
    var clampedMouseY = Math.max(0, Math.min(currentMouseY, window.innerHeight));

    var newX = clampedMouseX + repositionOffsetX;
    var newY = clampedMouseY + repositionOffsetY;

    // Handle Shift for axis locking during repositioning
    if (event.shiftKey) {
      // Determine axis lock if not already set
      if (!repositionAxisLocked) {
        var deltaX = Math.abs(newX - repositionStartX);
        var deltaY = Math.abs(newY - repositionStartY);

        if (deltaX > deltaY) {
          repositionAxisLocked = "horizontal";
        } else {
          repositionAxisLocked = "vertical";
        }
      }

      // Apply axis constraint
      if (repositionAxisLocked === "horizontal") {
        newY = repositionStartY; // Lock Y, only move X
      } else if (repositionAxisLocked === "vertical") {
        newX = repositionStartX; // Lock X, only move Y
      }
    } else {
      // Shift released, clear axis lock
      repositionAxisLocked = null;
    }

    // Apply position-only snapping (exclude the rectangle being repositioned)
    var rectWidth = parseInt(repositioningRectangle.style.width, 10);
    var rectHeight = parseInt(repositioningRectangle.style.height, 10);
    var snapped;

    if (userPreferences.snapToEdges) {
      snapped = applyPositionSnapping(newX, newY, rectWidth, rectHeight, repositioningRectangle);
    } else {
      snapped = { x: newX, y: newY, width: rectWidth, height: rectHeight, verticalSnapPos: null, horizontalSnapPos: null };
    }

    // Clamp to viewport bounds
    var clamped = clampToViewport(snapped.x, snapped.y, snapped.width, snapped.height);

    repositioningRectangle.style.left = clamped.x + "px";
    repositioningRectangle.style.top = clamped.y + "px";

    // Show guide lines if snapping occurred and guidelines are enabled
    if (userPreferences.snapToEdges) {
      if (snapped.verticalSnapPos !== null) {
        showVerticalGuide(snapped.verticalSnapPos);
      } else {
        if (verticalGuideLine) verticalGuideLine.style.display = "none";
      }

      if (snapped.horizontalSnapPos !== null) {
        showHorizontalGuide(snapped.horizontalSnapPos);
      } else {
        if (horizontalGuideLine) horizontalGuideLine.style.display = "none";
      }
    }

    event.preventDefault();
    return;
  }

  // Handle duplication drag mode
  if (isDuplicating && duplicatingRectangle) {
    // Clamp mouse position to viewport bounds
    var clampedMouseX = Math.max(0, Math.min(currentMouseX, window.innerWidth));
    var clampedMouseY = Math.max(0, Math.min(currentMouseY, window.innerHeight));

    var newX = clampedMouseX + duplicateOffsetX;
    var newY = clampedMouseY + duplicateOffsetY;

    // Handle Shift for axis locking during duplication
    if (event.shiftKey) {
      // Determine axis lock if not already set
      if (!duplicateAxisLocked) {
        var deltaX = Math.abs(newX - duplicateStartX);
        var deltaY = Math.abs(newY - duplicateStartY);

        if (deltaX > deltaY) {
          duplicateAxisLocked = "horizontal";
        } else {
          duplicateAxisLocked = "vertical";
        }
      }

      // Apply axis constraint
      if (duplicateAxisLocked === "horizontal") {
        newY = duplicateStartY; // Lock Y, only move X
      } else if (duplicateAxisLocked === "vertical") {
        newX = duplicateStartX; // Lock X, only move Y
      }
    } else {
      // Shift released, clear axis lock
      duplicateAxisLocked = null;
    }

    // Apply position-only snapping (exclude the rectangle being duplicated - not in placedRectangles yet)
    var rectWidth = parseInt(duplicatingRectangle.style.width, 10);
    var rectHeight = parseInt(duplicatingRectangle.style.height, 10);
    var snapped;

    if (userPreferences.snapToEdges) {
      snapped = applyPositionSnapping(newX, newY, rectWidth, rectHeight, duplicatingRectangle);
    } else {
      snapped = { x: newX, y: newY, width: rectWidth, height: rectHeight, verticalSnapPos: null, horizontalSnapPos: null };
    }

    // Clamp to viewport bounds
    var clamped = clampToViewport(snapped.x, snapped.y, snapped.width, snapped.height);

    duplicatingRectangle.style.left = clamped.x + "px";
    duplicatingRectangle.style.top = clamped.y + "px";

    // Show guide lines if snapping occurred and guidelines are enabled
    if (userPreferences.snapToEdges) {
      if (snapped.verticalSnapPos !== null) {
        showVerticalGuide(snapped.verticalSnapPos);
      } else {
        if (verticalGuideLine) verticalGuideLine.style.display = "none";
      }

      if (snapped.horizontalSnapPos !== null) {
        showHorizontalGuide(snapped.horizontalSnapPos);
      } else {
        if (horizontalGuideLine) horizontalGuideLine.style.display = "none";
      }
    }

    event.preventDefault();
    return;
  }

  if (!isDrawingMode || !isCurrentlyDrawing || !currentRectangle) {
    return;
  }

  // Update Alt state during drawing
  isAltHeld = event.altKey;

  // Handle Cmd/Ctrl for axis constraint (only during drawing, not on initial mousedown)
  var wasCmdCtrlHeld = isCmdCtrlHeld;
  isCmdCtrlHeld = event.metaKey || event.ctrlKey; // metaKey = Cmd on Mac, ctrlKey = Ctrl on Windows/Linux

  // If Cmd/Ctrl was just pressed, capture current dimensions and determine axis
  if (isCmdCtrlHeld && !wasCmdCtrlHeld) {
    axisConstraintWidth = Math.abs(currentMouseX - startX);
    axisConstraintHeight = Math.abs(currentMouseY - startY);

    // Determine dominant axis based on current movement
    if (axisConstraintWidth > axisConstraintHeight) {
      axisConstraintMode = "horizontal";
    } else {
      axisConstraintMode = "vertical";
    }
  }

  // If Cmd/Ctrl was released, clear axis constraint
  if (!isCmdCtrlHeld && wasCmdCtrlHeld) {
    axisConstraintMode = null;
  }

  // Clamp mouse position to viewport bounds for drawing calculations
  var clampedMouseX = Math.max(0, Math.min(currentMouseX, window.innerWidth));
  var clampedMouseY = Math.max(0, Math.min(currentMouseY, window.innerHeight));

  if (isSpacebarHeld) {
    // Pan mode: move the entire rectangle without resizing
    var newX = clampedMouseX + panOffsetX;
    var newY = clampedMouseY + panOffsetY;

    // Apply position-only snapping during pan mode
    var snapped;
    if (userPreferences.snapToEdges) {
      snapped = applyPositionSnapping(newX, newY, panModeWidth, panModeHeight, currentRectangle);
    } else {
      snapped = { x: newX, y: newY, width: panModeWidth, height: panModeHeight, verticalSnapPos: null, horizontalSnapPos: null };
    }

    // Clamp to viewport bounds
    var clamped = clampToViewport(snapped.x, snapped.y, snapped.width, snapped.height);
    updateRectangle(currentRectangle, clamped.x, clamped.y, clamped.width, clamped.height);

    // Show guide lines if snapping occurred and guidelines are enabled
    if (userPreferences.snapToEdges) {
      if (snapped.verticalSnapPos !== null) {
        showVerticalGuide(snapped.verticalSnapPos);
      } else {
        if (verticalGuideLine) verticalGuideLine.style.display = "none";
      }

      if (snapped.horizontalSnapPos !== null) {
        showHorizontalGuide(snapped.horizontalSnapPos);
      } else {
        if (horizontalGuideLine) horizontalGuideLine.style.display = "none";
      }
    }
  } else {
    // Normal/Alt/Cmd-Ctrl mode: resize the rectangle (from corner or center, with optional axis constraint)
    var coords = calculateRectCoords(clampedMouseX, clampedMouseY);

    // Apply snapping during drawing/resizing
    var snapped;
    if (userPreferences.snapToEdges) {
      snapped = applySnapping(coords.x, coords.y, coords.width, coords.height, currentRectangle);
    } else {
      snapped = { x: coords.x, y: coords.y, width: coords.width, height: coords.height, verticalSnapPos: null, horizontalSnapPos: null };
    }

    // Clamp to viewport bounds
    var clamped = clampToViewport(snapped.x, snapped.y, snapped.width, snapped.height);
    updateRectangle(currentRectangle, clamped.x, clamped.y, clamped.width, clamped.height);

    // Show guide lines if snapping occurred and guidelines are enabled
    if (userPreferences.snapToEdges) {
      if (snapped.verticalSnapPos !== null) {
        showVerticalGuide(snapped.verticalSnapPos);
      } else {
        if (verticalGuideLine) verticalGuideLine.style.display = "none";
      }

      if (snapped.horizontalSnapPos !== null) {
        showHorizontalGuide(snapped.horizontalSnapPos);
      } else {
        if (horizontalGuideLine) horizontalGuideLine.style.display = "none";
      }
    }
  }

  event.preventDefault();
}

// Mouse up handler - finish drawing, duplication, or repositioning
function handleMouseUp(event) {
  // Hide guide lines when releasing mouse
  hideGuideLines();

  // If duplicating, finalize the duplicate placement
  if (isDuplicating && duplicatingRectangle) {
    placedRectangles.push(duplicatingRectangle);
    duplicatingRectangle = null;
    isDuplicating = false;
    duplicateAxisLocked = null;
    document.documentElement.classList.remove(DRAGGING_MODE_CLASS);
    event.preventDefault();
    return;
  }

  // If repositioning, finalize it
  if (isRepositioning && repositioningRectangle) {
    isRepositioning = false;
    repositioningRectangle = null;
    repositionAxisLocked = null;
    document.documentElement.classList.remove(DRAGGING_MODE_CLASS);
    event.preventDefault();
    return;
  }

  if (!isDrawingMode || !isCurrentlyDrawing) {
    return;
  }

  isCurrentlyDrawing = false;
  isSpacebarHeld = false; // Reset spacebar state
  isAltHeld = false; // Reset Alt state
  isCmdCtrlHeld = false; // Reset Cmd/Ctrl state
  axisConstraintMode = null; // Reset axis constraint

  // Keep the rectangle if it has some size
  if (currentRectangle) {
    var width = parseInt(currentRectangle.style.width, 10);
    var height = parseInt(currentRectangle.style.height, 10);

    if (width > 3 && height > 3) {
      // Add to the array of placed rectangles
      placedRectangles.push(currentRectangle);
    } else {
      // Remove tiny rectangles (accidental clicks)
      if (currentRectangle.parentNode) {
        currentRectangle.parentNode.removeChild(currentRectangle);
      }
    }
  }

  currentRectangle = null;
  event.preventDefault();
}

// Click handler - prevent all clicks when in drawing mode
function handleClick(event) {
  if (!isDrawingMode) {
    return;
  }

  // Prevent click from triggering page actions (links, buttons, etc.)
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

// Spacebar keydown - enter pan mode during drawing
function handleSpacebarDown(event) {
  if (event.key === " " || event.keyCode === 32) {
    if (isCurrentlyDrawing && !isSpacebarHeld && currentRectangle) {
      isSpacebarHeld = true;

      // Add pan mode class to hide cursor
      document.documentElement.classList.add(PAN_MODE_CLASS);

      // Store current rectangle dimensions
      panModeWidth = parseInt(currentRectangle.style.width, 10);
      panModeHeight = parseInt(currentRectangle.style.height, 10);

      // Calculate offset from cursor to rectangle top-left using tracked mouse position
      var rectLeft = parseInt(currentRectangle.style.left, 10);
      var rectTop = parseInt(currentRectangle.style.top, 10);
      panOffsetX = rectLeft - currentMouseX;
      panOffsetY = rectTop - currentMouseY;

      event.preventDefault();
    }
  }
}

// Spacebar keyup - exit pan mode and recalculate start position
function handleSpacebarUp(event) {
  if (event.key === " " || event.keyCode === 32) {
    if (isCurrentlyDrawing && isSpacebarHeld && currentRectangle) {
      isSpacebarHeld = false;

      // Remove pan mode class to restore cursor
      document.documentElement.classList.remove(PAN_MODE_CLASS);

      // Recalculate startX and startY based on current rectangle position
      var rectLeft = parseInt(currentRectangle.style.left, 10);
      var rectTop = parseInt(currentRectangle.style.top, 10);
      var rectWidth = parseInt(currentRectangle.style.width, 10);
      var rectHeight = parseInt(currentRectangle.style.height, 10);

      // Determine which corner should be the fixed anchor point
      // based on where the cursor is relative to the rectangle
      if (currentMouseX >= rectLeft + rectWidth / 2) {
        startX = rectLeft;
      } else {
        startX = rectLeft + rectWidth;
      }

      if (currentMouseY >= rectTop + rectHeight / 2) {
        startY = rectTop;
        } else {
        startY = rectTop + rectHeight;
      }

      event.preventDefault();
    }
  }
}

// Alt+D handler - duplicate last rectangle
// Alt+D handler removed - now using Alt+drag like Figma

// ESC key handler - clear rectangle and exit drawing mode
function handleKeyDown(event) {
  if (event.key === "Escape" || event.keyCode === 27) {
    // If duplicating, cancel duplication
    if (isDuplicating && duplicatingRectangle) {
      if (duplicatingRectangle.parentNode) {
        duplicatingRectangle.parentNode.removeChild(duplicatingRectangle);
      }
      duplicatingRectangle = null;
      isDuplicating = false;
      duplicateAxisLocked = null;
      event.preventDefault();
      return;
    }
    disableDrawingMode();
  } else if (event.key === "Tab" || event.keyCode === 9) {
    // Tab key - cycle through colors
    if (isDrawingMode) {
      var targetRect = null;

      // Determine which rectangle to color cycle
      if (isCurrentlyDrawing && currentRectangle) {
        targetRect = currentRectangle;
      } else if (isDuplicating && duplicatingRectangle) {
        targetRect = duplicatingRectangle;
      } else if (isRepositioning && repositioningRectangle) {
        targetRect = repositioningRectangle;
      } else {
        // Not actively dragging, check if hovering over a rectangle
        targetRect = getRectangleAtPosition(currentMouseX, currentMouseY);
      }

      if (targetRect) {
        event.preventDefault();
        cycleRectangleColor(targetRect);
        return;
      }
    }
  } else if (event.key === "Delete" || event.key === "Backspace" || event.keyCode === 46 || event.keyCode === 8) {
    // Delete/Backspace key - remove rectangle if hovering over one
    if (isDrawingMode && !isCurrentlyDrawing && !isDuplicating && !isRepositioning) {
      var rectUnderMouse = getRectangleAtPosition(currentMouseX, currentMouseY);
      if (rectUnderMouse) {
        event.preventDefault();
        deleteRectangle(rectUnderMouse);
        return;
      }
    }
  } else {
    handleSpacebarDown(event);
  }
}

function handleKeyUp(event) {
  handleSpacebarUp(event);
}

// Enable drawing mode
function enableDrawingMode() {
  if (isDrawingMode) {
    return;
  }

  // Load preferences first, then enable drawing mode
  loadPreferences(function() {
    isDrawingMode = true;
    document.documentElement.classList.add(DRAWING_MODE_CLASS);

    // Create snap guide lines
    createGuideLines();

    // Add event listeners
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
  });
}

// Disable drawing mode
function disableDrawingMode() {
  if (!isDrawingMode) {
    return;
  }

  isDrawingMode = false;
  isSpacebarHeld = false;
  isAltHeld = false;
  isCmdCtrlHeld = false;
  isDuplicating = false;
  isRepositioning = false;
  document.documentElement.classList.remove(DRAWING_MODE_CLASS);
  document.documentElement.classList.remove(PAN_MODE_CLASS);
  document.documentElement.classList.remove(REPOSITIONING_MODE_CLASS);
  document.documentElement.classList.remove(DUPLICATION_HOVER_CLASS);
  document.documentElement.classList.remove(DRAGGING_MODE_CLASS);

  // Remove snap guide lines
  removeGuideLines();

  // Remove event listeners
  document.removeEventListener("mousedown", handleMouseDown, true);
  document.removeEventListener("mousemove", handleMouseMove, true);
  document.removeEventListener("mouseup", handleMouseUp, true);
  document.removeEventListener("click", handleClick, true);
  document.removeEventListener("keydown", handleKeyDown, true);
  document.removeEventListener("keyup", handleKeyUp, true);

  // Clear any rectangles
  clearAllRectangles();

  if (isCurrentlyDrawing && currentRectangle && currentRectangle.parentNode) {
    currentRectangle.parentNode.removeChild(currentRectangle);
    currentRectangle = null;
    isCurrentlyDrawing = false;
  }

  // Clear duplicating rectangle if any
  if (duplicatingRectangle && duplicatingRectangle.parentNode) {
    duplicatingRectangle.parentNode.removeChild(duplicatingRectangle);
    duplicatingRectangle = null;
  }

  // Clear repositioning state
  repositioningRectangle = null;
}

// Toggle drawing mode
function toggleDrawingMode() {
  if (isDrawingMode) {
    disableDrawingMode();
  } else {
    enableDrawingMode();
  }
}

// Listen for messages from popup
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener(function handleMessage(message) {
    if (!message || message.type !== "TOGGLE_BOX_HIGHLIGHT") {
      return;
    }

    toggleDrawingMode();
  });
}
