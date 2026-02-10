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
var RECTANGLE_CLASS = "box-highlight-rectangle";

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
  return rect;
}

// Update rectangle position and size
function updateRectangle(rect, x, y, width, height) {
  rect.style.left = x + "px";
  rect.style.top = y + "px";
  rect.style.width = Math.abs(width) + "px";
  rect.style.height = Math.abs(height) + "px";
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

// Mouse down handler - start drawing, finalize duplication, or start repositioning
function handleMouseDown(event) {
  if (!isDrawingMode) {
    return;
  }

  // If duplicating, finalize the duplicate placement
  if (isDuplicating && duplicatingRectangle) {
    placedRectangles.push(duplicatingRectangle);
    duplicatingRectangle = null;
    isDuplicating = false;
    duplicateAxisLocked = null;
    event.preventDefault();
    return;
  }

  // If Cmd/Ctrl is held and mouse is over a rectangle, start repositioning
  if ((event.metaKey || event.ctrlKey) && !isCurrentlyDrawing) {
    var rectUnderMouse = getRectangleAtPosition(event.clientX, event.clientY);
    if (rectUnderMouse) {
      isRepositioning = true;
      repositioningRectangle = rectUnderMouse;

      // Add repositioning mode class to change cursor
      document.documentElement.classList.add(REPOSITIONING_MODE_CLASS);

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
  }

  // Handle repositioning mode
  if (isRepositioning && repositioningRectangle) {
    var newX = currentMouseX + repositionOffsetX;
    var newY = currentMouseY + repositionOffsetY;

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

    repositioningRectangle.style.left = newX + "px";
    repositioningRectangle.style.top = newY + "px";
    event.preventDefault();
    return;
  }

  // Handle duplication drag mode
  if (isDuplicating && duplicatingRectangle) {
    var newX = currentMouseX + duplicateOffsetX;
    var newY = currentMouseY + duplicateOffsetY;

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

    duplicatingRectangle.style.left = newX + "px";
    duplicatingRectangle.style.top = newY + "px";
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

  if (isSpacebarHeld) {
    // Pan mode: move the entire rectangle without resizing
    var newX = currentMouseX + panOffsetX;
    var newY = currentMouseY + panOffsetY;
    updateRectangle(currentRectangle, newX, newY, panModeWidth, panModeHeight);
  } else {
    // Normal/Alt/Cmd-Ctrl mode: resize the rectangle (from corner or center, with optional axis constraint)
    var coords = calculateRectCoords(currentMouseX, currentMouseY);
    updateRectangle(currentRectangle, coords.x, coords.y, coords.width, coords.height);
  }

  event.preventDefault();
}

// Mouse up handler - finish drawing or repositioning
function handleMouseUp(event) {
  // If repositioning, finalize it
  if (isRepositioning && repositioningRectangle) {
    isRepositioning = false;
    repositioningRectangle = null;
    repositionAxisLocked = null;
    document.documentElement.classList.remove(REPOSITIONING_MODE_CLASS);
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
function handleDuplicateShortcut(event) {
  // Check for Alt+D using event.code (more reliable with modifiers)
  if (event.altKey && (event.code === "KeyD" || event.key === "d" || event.key === "D")) {
    if (isDrawingMode && !isCurrentlyDrawing && !isDuplicating && placedRectangles.length > 0) {
      // Get the last placed rectangle
      var lastRect = placedRectangles[placedRectangles.length - 1];

      // Create a duplicate
      var rectLeft = parseInt(lastRect.style.left, 10);
      var rectTop = parseInt(lastRect.style.top, 10);
      var rectWidth = parseInt(lastRect.style.width, 10);
      var rectHeight = parseInt(lastRect.style.height, 10);

      duplicatingRectangle = createRectangle(rectLeft, rectTop, rectWidth, rectHeight);
      document.body.appendChild(duplicatingRectangle);

      // Calculate offset from cursor to rectangle top-left
      duplicateOffsetX = rectLeft - currentMouseX;
      duplicateOffsetY = rectTop - currentMouseY;

      // Store starting position for axis locking
      duplicateStartX = rectLeft;
      duplicateStartY = rectTop;
      duplicateAxisLocked = null;

      isDuplicating = true;

      event.preventDefault();
      event.stopPropagation();
    }
  }
}

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
  } else {
    handleDuplicateShortcut(event);
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

  isDrawingMode = true;
  document.documentElement.classList.add(DRAWING_MODE_CLASS);

  // Add event listeners
  document.addEventListener("mousedown", handleMouseDown, true);
  document.addEventListener("mousemove", handleMouseMove, true);
  document.addEventListener("mouseup", handleMouseUp, true);
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeyDown, true);
  document.addEventListener("keyup", handleKeyUp, true);
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
