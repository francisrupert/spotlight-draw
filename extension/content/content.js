// State management
var isDrawingMode = false;
var isCurrentlyDrawing = false;
var startX = 0;
var startY = 0;
var currentRectangle = null;
var placedRectangle = null; // Only one rectangle at a time

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
  var x = Math.min(startX, currentX);
  var y = Math.min(startY, currentY);
  var width = Math.abs(currentX - startX);
  var height = Math.abs(currentY - startY);
  return { x: x, y: y, width: width, height: height };
}

// Remove the placed rectangle
function removePlacedRectangle() {
  if (placedRectangle && placedRectangle.parentNode) {
    placedRectangle.parentNode.removeChild(placedRectangle);
  }
  placedRectangle = null;
}

// Mouse down handler - start drawing
function handleMouseDown(event) {
  if (!isDrawingMode) {
    return;
  }

  // Always remove previous rectangle on any mousedown (whether dragging or just clicking)
  removePlacedRectangle();

  isCurrentlyDrawing = true;
  startX = event.clientX;
  startY = event.clientY;

  // Create initial rectangle
  currentRectangle = createRectangle(startX, startY, 0, 0);
  document.body.appendChild(currentRectangle);

  event.preventDefault();
}

// Mouse move handler - update rectangle size
function handleMouseMove(event) {
  if (!isDrawingMode || !isCurrentlyDrawing || !currentRectangle) {
    return;
  }

  var coords = calculateRectCoords(event.clientX, event.clientY);
  updateRectangle(currentRectangle, coords.x, coords.y, coords.width, coords.height);

  event.preventDefault();
}

// Mouse up handler - finish drawing
function handleMouseUp(event) {
  if (!isDrawingMode || !isCurrentlyDrawing) {
    return;
  }

  isCurrentlyDrawing = false;

  // Keep the rectangle if it has some size
  if (currentRectangle) {
    var width = parseInt(currentRectangle.style.width, 10);
    var height = parseInt(currentRectangle.style.height, 10);

    if (width > 3 && height > 3) {
      // This becomes the placed rectangle
      placedRectangle = currentRectangle;
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

// ESC key handler - clear rectangle and exit drawing mode
function handleKeyDown(event) {
  if (event.key === "Escape" || event.keyCode === 27) {
    disableDrawingMode();
  }
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
}

// Disable drawing mode
function disableDrawingMode() {
  if (!isDrawingMode) {
    return;
  }

  isDrawingMode = false;
  document.documentElement.classList.remove(DRAWING_MODE_CLASS);

  // Remove event listeners
  document.removeEventListener("mousedown", handleMouseDown, true);
  document.removeEventListener("mousemove", handleMouseMove, true);
  document.removeEventListener("mouseup", handleMouseUp, true);
  document.removeEventListener("keydown", handleKeyDown, true);

  // Clear any rectangles
  removePlacedRectangle();

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
