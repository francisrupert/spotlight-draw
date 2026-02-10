// State management
var isDrawingMode = false;
var isCurrentlyDrawing = false;
var isSpacebarHeld = false;
var isAltHeld = false;
var startX = 0;
var startY = 0;
var currentMouseX = 0;
var currentMouseY = 0;
var currentRectangle = null;
var placedRectangles = []; // Array to hold multiple rectangles (when Shift is used)

// Pan mode state (when spacebar is held during drawing)
var panModeWidth = 0;
var panModeHeight = 0;
var panOffsetX = 0;
var panOffsetY = 0;

// CSS class names
var DRAWING_MODE_CLASS = "box-highlight-drawing-mode";
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

  if (isAltHeld) {
    // Alt held: draw from center outward
    var halfWidth = Math.abs(currentX - startX);
    var halfHeight = Math.abs(currentY - startY);
    x = startX - halfWidth;
    y = startY - halfHeight;
    width = halfWidth * 2;
    height = halfHeight * 2;
  } else {
    // Normal: draw from corner to corner
    x = Math.min(startX, currentX);
    y = Math.min(startY, currentY);
    width = Math.abs(currentX - startX);
    height = Math.abs(currentY - startY);
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

// Mouse down handler - start drawing
function handleMouseDown(event) {
  if (!isDrawingMode) {
    return;
  }

  // Only clear previous rectangles if Shift is NOT held
  if (!event.shiftKey) {
    clearAllRectangles();
  }

  isCurrentlyDrawing = true;
  isSpacebarHeld = false; // Reset spacebar state
  isAltHeld = event.altKey; // Capture initial Alt state
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

  if (!isDrawingMode || !isCurrentlyDrawing || !currentRectangle) {
    return;
  }

  // Update Alt state during drawing
  isAltHeld = event.altKey;

  if (isSpacebarHeld) {
    // Pan mode: move the entire rectangle without resizing
    var newX = currentMouseX + panOffsetX;
    var newY = currentMouseY + panOffsetY;
    updateRectangle(currentRectangle, newX, newY, panModeWidth, panModeHeight);
  } else {
    // Normal/Alt mode: resize the rectangle (from corner or center)
    var coords = calculateRectCoords(currentMouseX, currentMouseY);
    updateRectangle(currentRectangle, coords.x, coords.y, coords.width, coords.height);
  }

  event.preventDefault();
}

// Mouse up handler - finish drawing
function handleMouseUp(event) {
  if (!isDrawingMode || !isCurrentlyDrawing) {
    return;
  }

  isCurrentlyDrawing = false;
  isSpacebarHeld = false; // Reset spacebar state
  isAltHeld = false; // Reset Alt state

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

// Spacebar keydown - enter pan mode during drawing
function handleSpacebarDown(event) {
  if (event.key === " " || event.keyCode === 32) {
    if (isCurrentlyDrawing && !isSpacebarHeld && currentRectangle) {
      isSpacebarHeld = true;

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

// ESC key handler - clear rectangle and exit drawing mode
function handleKeyDown(event) {
  if (event.key === "Escape" || event.keyCode === 27) {
    disableDrawingMode();
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

  isDrawingMode = true;
  document.documentElement.classList.add(DRAWING_MODE_CLASS);

  // Add event listeners
  document.addEventListener("mousedown", handleMouseDown, true);
  document.addEventListener("mousemove", handleMouseMove, true);
  document.addEventListener("mouseup", handleMouseUp, true);
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
  document.documentElement.classList.remove(DRAWING_MODE_CLASS);

  // Remove event listeners
  document.removeEventListener("mousedown", handleMouseDown, true);
  document.removeEventListener("mousemove", handleMouseMove, true);
  document.removeEventListener("mouseup", handleMouseUp, true);
  document.removeEventListener("keydown", handleKeyDown, true);
  document.removeEventListener("keyup", handleKeyUp, true);

  // Clear any rectangles
  clearAllRectangles();

  if (isCurrentlyDrawing && currentRectangle && currentRectangle.parentNode) {
    currentRectangle.parentNode.removeChild(currentRectangle);
    currentRectangle = null;
    isCurrentlyDrawing = false;
  }
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
