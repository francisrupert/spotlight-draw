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
var lastDeletedRect = null; // { left, top, width, height, borderWidth, colorIndex, colorClass }

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

// Element inspection state (when 'f' key is held)
var isInspecting = false;
var inspectionRectangle = null;
var inspectedElement = null;
var inspectionTraversalPath = []; // Stack of elements for up/down navigation
var inspectionCurrentIndex = -1; // Current position in traversal path
var inspectionOriginElement = null; // The starting element

// Help dialog state
var helpButton = null;
var helpDialog = null;

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
  borderSize: DEFAULT_PREFERENCES.borderSize,
  defaultColor: DEFAULT_PREFERENCES.defaultColor,
  snapToEdges: DEFAULT_PREFERENCES.snapToEdges
};

// Snap-to-edge configuration
var SNAP_THRESHOLD = 8; // pixels

// Constants
var Z_INDEX_RECTANGLE = "2147483647";
var Z_INDEX_GUIDE = "2147483646";
var MIN_RECT_SIZE = 3;
var GUIDE_BORDER_STYLE = "0.5px dashed GrayText";
var ANIMATION_DURATION = 300;

// Snap guide lines (2 per axis to support dual-edge snapping)
var horizontalGuideLines = [null, null];
var verticalGuideLines = [null, null];

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

// Read a rectangle's current position and size from inline styles
function getRectBounds(rect) {
  return {
    left: parseInt(rect.style.left, 10),
    top: parseInt(rect.style.top, 10),
    width: parseInt(rect.style.width, 10),
    height: parseInt(rect.style.height, 10)
  };
}

// Clamp a mouse coordinate to the viewport
function clampMouse(x, y) {
  return {
    x: Math.max(0, Math.min(x, window.innerWidth)),
    y: Math.max(0, Math.min(y, window.innerHeight))
  };
}

// Apply shift-axis locking to a drag operation
function applyAxisLock(newX, newY, startX, startY, axisLocked, shiftKey) {
  if (shiftKey) {
    if (!axisLocked) {
      var deltaX = Math.abs(newX - startX);
      var deltaY = Math.abs(newY - startY);
      axisLocked = deltaX > deltaY ? "horizontal" : "vertical";
    }
    if (axisLocked === "horizontal") {
      newY = startY;
    } else if (axisLocked === "vertical") {
      newX = startX;
    }
  } else {
    axisLocked = null;
  }
  return { x: newX, y: newY, axisLocked: axisLocked };
}

// Remove all color-variant classes from a rectangle
function removeColorClasses(rect) {
  for (var i = 0; i < COLOR_CLASSES.length; i++) {
    if (COLOR_CLASSES[i]) {
      rect.classList.remove(COLOR_CLASSES[i]);
    }
  }
}

// Reset shared drag state (not isSpacebarHeld — it has its own keyup lifecycle)
function resetDragState() {
  isCurrentlyDrawing = false;
  isAltHeld = false;
  isCmdCtrlHeld = false;
  axisConstraintMode = null;
  duplicateAxisLocked = null;
  repositionAxisLocked = null;
}

// Load user preferences from chrome.storage
function loadPreferences(callback) {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(DEFAULT_PREFERENCES, function(items) {
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
  rect.style.zIndex = Z_INDEX_RECTANGLE;

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

// Create help button
function createHelpButton() {
  var helpButton = document.createElement("button");
  helpButton.className = "box-highlight-help__trigger box-highlight-help__trigger--hidden";
  helpButton.textContent = "?";
  helpButton.setAttribute("aria-label", "Show keyboard shortcuts");
  helpButton.style.display = "none"; // Hidden by default

  return helpButton;
}

// Create help dialog
function createHelpDialog() {
  var dialog = document.createElement("dialog");
  dialog.className = "box-highlight-help__dialog";

  // Create header
  var header = document.createElement("div");
  header.className = "box-highlight-help__header";
  header.innerHTML = `
    <h2>Shortcuts & Settings</h2>
    <button class="box-highlight-help__close" aria-label="Close">×</button>
  `;
  dialog.appendChild(header);

  // Create content container
  var content = document.createElement("div");
  content.className = "box-highlight-help__body";

  // SETTINGS SECTION (appears first)
  var settingsSection = document.createElement("section");
  settingsSection.className = "box-highlight-help__settings";
  settingsSection.innerHTML = `
    <h3>Settings</h3>

    <div class="box-highlight-help__setting">
      <label>Border</label>
      <div class="button-group" id="dialog-border-size">
        <button type="button" class="button-group-item" data-value="0.5">0.5</button>
        <button type="button" class="button-group-item" data-value="1">1</button>
        <button type="button" class="button-group-item" data-value="2">2</button>
        <button type="button" class="button-group-item" data-value="3">3</button>
      </div>
    </div>

    <div class="box-highlight-help__setting">
      <label>Color</label>
      <div class="button-group color-group" id="dialog-default-color">
        <button type="button" class="button-group-item color-button" data-value="" data-color="orange" aria-label="Orange"></button>
        <button type="button" class="button-group-item color-button" data-value="box-highlight-rectangle--green" data-color="green" aria-label="Green"></button>
        <button type="button" class="button-group-item color-button" data-value="box-highlight-rectangle--blue" data-color="blue" aria-label="Blue"></button>
        <button type="button" class="button-group-item color-button" data-value="box-highlight-rectangle--purple" data-color="purple" aria-label="Purple"></button>
        <button type="button" class="button-group-item color-button" data-value="box-highlight-rectangle--plain" data-color="plain" aria-label="Gray"></button>
      </div>
    </div>

    <div class="box-highlight-help__setting">
      <label class="checkbox-label">
        <input type="checkbox" id="dialog-snap-to-edges">
        <span>Snap to Edges</span>
      </label>
    </div>
  `;
  content.appendChild(settingsSection);

  // SHORTCUTS SECTION (appears second)
  var shortcutsSection = document.createElement("section");
  shortcutsSection.className = "box-highlight-help__shortcuts";
  shortcutsSection.innerHTML = '<h3>Keyboard Shortcuts</h3>';

  // Render shortcuts from shared data
  renderShortcutsInto(shortcutsSection, "h4", "shortcuts-category");

  content.appendChild(shortcutsSection);
  dialog.appendChild(content);

  return dialog;
}

// Show help dialog
function showHelpDialog() {
  if (helpDialog) {
    helpDialog.showModal();
  }
}

// Hide help dialog
function hideHelpDialog() {
  if (helpDialog && helpDialog.open) {
    helpDialog.close();
  }
}

// Show help button with slide-in animation
function showHelpButton() {
  if (helpButton) {
    helpButton.style.display = "block";
    // Force reflow to ensure transition works
    helpButton.offsetHeight;
    helpButton.classList.add("box-highlight-help__trigger--visible");
    helpButton.classList.remove("box-highlight-help__trigger--hidden");
  }
}

// Hide help button with slide-out animation
function hideHelpButton() {
  if (helpButton) {
    helpButton.classList.add("box-highlight-help__trigger--hidden");
    helpButton.classList.remove("box-highlight-help__trigger--visible");
    // Hide completely after animation completes
    setTimeout(function() {
      if (helpButton && helpButton.classList.contains("box-highlight-help__trigger--hidden")) {
        helpButton.style.display = "none";
      }
    }, ANIMATION_DURATION);
  }
}

// Handle help button click
function handleHelpButtonClick(event) {
  event.preventDefault();
  event.stopPropagation();
  showHelpDialog();
}

// Handle dialog close button click
function handleDialogCloseClick(event) {
  event.preventDefault();
  event.stopPropagation();
  hideHelpDialog();
}

// Handle dialog backdrop click
function handleDialogBackdropClick(event) {
  // Close dialog when clicking on backdrop (outside dialog content)
  if (event.target === helpDialog) {
    hideHelpDialog();
  }
}

// Check if an element is part of the help UI
function isHelpUIElement(element) {
  var current = element;
  while (current) {
    if (current === helpButton || current === helpDialog) return true;
    current = current.parentElement;
  }
  return false;
}

// Load settings into the dialog form
function loadSettingsIntoDialog() {
  if (!helpDialog) return;

  // Load border size - set active button
  var borderButtons = helpDialog.querySelectorAll("#dialog-border-size .button-group-item");
  for (var i = 0; i < borderButtons.length; i++) {
    var button = borderButtons[i];
    if (button.getAttribute("data-value") === userPreferences.borderSize) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  }

  // Load default color - set active button
  var colorButtons = helpDialog.querySelectorAll("#dialog-default-color .button-group-item");
  for (var j = 0; j < colorButtons.length; j++) {
    var colorButton = colorButtons[j];
    if (colorButton.getAttribute("data-value") === userPreferences.defaultColor) {
      colorButton.classList.add("active");
    } else {
      colorButton.classList.remove("active");
    }
  }

  // Load snap to edges
  var snapCheckbox = helpDialog.querySelector("#dialog-snap-to-edges");
  if (snapCheckbox) {
    snapCheckbox.checked = userPreferences.snapToEdges;
  }
}

// Save a setting to chrome.storage
function saveSetting(key, value) {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    var settings = {};
    settings[key] = value;
    chrome.storage.sync.set(settings);
  }
  // Update local preferences
  userPreferences[key] = value;
}

// Setup button groups in dialog using shared helper

// Handle snap to edges change
function handleSnapToEdgesChange(event) {
  var newValue = event.target.checked;
  saveSetting("snapToEdges", newValue);
}

// Initialize help system
function initHelpSystem() {
  // Create help button
  helpButton = createHelpButton();
  document.body.appendChild(helpButton);
  helpButton.addEventListener("click", handleHelpButtonClick, true);

  // Create help dialog
  helpDialog = createHelpDialog();
  document.body.appendChild(helpDialog);

  // Setup dialog event listeners
  var closeButton = helpDialog.querySelector(".box-highlight-help__close");
  if (closeButton) {
    closeButton.addEventListener("click", handleDialogCloseClick, true);
  }

  // Close on backdrop click
  helpDialog.addEventListener("click", handleDialogBackdropClick, true);

  // Setup settings button groups using shared helper
  setupButtonGroup(helpDialog, "dialog-border-size", function(value) { saveSetting("borderSize", value); });
  setupButtonGroup(helpDialog, "dialog-default-color", function(value) { saveSetting("defaultColor", value); });

  // Setup checkbox
  var snapCheckbox = helpDialog.querySelector("#dialog-snap-to-edges");
  if (snapCheckbox) {
    snapCheckbox.addEventListener("change", handleSnapToEdgesChange, true);
  }

  // Load current settings into form
  loadSettingsIntoDialog();
}

// Update rectangle position and size
function updateRectangle(rect, x, y, width, height) {
  rect.style.left = x + "px";
  rect.style.top = y + "px";
  rect.style.width = Math.abs(width) + "px";
  rect.style.height = Math.abs(height) + "px";
}

// Get all snap target edges and centers from placed rectangles (excluding specified rectangle)
function getSnapTargets(excludeRect) {
  var targets = {
    left: [],
    right: [],
    top: [],
    bottom: [],
    centerX: [],
    centerY: []
  };

  for (var i = 0; i < placedRectangles.length; i++) {
    var rect = placedRectangles[i];

    // Skip the rectangle we're currently moving/duplicating
    if (rect === excludeRect) {
      continue;
    }

    var b = getRectBounds(rect);
    var right = b.left + b.width;
    var bottom = b.top + b.height;
    var centerX = b.left + b.width / 2;
    var centerY = b.top + b.height / 2;

    targets.left.push(b.left);
    targets.right.push(right);
    targets.top.push(b.top);
    targets.bottom.push(bottom);
    targets.centerX.push(centerX);
    targets.centerY.push(centerY);
  }

  return targets;
}

// Pick the closer of two candidate snap values to a given position
function pickCloserSnap(position, a, b) {
  if (a === null) return b;
  if (b === null) return a;
  return Math.abs(position - a) <= Math.abs(position - b) ? a : b;
}

// Apply snapping to rectangle edges (for drawing/resizing - can adjust size)
function applySnapping(x, y, width, height, excludeRect) {
  var targets = getSnapTargets(excludeRect);
  var snappedX = x;
  var snappedY = y;
  var snappedWidth = width;
  var snappedHeight = height;
  var verticalSnapPositions = [];
  var horizontalSnapPositions = [];

  // Calculate edges and center of current rectangle
  var left = x;
  var right = x + width;
  var top = y;
  var bottom = y + height;
  var centerX = x + width / 2;
  var centerY = y + height / 2;

  // --- Horizontal (X-axis): left and right edges snap independently ---

  // Best snap for left edge (to any vertical target)
  var bestLeftSnap = pickCloserSnap(left,
    findClosestEdge(left, targets.left),
    findClosestEdge(left, targets.right));

  // Best snap for right edge (to any vertical target)
  var bestRightSnap = pickCloserSnap(right,
    findClosestEdge(right, targets.right),
    findClosestEdge(right, targets.left));

  // Apply left snap
  if (bestLeftSnap !== null) {
    snappedX = bestLeftSnap;
    snappedWidth = width + (x - bestLeftSnap);
    verticalSnapPositions.push(bestLeftSnap);
  }

  // Apply right snap — independently, can coexist with left
  if (bestRightSnap !== null) {
    snappedWidth = bestRightSnap - snappedX;
    verticalSnapPositions.push(bestRightSnap);
  }

  // Center snap only if neither edge snapped
  if (bestLeftSnap === null && bestRightSnap === null) {
    var centerXSnap = findClosestEdge(centerX, targets.centerX);
    if (centerXSnap !== null) {
      snappedX = x + (centerXSnap - centerX);
      verticalSnapPositions.push(centerXSnap);
    }
  }

  // --- Vertical (Y-axis): top and bottom edges snap independently ---

  // Best snap for top edge (to any horizontal target)
  var bestTopSnap = pickCloserSnap(top,
    findClosestEdge(top, targets.top),
    findClosestEdge(top, targets.bottom));

  // Best snap for bottom edge (to any horizontal target)
  var bestBottomSnap = pickCloserSnap(bottom,
    findClosestEdge(bottom, targets.bottom),
    findClosestEdge(bottom, targets.top));

  // Apply top snap
  if (bestTopSnap !== null) {
    snappedY = bestTopSnap;
    snappedHeight = height + (y - bestTopSnap);
    horizontalSnapPositions.push(bestTopSnap);
  }

  // Apply bottom snap — independently, can coexist with top
  if (bestBottomSnap !== null) {
    snappedHeight = bestBottomSnap - snappedY;
    horizontalSnapPositions.push(bestBottomSnap);
  }

  // Center snap only if neither edge snapped
  if (bestTopSnap === null && bestBottomSnap === null) {
    var centerYSnap = findClosestEdge(centerY, targets.centerY);
    if (centerYSnap !== null) {
      snappedY = y + (centerYSnap - centerY);
      horizontalSnapPositions.push(centerYSnap);
    }
  }

  return {
    x: snappedX,
    y: snappedY,
    width: snappedWidth,
    height: snappedHeight,
    verticalSnapPositions: verticalSnapPositions,
    horizontalSnapPositions: horizontalSnapPositions
  };
}

// Apply snapping for moving rectangles (repositioning/duplicating - only adjusts position, keeps size fixed)
function applyPositionSnapping(x, y, width, height, excludeRect) {
  var targets = getSnapTargets(excludeRect);
  var snappedX = x;
  var snappedY = y;
  var verticalSnapPositions = [];
  var horizontalSnapPositions = [];

  // Calculate edges and center of current rectangle
  var left = x;
  var right = x + width;
  var top = y;
  var bottom = y + height;
  var centerX = x + width / 2;
  var centerY = y + height / 2;

  // --- Horizontal (X-axis) ---

  // Best snap for left edge (to any vertical target)
  var bestLeftSnap = pickCloserSnap(left,
    findClosestEdge(left, targets.left),
    findClosestEdge(left, targets.right));

  // Best snap for right edge (to any vertical target)
  var bestRightSnap = pickCloserSnap(right,
    findClosestEdge(right, targets.right),
    findClosestEdge(right, targets.left));

  // For position snapping, both edges can't independently adjust — pick the closer one for position
  var leftSnapDist = bestLeftSnap !== null ? Math.abs(left - bestLeftSnap) : Infinity;
  var rightSnapDist = bestRightSnap !== null ? Math.abs(right - bestRightSnap) : Infinity;

  if (leftSnapDist <= rightSnapDist && bestLeftSnap !== null) {
    snappedX = bestLeftSnap;
    verticalSnapPositions.push(bestLeftSnap);
    // Also show right guide if right edge aligns too
    if (bestRightSnap !== null) {
      // Recalculate right edge after applying left snap
      var newRight = bestLeftSnap + width;
      var rightAfterSnap = pickCloserSnap(newRight,
        findClosestEdge(newRight, targets.right),
        findClosestEdge(newRight, targets.left));
      if (rightAfterSnap !== null) {
        verticalSnapPositions.push(rightAfterSnap);
      }
    }
  } else if (bestRightSnap !== null) {
    snappedX = bestRightSnap - width;
    verticalSnapPositions.push(bestRightSnap);
    // Also show left guide if left edge aligns too
    if (bestLeftSnap !== null) {
      var newLeft = bestRightSnap - width;
      var leftAfterSnap = pickCloserSnap(newLeft,
        findClosestEdge(newLeft, targets.left),
        findClosestEdge(newLeft, targets.right));
      if (leftAfterSnap !== null) {
        verticalSnapPositions.push(leftAfterSnap);
      }
    }
  }

  // Center snap only if neither edge snapped
  if (bestLeftSnap === null && bestRightSnap === null) {
    var centerXSnap = findClosestEdge(centerX, targets.centerX);
    if (centerXSnap !== null) {
      snappedX = centerXSnap - width / 2;
      verticalSnapPositions.push(centerXSnap);
    }
  }

  // --- Vertical (Y-axis) ---

  // Best snap for top edge (to any horizontal target)
  var bestTopSnap = pickCloserSnap(top,
    findClosestEdge(top, targets.top),
    findClosestEdge(top, targets.bottom));

  // Best snap for bottom edge (to any horizontal target)
  var bestBottomSnap = pickCloserSnap(bottom,
    findClosestEdge(bottom, targets.bottom),
    findClosestEdge(bottom, targets.top));

  // Pick the closer one for position
  var topSnapDist = bestTopSnap !== null ? Math.abs(top - bestTopSnap) : Infinity;
  var bottomSnapDist = bestBottomSnap !== null ? Math.abs(bottom - bestBottomSnap) : Infinity;

  if (topSnapDist <= bottomSnapDist && bestTopSnap !== null) {
    snappedY = bestTopSnap;
    horizontalSnapPositions.push(bestTopSnap);
    // Also show bottom guide if bottom edge aligns too
    if (bestBottomSnap !== null) {
      var newBottom = bestTopSnap + height;
      var bottomAfterSnap = pickCloserSnap(newBottom,
        findClosestEdge(newBottom, targets.bottom),
        findClosestEdge(newBottom, targets.top));
      if (bottomAfterSnap !== null) {
        horizontalSnapPositions.push(bottomAfterSnap);
      }
    }
  } else if (bestBottomSnap !== null) {
    snappedY = bestBottomSnap - height;
    horizontalSnapPositions.push(bestBottomSnap);
    // Also show top guide if top edge aligns too
    if (bestTopSnap !== null) {
      var newTop = bestBottomSnap - height;
      var topAfterSnap = pickCloserSnap(newTop,
        findClosestEdge(newTop, targets.top),
        findClosestEdge(newTop, targets.bottom));
      if (topAfterSnap !== null) {
        horizontalSnapPositions.push(topAfterSnap);
      }
    }
  }

  // Center snap only if neither edge snapped
  if (bestTopSnap === null && bestBottomSnap === null) {
    var centerYSnap = findClosestEdge(centerY, targets.centerY);
    if (centerYSnap !== null) {
      snappedY = centerYSnap - height / 2;
      horizontalSnapPositions.push(centerYSnap);
    }
  }

  return {
    x: snappedX,
    y: snappedY,
    width: width,
    height: height,
    verticalSnapPositions: verticalSnapPositions,
    horizontalSnapPositions: horizontalSnapPositions
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

// Create snap guide lines (2 per axis)
function createGuideLines() {
  for (var i = 0; i < 2; i++) {
    // Horizontal guide lines
    var hLine = document.createElement("div");
    hLine.style.position = "fixed";
    hLine.style.left = "0";
    hLine.style.width = "100vw";
    hLine.style.height = "0";
    hLine.style.borderTop = GUIDE_BORDER_STYLE;
    hLine.style.pointerEvents = "none";
    hLine.style.zIndex = Z_INDEX_GUIDE;
    hLine.style.display = "none";
    document.body.appendChild(hLine);
    horizontalGuideLines[i] = hLine;

    // Vertical guide lines
    var vLine = document.createElement("div");
    vLine.style.position = "fixed";
    vLine.style.top = "0";
    vLine.style.height = "100vh";
    vLine.style.width = "0";
    vLine.style.borderLeft = GUIDE_BORDER_STYLE;
    vLine.style.pointerEvents = "none";
    vLine.style.zIndex = Z_INDEX_GUIDE;
    vLine.style.display = "none";
    document.body.appendChild(vLine);
    verticalGuideLines[i] = vLine;
  }
}

// Remove snap guide lines
function removeGuideLines() {
  for (var i = 0; i < 2; i++) {
    if (horizontalGuideLines[i] && horizontalGuideLines[i].parentNode) {
      horizontalGuideLines[i].parentNode.removeChild(horizontalGuideLines[i]);
      horizontalGuideLines[i] = null;
    }
    if (verticalGuideLines[i] && verticalGuideLines[i].parentNode) {
      verticalGuideLines[i].parentNode.removeChild(verticalGuideLines[i]);
      verticalGuideLines[i] = null;
    }
  }
}

// Show horizontal guide lines at given Y positions (array of 0-2 values)
function showHorizontalGuides(positions) {
  for (var i = 0; i < 2; i++) {
    if (i < positions.length && horizontalGuideLines[i]) {
      horizontalGuideLines[i].style.top = positions[i] + "px";
      horizontalGuideLines[i].style.display = "block";
    } else if (horizontalGuideLines[i]) {
      horizontalGuideLines[i].style.display = "none";
    }
  }
}

// Show vertical guide lines at given X positions (array of 0-2 values)
function showVerticalGuides(positions) {
  for (var i = 0; i < 2; i++) {
    if (i < positions.length && verticalGuideLines[i]) {
      verticalGuideLines[i].style.left = positions[i] + "px";
      verticalGuideLines[i].style.display = "block";
    } else if (verticalGuideLines[i]) {
      verticalGuideLines[i].style.display = "none";
    }
  }
}

// Hide all guide lines
function hideGuideLines() {
  for (var i = 0; i < 2; i++) {
    if (horizontalGuideLines[i]) {
      horizontalGuideLines[i].style.display = "none";
    }
    if (verticalGuideLines[i]) {
      verticalGuideLines[i].style.display = "none";
    }
  }
}

// Snap, clamp to viewport, and show/hide guide lines in one step
function applySnapClampAndGuides(x, y, width, height, excludeRect, snapFn) {
  var snapped;
  if (userPreferences.snapToEdges) {
    snapped = snapFn(x, y, width, height, excludeRect);
  } else {
    snapped = { x: x, y: y, width: width, height: height, verticalSnapPositions: [], horizontalSnapPositions: [] };
  }

  var clamped = clampToViewport(snapped.x, snapped.y, snapped.width, snapped.height);

  if (userPreferences.snapToEdges) {
    showVerticalGuides(snapped.verticalSnapPositions);
    showHorizontalGuides(snapped.horizontalSnapPositions);
  }

  return clamped;
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
    var b = getRectBounds(rect);

    if (x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height) {
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
  removeColorClasses(rect);

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

  // Snapshot for undo
  var b = getRectBounds(rect);
  lastDeletedRect = {
    left: b.left,
    top: b.top,
    width: b.width,
    height: b.height,
    borderWidth: rect.style.borderWidth,
    colorIndex: rect.getAttribute("data-color-index") || "0",
    colorClass: COLOR_CLASSES[parseInt(rect.getAttribute("data-color-index") || "0", 10)] || ""
  };

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

// Find element at cursor position, excluding extension UI elements
function getElementAtCursor(x, y) {
  // Temporarily remove drawing mode class to restore pointer-events
  // This allows elementFromPoint to detect page elements
  var wasDrawingMode = document.documentElement.classList.contains(DRAWING_MODE_CLASS);
  if (wasDrawingMode) {
    document.documentElement.classList.remove(DRAWING_MODE_CLASS);
  }

  var hiddenElements = [];

  // Exclude our own rectangles and guide lines by temporarily hiding them
  var element = document.elementFromPoint(x, y);
  while (element && (
    (element.classList && element.classList.contains(RECTANGLE_CLASS)) ||
    horizontalGuideLines.indexOf(element) !== -1 ||
    verticalGuideLines.indexOf(element) !== -1
  )) {
    hiddenElements.push({ element: element, display: element.style.display });
    element.style.display = 'none';
    element = document.elementFromPoint(x, y);
  }

  // Restore display for hidden elements
  for (var i = 0; i < hiddenElements.length; i++) {
    hiddenElements[i].element.style.display = hiddenElements[i].display;
  }

  // Restore drawing mode class
  if (wasDrawingMode) {
    document.documentElement.classList.add(DRAWING_MODE_CLASS);
  }

  return element;
}

// Create inspection rectangle from element's bounding rect
function createInspectionRectangle(element) {
  if (!element) return null;

  var rect = element.getBoundingClientRect();

  var inspectRect = createRectangle(
    rect.left,
    rect.top,
    rect.width,
    rect.height
  );

  inspectRect.style.position = 'fixed';

  return inspectRect;
}

// Update inspection rectangle to match element
function updateInspectionRectangle(element) {
  if (!element || !inspectionRectangle) return;

  var rect = element.getBoundingClientRect();
  updateRectangle(
    inspectionRectangle,
    rect.left,
    rect.top,
    rect.width,
    rect.height
  );
}

// Enter inspection mode when 'f' is pressed
function enterInspectionMode() {
  if (!isDrawingMode || isCurrentlyDrawing || isDuplicating || isRepositioning) {
    return false; // Block during other operations
  }

  isInspecting = true;

  inspectedElement = getElementAtCursor(currentMouseX, currentMouseY);

  if (!inspectedElement) {
    exitInspectionMode();
    return false;
  }

  inspectionOriginElement = inspectedElement;
  inspectionTraversalPath = [inspectedElement];
  inspectionCurrentIndex = 0;

  inspectionRectangle = createInspectionRectangle(inspectedElement);
  if (inspectionRectangle) {
    document.body.appendChild(inspectionRectangle);
  }

  document.documentElement.classList.add('box-highlight-inspection-mode');

  return true;
}

// Exit inspection mode when 'f' is released
function exitInspectionMode() {
  if (!isInspecting) return;

  isInspecting = false;

  if (inspectionRectangle && inspectionRectangle.parentNode) {
    inspectionRectangle.parentNode.removeChild(inspectionRectangle);
  }
  inspectionRectangle = null;

  inspectedElement = null;
  inspectionOriginElement = null;
  inspectionTraversalPath = [];
  inspectionCurrentIndex = -1;

  document.documentElement.classList.remove('box-highlight-inspection-mode');
}

// Traverse up to parent element
function traverseUp() {
  if (!isInspecting || !inspectedElement) return;

  var parentElement = inspectedElement.parentElement;

  // Stop at document.body or html
  if (!parentElement || parentElement === document.documentElement ||
      parentElement === document.body) {
    return;
  }

  // If at end of path, add new parent; otherwise navigate back up
  if (inspectionCurrentIndex === inspectionTraversalPath.length - 1) {
    inspectionTraversalPath.push(parentElement);
    inspectionCurrentIndex++;
  } else {
    inspectionCurrentIndex++;
  }

  inspectedElement = inspectionTraversalPath[inspectionCurrentIndex];
  updateInspectionRectangle(inspectedElement);
}

// Traverse down to previous child element
function traverseDown() {
  if (!isInspecting || inspectionCurrentIndex <= 0) return;

  inspectionCurrentIndex--;
  inspectedElement = inspectionTraversalPath[inspectionCurrentIndex];
  updateInspectionRectangle(inspectedElement);
}

// Traverse to sibling element (direction: +1 for next, -1 for previous, with wrapping)
function traverseSibling(direction) {
  if (!isInspecting || !inspectedElement) return;

  var parent = inspectedElement.parentElement;
  if (!parent) return;

  var siblings = parent.children;
  if (siblings.length <= 1) return;

  var currentIndex = -1;
  for (var i = 0; i < siblings.length; i++) {
    if (siblings[i] === inspectedElement) { currentIndex = i; break; }
  }
  if (currentIndex === -1) return;

  var nextIndex = (currentIndex + direction + siblings.length) % siblings.length;
  inspectionTraversalPath[inspectionCurrentIndex] = siblings[nextIndex];
  inspectedElement = siblings[nextIndex];
  updateInspectionRectangle(inspectedElement);
}

// Mouse down handler - start drawing, duplication, or repositioning
function handleMouseDown(event) {
  if (!isDrawingMode) {
    return;
  }

  // Allow clicks on help UI elements to pass through
  if (isHelpUIElement(event.target)) {
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
      var b = getRectBounds(rectUnderMouse);

      duplicatingRectangle = createRectangle(b.left, b.top, b.width, b.height);

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
      var rb = getRectBounds(rectUnderMouse);
      repositionOffsetX = rb.left - event.clientX;
      repositionOffsetY = rb.top - event.clientY;

      // Store starting position for axis locking
      repositionStartX = rb.left;
      repositionStartY = rb.top;
      repositionAxisLocked = null;

      event.preventDefault();
      return;
    }
  }

  // Only clear previous rectangles if Shift is NOT held and it's NOT a right-click
  // Right-click (button === 2) acts like Shift key (multi-rectangle mode)
  if (!event.shiftKey && event.button !== 2) {
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
    var cm = clampMouse(currentMouseX, currentMouseY);
    var clampedMouseX = cm.x;
    var clampedMouseY = cm.y;

    var newX = clampedMouseX + repositionOffsetX;
    var newY = clampedMouseY + repositionOffsetY;

    // Handle Shift for axis locking during repositioning
    var locked = applyAxisLock(newX, newY, repositionStartX, repositionStartY, repositionAxisLocked, event.shiftKey);
    newX = locked.x;
    newY = locked.y;
    repositionAxisLocked = locked.axisLocked;

    var rb = getRectBounds(repositioningRectangle);
    var clamped = applySnapClampAndGuides(newX, newY, rb.width, rb.height, repositioningRectangle, applyPositionSnapping);

    repositioningRectangle.style.left = clamped.x + "px";
    repositioningRectangle.style.top = clamped.y + "px";

    event.preventDefault();
    return;
  }

  // Handle duplication drag mode
  if (isDuplicating && duplicatingRectangle) {
    // Clamp mouse position to viewport bounds
    var cm = clampMouse(currentMouseX, currentMouseY);
    var clampedMouseX = cm.x;
    var clampedMouseY = cm.y;

    var newX = clampedMouseX + duplicateOffsetX;
    var newY = clampedMouseY + duplicateOffsetY;

    // Handle Shift for axis locking during duplication
    var locked = applyAxisLock(newX, newY, duplicateStartX, duplicateStartY, duplicateAxisLocked, event.shiftKey);
    newX = locked.x;
    newY = locked.y;
    duplicateAxisLocked = locked.axisLocked;

    var db = getRectBounds(duplicatingRectangle);
    var clamped = applySnapClampAndGuides(newX, newY, db.width, db.height, duplicatingRectangle, applyPositionSnapping);

    duplicatingRectangle.style.left = clamped.x + "px";
    duplicatingRectangle.style.top = clamped.y + "px";

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
  var cm = clampMouse(currentMouseX, currentMouseY);
  var clampedMouseX = cm.x;
  var clampedMouseY = cm.y;

  if (isSpacebarHeld) {
    // Pan mode: move the entire rectangle without resizing
    var newX = clampedMouseX + panOffsetX;
    var newY = clampedMouseY + panOffsetY;
    var clamped = applySnapClampAndGuides(newX, newY, panModeWidth, panModeHeight, currentRectangle, applyPositionSnapping);
    updateRectangle(currentRectangle, clamped.x, clamped.y, clamped.width, clamped.height);
  } else {
    // Normal/Alt/Cmd-Ctrl mode: resize the rectangle (from corner or center, with optional axis constraint)
    var coords = calculateRectCoords(clampedMouseX, clampedMouseY);
    var clamped = applySnapClampAndGuides(coords.x, coords.y, coords.width, coords.height, currentRectangle, applySnapping);
    updateRectangle(currentRectangle, clamped.x, clamped.y, clamped.width, clamped.height);
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

  resetDragState();

  // Keep the rectangle if it has some size
  if (currentRectangle) {
    var b = getRectBounds(currentRectangle);

    if (b.width > MIN_RECT_SIZE && b.height > MIN_RECT_SIZE) {
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

  // Allow clicks on help UI elements to pass through
  if (isHelpUIElement(event.target)) {
    return;
  }

  // Prevent click from triggering page actions (links, buttons, etc.)
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

// Context menu handler - prevent right-click menu when in drawing mode
function handleContextMenu(event) {
  if (!isDrawingMode) {
    return;
  }

  // Allow right-clicks on help UI elements to pass through
  if (isHelpUIElement(event.target)) {
    return;
  }

  // Prevent context menu from appearing
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

// Spacebar keydown - enter pan mode during drawing
function handleSpacebarDown(event) {
  if (event.key === " " || event.keyCode === 32) {
    // Prevent page scroll when spacebar is pressed during drawing or while pan mode is active
    if (isCurrentlyDrawing || isSpacebarHeld) {
      event.preventDefault();
    }
    if (isCurrentlyDrawing && !isSpacebarHeld && currentRectangle) {
      isSpacebarHeld = true;

      // Add pan mode class to hide cursor
      document.documentElement.classList.add(PAN_MODE_CLASS);

      // Store current rectangle dimensions
      var b = getRectBounds(currentRectangle);
      panModeWidth = b.width;
      panModeHeight = b.height;

      // Calculate offset from cursor to rectangle top-left using tracked mouse position
      panOffsetX = b.left - currentMouseX;
      panOffsetY = b.top - currentMouseY;
    }
  }
}

// Spacebar keyup - exit pan mode and recalculate start position
function handleSpacebarUp(event) {
  if (event.key === " " || event.keyCode === 32) {
    if (isSpacebarHeld) {
      isSpacebarHeld = false;

      // Remove pan mode class to restore cursor
      document.documentElement.classList.remove(PAN_MODE_CLASS);
    }
    if (isCurrentlyDrawing && currentRectangle) {

      // Recalculate startX and startY based on current rectangle position
      var b = getRectBounds(currentRectangle);

      // Determine which corner should be the fixed anchor point
      // based on where the cursor is relative to the rectangle
      if (currentMouseX >= b.left + b.width / 2) {
        startX = b.left;
      } else {
        startX = b.left + b.width;
      }

      if (currentMouseY >= b.top + b.height / 2) {
        startY = b.top;
        } else {
        startY = b.top + b.height;
      }

      event.preventDefault();
    }
  }
}

// ESC key handler - clear rectangle and exit drawing mode
function handleKeyDown(event) {
  // Handle Tab during inspection FIRST to prevent default focus behavior
  if (isInspecting && (event.key === "Tab" || event.keyCode === 9)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    traverseSibling(event.shiftKey ? -1 : 1);
    return;
  }

  // Handle '?' key for help dialog (Shift+/)
  if (event.key === "?" && isDrawingMode) {
    event.preventDefault();
    if (helpDialog && helpDialog.open) {
      hideHelpDialog();
    } else {
      showHelpDialog();
    }
    return;
  }

  // Handle 'f' key for element inspection
  if (event.key === "f" || event.key === "F") {
    if (isDrawingMode && !isInspecting) {
      event.preventDefault();
      enterInspectionMode();
      return;
    }
  }

  // Handle arrow keys during inspection
  if (isInspecting) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      traverseUp();
      return;
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      traverseDown();
      return;
    }
  }

  if (event.key === "Escape" || event.keyCode === 27) {
    // Close help dialog first if open
    if (helpDialog && helpDialog.open) {
      hideHelpDialog();
      event.preventDefault();
      return;
    }
    // Exit inspection mode if active
    if (isInspecting) {
      exitInspectionMode();
      event.preventDefault();
      return;
    }
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
      } else if (!isInspecting) { // Exclude inspection mode
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
  } else if (event.key === "u" || event.key === "U") {
    // Undo last deleted rectangle
    if (isDrawingMode && !isCurrentlyDrawing && !isDuplicating && !isRepositioning && !isInspecting && lastDeletedRect) {
      event.preventDefault();
      var restored = createRectangle(
        lastDeletedRect.left,
        lastDeletedRect.top,
        lastDeletedRect.width,
        lastDeletedRect.height
      );
      // Restore original border width
      restored.style.borderWidth = lastDeletedRect.borderWidth;
      // Restore original color (createRectangle applies default color, so remove it first)
      removeColorClasses(restored);
      if (lastDeletedRect.colorClass) {
        restored.classList.add(lastDeletedRect.colorClass);
      }
      restored.setAttribute("data-color-index", lastDeletedRect.colorIndex);
      document.body.appendChild(restored);
      placedRectangles.push(restored);
      lastDeletedRect = null; // consumed — only one undo
      return;
    }
  } else {
    handleSpacebarDown(event);
  }
}

function handleKeyUp(event) {
  // Handle 'f' key release - exit inspection mode
  if (event.key === "f" || event.key === "F") {
    if (isInspecting) {
      event.preventDefault();
      exitInspectionMode();
      return;
    }
  }

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

    // Initialize and show help button
    if (!helpButton) {
      initHelpSystem();
    }
    showHelpButton();

    // Create snap guide lines
    createGuideLines();

    // Add event listeners
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
  });
}

// Disable drawing mode
function disableDrawingMode() {
  if (!isDrawingMode) {
    return;
  }

  // Exit inspection mode if active
  if (isInspecting) {
    exitInspectionMode();
  }

  // Hide help button and close dialog if open
  hideHelpButton();
  if (helpDialog && helpDialog.open) {
    helpDialog.close();
  }

  isDrawingMode = false;
  isSpacebarHeld = false;
  resetDragState();
  isDuplicating = false;
  isRepositioning = false;
  lastDeletedRect = null;
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
  document.removeEventListener("contextmenu", handleContextMenu, true);
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
