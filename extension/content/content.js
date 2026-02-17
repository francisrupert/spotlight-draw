// State management
var isDrawingMode = false;
var isCurrentlyDrawing = false;
var isDuplicating = false;
var isRepositioning = false;
var isSpacebarHeld = false;
var isAltHeld = false;
var isCmdCtrlHeld = false;
var isShiftHeld = false;
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

// Resize state (when dragging edge/corner of existing rectangle)
var isResizing = false;
var resizingRectangle = null;
var resizeHandle = null;       // "n","s","e","w","ne","nw","se","sw"
var resizeStartBounds = null;  // { left, top, width, height }

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
var DRAWING_MODE_CLASS = "spotlight-draw-drawing-mode";
var PAN_MODE_CLASS = "spotlight-draw-pan-mode";
var REPOSITIONING_MODE_CLASS = "spotlight-draw-repositioning-mode";
var DUPLICATION_HOVER_CLASS = "spotlight-draw-duplication-hover-mode";
var DUPLICATION_DRAGGING_CLASS = "spotlight-draw-duplication-dragging-mode";
var DRAGGING_MODE_CLASS = "spotlight-draw-dragging-mode";
var RECTANGLE_CLASS = "spotlight-draw-rectangle";

// Color cycling (order: orange, green, blue, purple, plain)
var COLOR_CLASSES = [
  "",                                    // orange (default)
  "spotlight-draw-rectangle--green",     // green
  "spotlight-draw-rectangle--blue",      // blue
  "spotlight-draw-rectangle--purple",    // purple
  "spotlight-draw-rectangle--plain"      // plain
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
var RESIZE_HANDLE_SIZE = 6; // pixels — edge/corner hit zone

// Snap guide lines (2 per axis to support dual-edge snapping)
var horizontalGuideLines = [null, null];
var verticalGuideLines = [null, null];

// Spacing guide lines (for even spacing visualization - dynamically created)
var spacingGuideElements = [];

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
  isShiftHeld = false;
  axisConstraintMode = null;
  duplicateAxisLocked = null;
  repositionAxisLocked = null;
  isResizing = false;
  resizingRectangle = null;
  resizeHandle = null;
  resizeStartBounds = null;
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
  helpButton.className = "spotlight-draw-help__trigger spotlight-draw-help__trigger--hidden";
  helpButton.textContent = "?";
  helpButton.setAttribute("aria-label", "Show keyboard shortcuts");
  helpButton.style.display = "none"; // Hidden by default

  return helpButton;
}

// Create help dialog
function createHelpDialog() {
  var dialog = document.createElement("dialog");
  dialog.className = "spotlight-draw-help__dialog";

  // Create header
  var header = document.createElement("div");
  header.className = "spotlight-draw-help__header";
  header.innerHTML = `
    <h2>Shortcuts & Settings</h2>
    <button class="spotlight-draw-help__close" aria-label="Close">×</button>
  `;
  dialog.appendChild(header);

  // Create content container
  var content = document.createElement("div");
  content.className = "spotlight-draw-help__body";

  // SETTINGS SECTION (appears first)
  var settingsSection = document.createElement("section");
  settingsSection.className = "spotlight-draw-help__settings";
  settingsSection.innerHTML = `
    <h3>Settings</h3>

    <div class="spotlight-draw-help__setting">
      <label>Border</label>
      <div class="button-group" id="dialog-border-size">
        <button type="button" class="button-group-item" data-value="0.5">0.5</button>
        <button type="button" class="button-group-item" data-value="1">1</button>
        <button type="button" class="button-group-item" data-value="2">2</button>
        <button type="button" class="button-group-item" data-value="3">3</button>
      </div>
    </div>

    <div class="spotlight-draw-help__setting">
      <label>Color</label>
      <div class="button-group color-group" id="dialog-default-color">
        <button type="button" class="button-group-item color-button" data-value="" data-color="orange" aria-label="Orange"></button>
        <button type="button" class="button-group-item color-button" data-value="spotlight-draw-rectangle--green" data-color="green" aria-label="Green"></button>
        <button type="button" class="button-group-item color-button" data-value="spotlight-draw-rectangle--blue" data-color="blue" aria-label="Blue"></button>
        <button type="button" class="button-group-item color-button" data-value="spotlight-draw-rectangle--purple" data-color="purple" aria-label="Purple"></button>
        <button type="button" class="button-group-item color-button" data-value="spotlight-draw-rectangle--plain" data-color="plain" aria-label="Gray"></button>
      </div>
    </div>

    <div class="spotlight-draw-help__setting">
      <label class="checkbox-label">
        <input type="checkbox" id="dialog-snap-to-edges">
        <span>Snap to Edges</span>
      </label>
    </div>
  `;
  content.appendChild(settingsSection);

  // SHORTCUTS SECTION (appears second)
  var shortcutsSection = document.createElement("section");
  shortcutsSection.className = "spotlight-draw-help__shortcuts";
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
    helpButton.classList.add("spotlight-draw-help__trigger--visible");
    helpButton.classList.remove("spotlight-draw-help__trigger--hidden");
  }
}

// Hide help button with slide-out animation
function hideHelpButton() {
  if (helpButton) {
    helpButton.classList.add("spotlight-draw-help__trigger--hidden");
    helpButton.classList.remove("spotlight-draw-help__trigger--visible");
    // Hide completely after animation completes
    setTimeout(function() {
      if (helpButton && helpButton.classList.contains("spotlight-draw-help__trigger--hidden")) {
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
  var closeButton = helpDialog.querySelector(".spotlight-draw-help__close");
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

  // Fetch and display actual configured shortcut
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: "GET_SHORTCUT" }, function(response) {
      if (response && response.shortcut) {
        updateToggleShortcutDisplay(helpDialog, response.shortcut);
      }
    });
  }
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

// Get even spacing targets for a moving rectangle
function getEvenSpacingTargets(rect, excludeRect) {
  var result = {
    horizontal: [],
    vertical: []
  };

  // Get bounds of the moving rectangle
  var rectBounds = getRectBounds(rect);
  var rectWidth = rectBounds.width;
  var rectHeight = rectBounds.height;

  // Collect all rectangles except the one being moved
  var otherRects = [];
  for (var i = 0; i < placedRectangles.length; i++) {
    if (placedRectangles[i] !== excludeRect) {
      otherRects.push(getRectBounds(placedRectangles[i]));
    }
  }

  // Check horizontal spacing (sort by left edge)
  var sortedByX = otherRects.slice().sort(function(a, b) {
    return a.left - b.left;
  });

  for (var i = 0; i < sortedByX.length - 1; i++) {
    var rectA = sortedByX[i];
    var rectB = sortedByX[i + 1];
    var aRight = rectA.left + rectA.width;
    var bLeft = rectB.left;

    // Check if there's an actual gap between A and B
    if (bLeft > aRight) {
      var existingGap = bLeft - aRight;

      // Case 1: Position rect BETWEEN A and B with even spacing
      if (existingGap > rectWidth) {
        var gap = (existingGap - rectWidth) / 2;
        var evenPosition = aRight + gap;

        result.horizontal.push({
          position: evenPosition,
          gap: gap,
          between: [rectA, rectB],
          gapStart: aRight,
          gapEnd: bLeft
        });
      }

      // Case 2: Position rect to the LEFT of A to match the A-B gap
      // Pattern: [rect] gap [A] gap [B] where both gaps are equal
      var leftPosition = rectA.left - existingGap - rectWidth;
      result.horizontal.push({
        position: leftPosition,
        gap: existingGap,
        between: null, // Not between, but to the left
        referenceRects: [rectA, rectB],
        gapStart: leftPosition + rectWidth,
        gapEnd: rectA.left
      });

      // Case 3: Position rect to the RIGHT of B to match the A-B gap
      // Pattern: [A] gap [B] gap [rect] where both gaps are equal
      var rightPosition = rectB.left + rectB.width + existingGap;
      result.horizontal.push({
        position: rightPosition,
        gap: existingGap,
        between: null, // Not between, but to the right
        referenceRects: [rectA, rectB],
        gapStart: rectB.left + rectB.width,
        gapEnd: rightPosition
      });
    }
  }

  // Check vertical spacing (sort by top edge)
  var sortedByY = otherRects.slice().sort(function(a, b) {
    return a.top - b.top;
  });

  for (var j = 0; j < sortedByY.length - 1; j++) {
    var rectA = sortedByY[j];
    var rectB = sortedByY[j + 1];
    var aBottom = rectA.top + rectA.height;
    var bTop = rectB.top;

    // Check if there's an actual gap between A and B
    if (bTop > aBottom) {
      var existingGap = bTop - aBottom;

      // Case 1: Position rect BETWEEN A and B with even spacing
      if (existingGap > rectHeight) {
        var gap = (existingGap - rectHeight) / 2;
        var evenPosition = aBottom + gap;

        result.vertical.push({
          position: evenPosition,
          gap: gap,
          between: [rectA, rectB],
          gapStart: aBottom,
          gapEnd: bTop
        });
      }

      // Case 2: Position rect ABOVE A to match the A-B gap
      // Pattern: [rect] gap [A] gap [B] where both gaps are equal
      var topPosition = rectA.top - existingGap - rectHeight;
      result.vertical.push({
        position: topPosition,
        gap: existingGap,
        between: null, // Not between, but above
        referenceRects: [rectA, rectB],
        gapStart: topPosition + rectHeight,
        gapEnd: rectA.top
      });

      // Case 3: Position rect BELOW B to match the A-B gap
      // Pattern: [A] gap [B] gap [rect] where both gaps are equal
      var bottomPosition = rectB.top + rectB.height + existingGap;
      result.vertical.push({
        position: bottomPosition,
        gap: existingGap,
        between: null, // Not between, but below
        referenceRects: [rectA, rectB],
        gapStart: rectB.top + rectB.height,
        gapEnd: bottomPosition
      });
    }
  }

  return result;
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
  var xEdgeSnapped = (bestLeftSnap !== null || bestRightSnap !== null);
  if (!xEdgeSnapped) {
    var centerXSnap = findClosestEdge(centerX, targets.centerX);
    if (centerXSnap !== null) {
      snappedX = x + (centerXSnap - centerX);
      verticalSnapPositions.push(centerXSnap);
      xEdgeSnapped = true; // center counts as alignment
    }
  }

  // Width dimension matching — only if no edge/center X snapped
  if (!xEdgeSnapped) {
    var bestWidthDiff = SNAP_THRESHOLD + 1;
    var bestWidthMatch = null;
    for (var i = 0; i < placedRectangles.length; i++) {
      var b = getRectBounds(placedRectangles[i]);
      var diff = Math.abs(snappedWidth - b.width);
      if (diff <= SNAP_THRESHOLD && diff < bestWidthDiff) {
        bestWidthDiff = diff;
        bestWidthMatch = b.width;
      }
    }
    if (bestWidthMatch !== null) {
      snappedWidth = bestWidthMatch;
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
  var yEdgeSnapped = (bestTopSnap !== null || bestBottomSnap !== null);
  if (!yEdgeSnapped) {
    var centerYSnap = findClosestEdge(centerY, targets.centerY);
    if (centerYSnap !== null) {
      snappedY = y + (centerYSnap - centerY);
      horizontalSnapPositions.push(centerYSnap);
      yEdgeSnapped = true; // center counts as alignment
    }
  }

  // Height dimension matching — only if no edge/center Y snapped
  if (!yEdgeSnapped) {
    var bestHeightDiff = SNAP_THRESHOLD + 1;
    var bestHeightMatch = null;
    for (var i = 0; i < placedRectangles.length; i++) {
      var b = getRectBounds(placedRectangles[i]);
      var diff = Math.abs(snappedHeight - b.height);
      if (diff <= SNAP_THRESHOLD && diff < bestHeightDiff) {
        bestHeightDiff = diff;
        bestHeightMatch = b.height;
      }
    }
    if (bestHeightMatch !== null) {
      snappedHeight = bestHeightMatch;
    }
  }

  // --- Dimension matching guides (always, after all snapping) ---
  var spacingGuides = [];
  for (var i = 0; i < placedRectangles.length; i++) {
    var b = getRectBounds(placedRectangles[i]);
    if (Math.abs(snappedWidth - b.width) <= 1) {
      spacingGuides.push({
        axis: 'horizontal',
        gapStart: b.left,
        gapEnd: b.left + b.width,
        between: [b, b],
        referenceRects: [b, b]
      });
    }
    if (Math.abs(snappedHeight - b.height) <= 1) {
      spacingGuides.push({
        axis: 'vertical',
        gapStart: b.top,
        gapEnd: b.top + b.height,
        between: [b, b],
        referenceRects: [b, b]
      });
    }
  }

  return {
    x: snappedX,
    y: snappedY,
    width: snappedWidth,
    height: snappedHeight,
    verticalSnapPositions: verticalSnapPositions,
    horizontalSnapPositions: horizontalSnapPositions,
    spacingGuides: spacingGuides
  };
}

/**
 * Find all gaps of a given size between rectangles.
 * @param {number} targetGapSize - The gap size to match (px)
 * @param {string} axis - 'horizontal' or 'vertical'
 * @param {HTMLElement} excludeRect - Rectangle being moved (to exclude from search)
 * @param {Object} movedRectBounds - Bounds of the moved rectangle {left, top, width, height}
 * @param {number} tolerance - Tolerance for gap matching (default 1px)
 * @returns {Array} Array of gap objects with referenceRects, gapStart, gapEnd, gap
 */
function findAllGapsOfSize(targetGapSize, axis, excludeRect, movedRectBounds, tolerance) {
  tolerance = tolerance || 1;
  var gaps = [];

  // Collect all rectangles (including the moved rectangle's new position)
  var allRects = [];

  // Add existing placed rectangles (except the one being moved)
  for (var i = 0; i < placedRectangles.length; i++) {
    if (placedRectangles[i] !== excludeRect) {
      allRects.push({
        bounds: getRectBounds(placedRectangles[i]),
        element: placedRectangles[i]
      });
    }
  }

  // Add the moved rectangle at its new position
  allRects.push({
    bounds: movedRectBounds,
    element: null // This is the moving rectangle
  });

  if (axis === 'horizontal') {
    // Sort by left edge
    allRects.sort(function(a, b) {
      return a.bounds.left - b.bounds.left;
    });

    // Check gaps between adjacent rectangles
    for (var i = 0; i < allRects.length - 1; i++) {
      var rectA = allRects[i];
      var rectB = allRects[i + 1];
      var aRight = rectA.bounds.left + rectA.bounds.width;
      var bLeft = rectB.bounds.left;

      if (bLeft > aRight) {
        var gapSize = bLeft - aRight;
        if (Math.abs(gapSize - targetGapSize) < tolerance) {
          gaps.push({
            referenceRects: [rectA.bounds, rectB.bounds],
            gapStart: aRight,
            gapEnd: bLeft,
            gap: gapSize,
            between: [rectA.bounds, rectB.bounds]
          });
        }
      }
    }
  } else if (axis === 'vertical') {
    // Sort by top edge
    allRects.sort(function(a, b) {
      return a.bounds.top - b.bounds.top;
    });

    // Check gaps between adjacent rectangles
    for (var i = 0; i < allRects.length - 1; i++) {
      var rectA = allRects[i];
      var rectB = allRects[i + 1];
      var aBottom = rectA.bounds.top + rectA.bounds.height;
      var bTop = rectB.bounds.top;

      if (bTop > aBottom) {
        var gapSize = bTop - aBottom;
        if (Math.abs(gapSize - targetGapSize) < tolerance) {
          gaps.push({
            referenceRects: [rectA.bounds, rectB.bounds],
            gapStart: aBottom,
            gapEnd: bTop,
            gap: gapSize,
            between: [rectA.bounds, rectB.bounds]
          });
        }
      }
    }
  }

  return gaps;
}

// Collect all gaps between adjacent rectangle pairs (excluding a given rect)
function collectExistingGaps(axis, excludeRect) {
  var rects = [];
  for (var i = 0; i < placedRectangles.length; i++) {
    if (placedRectangles[i] !== excludeRect) {
      rects.push(getRectBounds(placedRectangles[i]));
    }
  }
  var gaps = [];
  if (axis === 'horizontal') {
    rects.sort(function(a, b) { return a.left - b.left; });
    for (var i = 0; i < rects.length - 1; i++) {
      var aRight = rects[i].left + rects[i].width;
      var bLeft = rects[i + 1].left;
      if (bLeft > aRight) {
        gaps.push({ gapSize: bLeft - aRight, gapStart: aRight, gapEnd: bLeft, rectA: rects[i], rectB: rects[i + 1] });
      }
    }
  } else {
    rects.sort(function(a, b) { return a.top - b.top; });
    for (var i = 0; i < rects.length - 1; i++) {
      var aBottom = rects[i].top + rects[i].height;
      var bTop = rects[i + 1].top;
      if (bTop > aBottom) {
        gaps.push({ gapSize: bTop - aBottom, gapStart: aBottom, gapEnd: bTop, rectA: rects[i], rectB: rects[i + 1] });
      }
    }
  }
  return gaps;
}

// Apply snapping for resize (only snap moved edges based on resizeHandle)
function applyResizeSnapping(x, y, width, height, excludeRect) {
  var targets = getSnapTargets(excludeRect);
  var snappedX = x;
  var snappedY = y;
  var snappedWidth = width;
  var snappedHeight = height;
  var verticalSnapPositions = [];
  var horizontalSnapPositions = [];
  var spacingGuides = [];

  var movesLeft = resizeHandle === "w" || resizeHandle === "nw" || resizeHandle === "sw";
  var movesRight = resizeHandle === "e" || resizeHandle === "ne" || resizeHandle === "se";
  var movesTop = resizeHandle === "n" || resizeHandle === "nw" || resizeHandle === "ne";
  var movesBottom = resizeHandle === "s" || resizeHandle === "sw" || resizeHandle === "se";

  var left = x;
  var right = x + width;
  var top = y;
  var bottom = y + height;

  // --- Horizontal edge alignment (only snap moved edges) ---
  var xEdgeSnapped = false;

  if (movesLeft) {
    var bestSnap = pickCloserSnap(left,
      findClosestEdge(left, targets.left),
      findClosestEdge(left, targets.right));
    if (bestSnap !== null) {
      snappedX = bestSnap;
      snappedWidth = right - bestSnap;
      verticalSnapPositions.push(bestSnap);
      xEdgeSnapped = true;
    }
  }

  if (movesRight) {
    var bestSnap = pickCloserSnap(right,
      findClosestEdge(right, targets.right),
      findClosestEdge(right, targets.left));
    if (bestSnap !== null) {
      snappedWidth = bestSnap - snappedX;
      verticalSnapPositions.push(bestSnap);
      xEdgeSnapped = true;
    }
  }

  // --- Horizontal dimension snapping (fallback when no edge alignment) ---
  if (!xEdgeSnapped && (movesLeft || movesRight)) {
    var bestDimDist = Infinity;
    var bestMatchWidth = null;
    for (var i = 0; i < placedRectangles.length; i++) {
      if (placedRectangles[i] === excludeRect) continue;
      var b = getRectBounds(placedRectangles[i]);
      var diff = Math.abs(snappedWidth - b.width);
      if (diff <= SNAP_THRESHOLD && diff < bestDimDist) {
        bestDimDist = diff;
        bestMatchWidth = b.width;
      }
    }
    if (bestMatchWidth !== null) {
      if (movesRight) {
        snappedWidth = bestMatchWidth;
      } else {
        var fixedRight = snappedX + snappedWidth;
        snappedWidth = bestMatchWidth;
        snappedX = fixedRight - snappedWidth;
      }
      xEdgeSnapped = true;
    }
  }

  // --- Horizontal gap snapping (fallback when no edge/dimension alignment) ---
  if (!xEdgeSnapped && (movesLeft || movesRight)) {
    var existingHGaps = collectExistingGaps('horizontal', excludeRect);
    if (existingHGaps.length > 0) {
      var bestDist = Infinity;
      var bestSnapResult = null;

      if (movesRight) {
        var currentRight = snappedX + snappedWidth;
        var nearestRightLeft = Infinity;
        var nearestRightRect = null;
        for (var i = 0; i < placedRectangles.length; i++) {
          if (placedRectangles[i] === excludeRect) continue;
          var b = getRectBounds(placedRectangles[i]);
          if (b.left >= currentRight - SNAP_THRESHOLD && b.left < nearestRightLeft) {
            nearestRightLeft = b.left;
            nearestRightRect = b;
          }
        }
        if (nearestRightRect) {
          var currentGap = nearestRightRect.left - currentRight;
          for (var j = 0; j < existingHGaps.length; j++) {
            var diff = Math.abs(currentGap - existingHGaps[j].gapSize);
            if (diff <= SNAP_THRESHOLD && diff < bestDist) {
              bestDist = diff;
              bestSnapResult = { edge: 'right', target: nearestRightRect.left - existingHGaps[j].gapSize };
            }
          }
        }
      }

      if (movesLeft && !bestSnapResult) {
        var currentLeft = snappedX;
        var nearestLeftRight = -Infinity;
        var nearestLeftRect = null;
        for (var i = 0; i < placedRectangles.length; i++) {
          if (placedRectangles[i] === excludeRect) continue;
          var b = getRectBounds(placedRectangles[i]);
          var bRight = b.left + b.width;
          if (bRight <= currentLeft + SNAP_THRESHOLD && bRight > nearestLeftRight) {
            nearestLeftRight = bRight;
            nearestLeftRect = b;
          }
        }
        if (nearestLeftRect) {
          var nRight = nearestLeftRect.left + nearestLeftRect.width;
          var currentGap = currentLeft - nRight;
          for (var j = 0; j < existingHGaps.length; j++) {
            var diff = Math.abs(currentGap - existingHGaps[j].gapSize);
            if (diff <= SNAP_THRESHOLD && diff < bestDist) {
              bestDist = diff;
              bestSnapResult = { edge: 'left', target: nRight + existingHGaps[j].gapSize };
            }
          }
        }
      }

      if (bestSnapResult) {
        if (bestSnapResult.edge === 'right') {
          snappedWidth = bestSnapResult.target - snappedX;
        } else {
          var fixedRight = snappedX + snappedWidth;
          snappedX = bestSnapResult.target;
          snappedWidth = fixedRight - snappedX;
        }
      }
    }
  }

  // --- Vertical edge alignment (only snap moved edges) ---
  var yEdgeSnapped = false;

  if (movesTop) {
    var bestSnap = pickCloserSnap(top,
      findClosestEdge(top, targets.top),
      findClosestEdge(top, targets.bottom));
    if (bestSnap !== null) {
      snappedY = bestSnap;
      snappedHeight = bottom - bestSnap;
      horizontalSnapPositions.push(bestSnap);
      yEdgeSnapped = true;
    }
  }

  if (movesBottom) {
    var bestSnap = pickCloserSnap(bottom,
      findClosestEdge(bottom, targets.bottom),
      findClosestEdge(bottom, targets.top));
    if (bestSnap !== null) {
      snappedHeight = bestSnap - snappedY;
      horizontalSnapPositions.push(bestSnap);
      yEdgeSnapped = true;
    }
  }

  // --- Vertical dimension snapping (fallback when no edge alignment) ---
  if (!yEdgeSnapped && (movesTop || movesBottom)) {
    var bestDimDist = Infinity;
    var bestMatchHeight = null;
    for (var i = 0; i < placedRectangles.length; i++) {
      if (placedRectangles[i] === excludeRect) continue;
      var b = getRectBounds(placedRectangles[i]);
      var diff = Math.abs(snappedHeight - b.height);
      if (diff <= SNAP_THRESHOLD && diff < bestDimDist) {
        bestDimDist = diff;
        bestMatchHeight = b.height;
      }
    }
    if (bestMatchHeight !== null) {
      if (movesBottom) {
        snappedHeight = bestMatchHeight;
      } else {
        var fixedBottom = snappedY + snappedHeight;
        snappedHeight = bestMatchHeight;
        snappedY = fixedBottom - snappedHeight;
      }
      yEdgeSnapped = true;
    }
  }

  // --- Vertical gap snapping (fallback when no edge/dimension alignment) ---
  if (!yEdgeSnapped && (movesTop || movesBottom)) {
    var existingVGaps = collectExistingGaps('vertical', excludeRect);
    if (existingVGaps.length > 0) {
      var bestDist = Infinity;
      var bestSnapResult = null;

      if (movesBottom) {
        var currentBottom = snappedY + snappedHeight;
        var nearestBelowTop = Infinity;
        var nearestBelowRect = null;
        for (var i = 0; i < placedRectangles.length; i++) {
          if (placedRectangles[i] === excludeRect) continue;
          var b = getRectBounds(placedRectangles[i]);
          if (b.top >= currentBottom - SNAP_THRESHOLD && b.top < nearestBelowTop) {
            nearestBelowTop = b.top;
            nearestBelowRect = b;
          }
        }
        if (nearestBelowRect) {
          var currentGap = nearestBelowRect.top - currentBottom;
          for (var j = 0; j < existingVGaps.length; j++) {
            var diff = Math.abs(currentGap - existingVGaps[j].gapSize);
            if (diff <= SNAP_THRESHOLD && diff < bestDist) {
              bestDist = diff;
              bestSnapResult = { edge: 'bottom', target: nearestBelowRect.top - existingVGaps[j].gapSize };
            }
          }
        }
      }

      if (movesTop && !bestSnapResult) {
        var currentTop = snappedY;
        var nearestAboveBottom = -Infinity;
        var nearestAboveRect = null;
        for (var i = 0; i < placedRectangles.length; i++) {
          if (placedRectangles[i] === excludeRect) continue;
          var b = getRectBounds(placedRectangles[i]);
          var bBottom = b.top + b.height;
          if (bBottom <= currentTop + SNAP_THRESHOLD && bBottom > nearestAboveBottom) {
            nearestAboveBottom = bBottom;
            nearestAboveRect = b;
          }
        }
        if (nearestAboveRect) {
          var nBottom = nearestAboveRect.top + nearestAboveRect.height;
          var currentGap = currentTop - nBottom;
          for (var j = 0; j < existingVGaps.length; j++) {
            var diff = Math.abs(currentGap - existingVGaps[j].gapSize);
            if (diff <= SNAP_THRESHOLD && diff < bestDist) {
              bestDist = diff;
              bestSnapResult = { edge: 'top', target: nBottom + existingVGaps[j].gapSize };
            }
          }
        }
      }

      if (bestSnapResult) {
        if (bestSnapResult.edge === 'bottom') {
          snappedHeight = bestSnapResult.target - snappedY;
        } else {
          var fixedBottom = snappedY + snappedHeight;
          snappedY = bestSnapResult.target;
          snappedHeight = fixedBottom - snappedY;
        }
      }
    }
  }

  // --- Gap guide display (always, after all snapping) ---
  var finalBounds = { left: snappedX, top: snappedY, width: snappedWidth, height: snappedHeight };

  if (movesRight || movesLeft) {
    var allHRects = [{ bounds: finalBounds, isResized: true }];
    for (var i = 0; i < placedRectangles.length; i++) {
      if (placedRectangles[i] !== excludeRect) {
        allHRects.push({ bounds: getRectBounds(placedRectangles[i]), isResized: false });
      }
    }
    allHRects.sort(function(a, b) { return a.bounds.left - b.bounds.left; });
    var ourIdx = -1;
    for (var i = 0; i < allHRects.length; i++) {
      if (allHRects[i].isResized) { ourIdx = i; break; }
    }

    var hGapSizes = [];
    if (movesRight && ourIdx < allHRects.length - 1) {
      var ourRight = finalBounds.left + finalBounds.width;
      var nextLeft = allHRects[ourIdx + 1].bounds.left;
      if (nextLeft > ourRight) hGapSizes.push(nextLeft - ourRight);
    }
    if (movesLeft && ourIdx > 0) {
      var prevRight = allHRects[ourIdx - 1].bounds.left + allHRects[ourIdx - 1].bounds.width;
      if (finalBounds.left > prevRight) hGapSizes.push(finalBounds.left - prevRight);
    }

    for (var g = 0; g < hGapSizes.length; g++) {
      var allGaps = findAllGapsOfSize(hGapSizes[g], 'horizontal', excludeRect, finalBounds, 1);
      if (allGaps.length >= 2) {
        for (var j = 0; j < allGaps.length; j++) {
          spacingGuides.push({
            axis: 'horizontal',
            position: (allGaps[j].gapStart + allGaps[j].gapEnd) / 2,
            gapStart: allGaps[j].gapStart,
            gapEnd: allGaps[j].gapEnd,
            gap: allGaps[j].gap,
            between: allGaps[j].between,
            referenceRects: allGaps[j].referenceRects
          });
        }
      }
    }
  }

  if (movesTop || movesBottom) {
    var allVRects = [{ bounds: finalBounds, isResized: true }];
    for (var i = 0; i < placedRectangles.length; i++) {
      if (placedRectangles[i] !== excludeRect) {
        allVRects.push({ bounds: getRectBounds(placedRectangles[i]), isResized: false });
      }
    }
    allVRects.sort(function(a, b) { return a.bounds.top - b.bounds.top; });
    var ourIdx = -1;
    for (var i = 0; i < allVRects.length; i++) {
      if (allVRects[i].isResized) { ourIdx = i; break; }
    }

    var vGapSizes = [];
    if (movesBottom && ourIdx < allVRects.length - 1) {
      var ourBottom = finalBounds.top + finalBounds.height;
      var nextTop = allVRects[ourIdx + 1].bounds.top;
      if (nextTop > ourBottom) vGapSizes.push(nextTop - ourBottom);
    }
    if (movesTop && ourIdx > 0) {
      var prevBottom = allVRects[ourIdx - 1].bounds.top + allVRects[ourIdx - 1].bounds.height;
      if (finalBounds.top > prevBottom) vGapSizes.push(finalBounds.top - prevBottom);
    }

    for (var g = 0; g < vGapSizes.length; g++) {
      var allGaps = findAllGapsOfSize(vGapSizes[g], 'vertical', excludeRect, finalBounds, 1);
      if (allGaps.length >= 2) {
        for (var j = 0; j < allGaps.length; j++) {
          spacingGuides.push({
            axis: 'vertical',
            position: (allGaps[j].gapStart + allGaps[j].gapEnd) / 2,
            gapStart: allGaps[j].gapStart,
            gapEnd: allGaps[j].gapEnd,
            gap: allGaps[j].gap,
            between: allGaps[j].between,
            referenceRects: allGaps[j].referenceRects
          });
        }
      }
    }
  }

  // --- Dimension matching guides (always, after all snapping) ---
  for (var i = 0; i < placedRectangles.length; i++) {
    if (placedRectangles[i] === excludeRect) continue;
    var b = getRectBounds(placedRectangles[i]);

    if ((movesLeft || movesRight) && Math.abs(snappedWidth - b.width) <= 1) {
      spacingGuides.push({
        axis: 'horizontal',
        gapStart: b.left,
        gapEnd: b.left + b.width,
        between: [b, b],
        referenceRects: [b, b]
      });
    }

    if ((movesTop || movesBottom) && Math.abs(snappedHeight - b.height) <= 1) {
      spacingGuides.push({
        axis: 'vertical',
        gapStart: b.top,
        gapEnd: b.top + b.height,
        between: [b, b],
        referenceRects: [b, b]
      });
    }
  }

  return {
    x: snappedX,
    y: snappedY,
    width: snappedWidth,
    height: snappedHeight,
    verticalSnapPositions: verticalSnapPositions,
    horizontalSnapPositions: horizontalSnapPositions,
    spacingGuides: spacingGuides
  };
}

// Apply snapping for moving rectangles (repositioning/duplicating - only adjusts position, keeps size fixed)
function applyPositionSnapping(x, y, width, height, excludeRect) {
  var targets = getSnapTargets(excludeRect);
  var snappedX = x;
  var snappedY = y;
  var verticalSnapPositions = [];
  var horizontalSnapPositions = [];
  var spacingGuides = [];

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

  var xSnapped = false;

  if (leftSnapDist <= rightSnapDist && bestLeftSnap !== null) {
    snappedX = bestLeftSnap;
    verticalSnapPositions.push(bestLeftSnap);
    xSnapped = true;
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
    xSnapped = true;
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
      xSnapped = true;
    }
  }

  // Check even spacing for SNAPPING only if no edge/center snap occurred
  if (!xSnapped) {
    var tempRect = { style: { left: x + "px", top: y + "px", width: width + "px", height: height + "px" } };
    var spacingTargets = getEvenSpacingTargets(tempRect, excludeRect);

    // Find closest spacing target
    var closestHorizontalTarget = null;
    var closestHorizontalDist = Infinity;

    for (var i = 0; i < spacingTargets.horizontal.length; i++) {
      var target = spacingTargets.horizontal[i];
      var dist = Math.abs(left - target.position);
      if (dist <= SNAP_THRESHOLD && dist < closestHorizontalDist) {
        closestHorizontalDist = dist;
        closestHorizontalTarget = target;
      }
    }

    // If we found a match, snap to it
    if (closestHorizontalTarget) {
      snappedX = closestHorizontalTarget.position;
    }
  }

  // Always check for spacing GUIDES (even if we snapped to edge/center)
  // This ensures guides appear whenever equal spacing exists, regardless of snap type
  var tempRectForGuides = { style: { left: snappedX + "px", top: y + "px", width: width + "px", height: height + "px" } };
  var spacingTargetsForGuides = getEvenSpacingTargets(tempRectForGuides, excludeRect);

  // Check if current position matches any horizontal spacing pattern
  var closestHorizontalSpacingGuide = null;
  var closestHorizontalSpacingDist = Infinity;

  for (var i = 0; i < spacingTargetsForGuides.horizontal.length; i++) {
    var target = spacingTargetsForGuides.horizontal[i];
    var dist = Math.abs(snappedX - target.position);
    if (dist <= SNAP_THRESHOLD && dist < closestHorizontalSpacingDist) {
      closestHorizontalSpacingDist = dist;
      closestHorizontalSpacingGuide = target;
    }
  }

  // Show guides for all matching gaps
  if (closestHorizontalSpacingGuide) {
    var snapGapSize = closestHorizontalSpacingGuide.gap;

    // Find ALL gaps of this size (including gaps between other rectangles)
    var movedRectBounds = {
      left: snappedX,
      top: y,
      width: width,
      height: height
    };
    var allMatchingGaps = findAllGapsOfSize(snapGapSize, 'horizontal', excludeRect, movedRectBounds, 1);

    // Add guides for all matching gaps
    for (var i = 0; i < allMatchingGaps.length; i++) {
      var gap = allMatchingGaps[i];
      spacingGuides.push({
        axis: 'horizontal',
        position: (gap.gapStart + gap.gapEnd) / 2, // Midpoint of gap
        gapStart: gap.gapStart,
        gapEnd: gap.gapEnd,
        gap: gap.gap,
        between: gap.between,
        referenceRects: gap.referenceRects
      });
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

  var ySnapped = false;

  if (topSnapDist <= bottomSnapDist && bestTopSnap !== null) {
    snappedY = bestTopSnap;
    horizontalSnapPositions.push(bestTopSnap);
    ySnapped = true;
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
    ySnapped = true;
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
      ySnapped = true;
    }
  }

  // Check even spacing for SNAPPING only if no edge/center snap occurred
  if (!ySnapped) {
    var tempRect = { style: { left: x + "px", top: y + "px", width: width + "px", height: height + "px" } };
    var spacingTargets = getEvenSpacingTargets(tempRect, excludeRect);

    // Find closest spacing target
    var closestVerticalTarget = null;
    var closestVerticalDist = Infinity;

    for (var j = 0; j < spacingTargets.vertical.length; j++) {
      var target = spacingTargets.vertical[j];
      var dist = Math.abs(top - target.position);
      if (dist <= SNAP_THRESHOLD && dist < closestVerticalDist) {
        closestVerticalDist = dist;
        closestVerticalTarget = target;
      }
    }

    // If we found a match, snap to it
    if (closestVerticalTarget) {
      snappedY = closestVerticalTarget.position;
    }
  }

  // Always check for spacing GUIDES (even if we snapped to edge/center)
  // This ensures guides appear whenever equal spacing exists, regardless of snap type
  var tempRectForVerticalGuides = { style: { left: snappedX + "px", top: snappedY + "px", width: width + "px", height: height + "px" } };
  var spacingTargetsForVerticalGuides = getEvenSpacingTargets(tempRectForVerticalGuides, excludeRect);

  // Check if current position matches any vertical spacing pattern
  var closestVerticalSpacingGuide = null;
  var closestVerticalSpacingDist = Infinity;

  for (var j = 0; j < spacingTargetsForVerticalGuides.vertical.length; j++) {
    var target = spacingTargetsForVerticalGuides.vertical[j];
    var dist = Math.abs(snappedY - target.position);
    if (dist <= SNAP_THRESHOLD && dist < closestVerticalSpacingDist) {
      closestVerticalSpacingDist = dist;
      closestVerticalSpacingGuide = target;
    }
  }

  // Show guides for all matching gaps
  if (closestVerticalSpacingGuide) {
    var snapGapSize = closestVerticalSpacingGuide.gap;

    // Find ALL gaps of this size (including gaps between other rectangles)
    var movedRectBounds = {
      left: snappedX,
      top: snappedY,
      width: width,
      height: height
    };
    var allMatchingGaps = findAllGapsOfSize(snapGapSize, 'vertical', excludeRect, movedRectBounds, 1);

    // Add guides for all matching gaps
    for (var j = 0; j < allMatchingGaps.length; j++) {
      var gap = allMatchingGaps[j];
      spacingGuides.push({
        axis: 'vertical',
        position: (gap.gapStart + gap.gapEnd) / 2, // Midpoint of gap
        gapStart: gap.gapStart,
        gapEnd: gap.gapEnd,
        gap: gap.gap,
        between: gap.between,
        referenceRects: gap.referenceRects
      });
    }
  }

  return {
    x: snappedX,
    y: snappedY,
    width: width,
    height: height,
    verticalSnapPositions: verticalSnapPositions,
    horizontalSnapPositions: horizontalSnapPositions,
    spacingGuides: spacingGuides
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

  // Remove spacing guide lines
  for (var i = 0; i < spacingGuideElements.length; i++) {
    if (spacingGuideElements[i] && spacingGuideElements[i].parentNode) {
      spacingGuideElements[i].parentNode.removeChild(spacingGuideElements[i]);
    }
  }
  spacingGuideElements = [];
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

// Show spacing guide lines
function showSpacingGuides(guides) {
  // Remove all existing spacing guide elements
  for (var i = 0; i < spacingGuideElements.length; i++) {
    if (spacingGuideElements[i] && spacingGuideElements[i].parentNode) {
      spacingGuideElements[i].parentNode.removeChild(spacingGuideElements[i]);
    }
  }
  spacingGuideElements = [];

  // Create a new guide element for each guide in the array
  for (var i = 0; i < guides.length; i++) {
    var guide = guides[i];
    var guideElement = document.createElement("div");
    guideElement.style.position = "fixed";
    guideElement.style.pointerEvents = "none";
    guideElement.style.zIndex = Z_INDEX_GUIDE;

    if (guide.axis === 'horizontal') {
      // Horizontal spacing = horizontal line spanning the gap
      // Position at midpoint vertically (use reference rectangles to determine Y position)
      var rectsForExtent = guide.between || guide.referenceRects;
      var topExtent = Math.min(rectsForExtent[0].top, rectsForExtent[1].top);
      var bottomExtent = Math.max(
        rectsForExtent[0].top + rectsForExtent[0].height,
        rectsForExtent[1].top + rectsForExtent[1].height
      );
      var midY = (topExtent + bottomExtent) / 2;

      guideElement.style.height = "0";
      guideElement.style.borderTop = "1px solid GrayText";
      guideElement.style.top = midY + "px";
      guideElement.style.left = guide.gapStart + "px";
      guideElement.style.width = (guide.gapEnd - guide.gapStart) + "px";
    } else if (guide.axis === 'vertical') {
      // Vertical spacing = vertical line spanning the gap
      // Position at midpoint horizontally (use reference rectangles to determine X position)
      var rectsForExtent = guide.between || guide.referenceRects;
      var leftExtent = Math.min(rectsForExtent[0].left, rectsForExtent[1].left);
      var rightExtent = Math.max(
        rectsForExtent[0].left + rectsForExtent[0].width,
        rectsForExtent[1].left + rectsForExtent[1].width
      );
      var midX = (leftExtent + rightExtent) / 2;

      guideElement.style.width = "0";
      guideElement.style.borderLeft = "1px solid GrayText";
      guideElement.style.left = midX + "px";
      guideElement.style.top = guide.gapStart + "px";
      guideElement.style.height = (guide.gapEnd - guide.gapStart) + "px";
    }

    document.body.appendChild(guideElement);
    spacingGuideElements.push(guideElement);
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

  // Remove all spacing guide elements
  for (var i = 0; i < spacingGuideElements.length; i++) {
    if (spacingGuideElements[i] && spacingGuideElements[i].parentNode) {
      spacingGuideElements[i].parentNode.removeChild(spacingGuideElements[i]);
    }
  }
  spacingGuideElements = [];
}

// Snap, clamp to viewport, and show/hide guide lines in one step
function applySnapClampAndGuides(x, y, width, height, excludeRect, snapFn) {
  var snapped;
  if (userPreferences.snapToEdges) {
    snapped = snapFn(x, y, width, height, excludeRect);
  } else {
    snapped = { x: x, y: y, width: width, height: height, verticalSnapPositions: [], horizontalSnapPositions: [], spacingGuides: [] };
  }

  var clamped = clampToViewport(snapped.x, snapped.y, snapped.width, snapped.height);

  if (userPreferences.snapToEdges) {
    showVerticalGuides(snapped.verticalSnapPositions);
    showHorizontalGuides(snapped.horizontalSnapPositions);
    // Show spacing guides if present
    if (snapped.spacingGuides && snapped.spacingGuides.length > 0) {
      showSpacingGuides(snapped.spacingGuides);
    } else {
      // Remove spacing guides if no spacing snap
      for (var i = 0; i < spacingGuideElements.length; i++) {
        if (spacingGuideElements[i] && spacingGuideElements[i].parentNode) {
          spacingGuideElements[i].parentNode.removeChild(spacingGuideElements[i]);
        }
      }
      spacingGuideElements = [];
    }
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

  // Apply Shift constraint for square drawing
  if (isShiftHeld) {
    var deltaX = effectiveCurrentX - startX;
    var deltaY = effectiveCurrentY - startY;
    var maxDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    effectiveCurrentX = startX + maxDelta * (deltaX >= 0 ? 1 : -1);
    effectiveCurrentY = startY + maxDelta * (deltaY >= 0 ? 1 : -1);
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

// Find resize handle (edge/corner) at mouse position
function getResizeHandle(x, y) {
  for (var i = placedRectangles.length - 1; i >= 0; i--) {
    var rect = placedRectangles[i];
    var b = getRectBounds(rect);
    var sz = RESIZE_HANDLE_SIZE;

    var nearLeft = Math.abs(x - b.left) <= sz;
    var nearRight = Math.abs(x - (b.left + b.width)) <= sz;
    var nearTop = Math.abs(y - b.top) <= sz;
    var nearBottom = Math.abs(y - (b.top + b.height)) <= sz;

    var inHorizontalRange = x >= b.left - sz && x <= b.left + b.width + sz;
    var inVerticalRange = y >= b.top - sz && y <= b.top + b.height + sz;

    // Check corners first (where two edge zones overlap)
    if (nearTop && nearLeft && inHorizontalRange && inVerticalRange) {
      return { rect: rect, handle: "nw" };
    }
    if (nearTop && nearRight && inHorizontalRange && inVerticalRange) {
      return { rect: rect, handle: "ne" };
    }
    if (nearBottom && nearLeft && inHorizontalRange && inVerticalRange) {
      return { rect: rect, handle: "sw" };
    }
    if (nearBottom && nearRight && inHorizontalRange && inVerticalRange) {
      return { rect: rect, handle: "se" };
    }

    // Check edges
    if (nearTop && inHorizontalRange && inVerticalRange) {
      return { rect: rect, handle: "n" };
    }
    if (nearBottom && inHorizontalRange && inVerticalRange) {
      return { rect: rect, handle: "s" };
    }
    if (nearLeft && inVerticalRange && inHorizontalRange) {
      return { rect: rect, handle: "w" };
    }
    if (nearRight && inVerticalRange && inHorizontalRange) {
      return { rect: rect, handle: "e" };
    }

    // Inside rect but not near any edge — interior hit, stop checking rects behind
    if (x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height) {
      return null;
    }
  }
  return null;
}

// Calculate new bounds during resize
function calculateResizeBounds(mouseX, mouseY, handle, startBounds, altHeld) {
  var left = startBounds.left;
  var top = startBounds.top;
  var right = startBounds.left + startBounds.width;
  var bottom = startBounds.top + startBounds.height;

  // Determine which edges the handle moves
  var movesLeft = handle === "w" || handle === "nw" || handle === "sw";
  var movesRight = handle === "e" || handle === "ne" || handle === "se";
  var movesTop = handle === "n" || handle === "nw" || handle === "ne";
  var movesBottom = handle === "s" || handle === "sw" || handle === "se";

  if (altHeld) {
    // Symmetric resize around center
    var centerX = startBounds.left + startBounds.width / 2;
    var centerY = startBounds.top + startBounds.height / 2;

    if (movesLeft) {
      var dx = centerX - mouseX;
      if (dx < MIN_RECT_SIZE / 2) dx = MIN_RECT_SIZE / 2;
      left = Math.round(centerX - dx);
      right = Math.round(centerX + dx);
    }
    if (movesRight) {
      var dx = mouseX - centerX;
      if (dx < MIN_RECT_SIZE / 2) dx = MIN_RECT_SIZE / 2;
      left = Math.round(centerX - dx);
      right = Math.round(centerX + dx);
    }
    if (movesTop) {
      var dy = centerY - mouseY;
      if (dy < MIN_RECT_SIZE / 2) dy = MIN_RECT_SIZE / 2;
      top = Math.round(centerY - dy);
      bottom = Math.round(centerY + dy);
    }
    if (movesBottom) {
      var dy = mouseY - centerY;
      if (dy < MIN_RECT_SIZE / 2) dy = MIN_RECT_SIZE / 2;
      top = Math.round(centerY - dy);
      bottom = Math.round(centerY + dy);
    }
  } else {
    // Normal resize — move the dragged edge(s) to mouse position
    if (movesLeft) {
      left = Math.round(Math.min(mouseX, right - MIN_RECT_SIZE));
    }
    if (movesRight) {
      right = Math.round(Math.max(mouseX, left + MIN_RECT_SIZE));
    }
    if (movesTop) {
      top = Math.round(Math.min(mouseY, bottom - MIN_RECT_SIZE));
    }
    if (movesBottom) {
      bottom = Math.round(Math.max(mouseY, top + MIN_RECT_SIZE));
    }
  }

  return {
    left: left,
    top: top,
    width: right - left,
    height: bottom - top
  };
}

// Set resize cursor via inline style on <html>
function setResizeCursor(handle) {
  var map = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
              ne: "nesw-resize", nw: "nwse-resize", se: "nwse-resize", sw: "nesw-resize" };
  document.documentElement.style.setProperty("--sd-cursor", map[handle]);
}

// Clear resize cursor (remove inline override, class value takes over)
function clearResizeCursor() {
  document.documentElement.style.removeProperty("--sd-cursor");
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
    verticalGuideLines.indexOf(element) !== -1 ||
    spacingGuideElements.indexOf(element) !== -1
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

// Update hover cursor classes based on modifier key state and mouse position
function updateHoverCursors(metaOrCtrl, alt) {
  if (!isDrawingMode || isCurrentlyDrawing || isDuplicating || isRepositioning || isResizing) {
    return;
  }

  // Edge/corner detection has highest priority — regardless of modifiers
  var resizeHit = getResizeHandle(currentMouseX, currentMouseY);
  if (resizeHit) {
    setResizeCursor(resizeHit.handle);
    document.documentElement.classList.remove(REPOSITIONING_MODE_CLASS);
    document.documentElement.classList.remove(DUPLICATION_HOVER_CLASS);
    return;
  }

  clearResizeCursor();

  if (metaOrCtrl && !alt) {
    var rectUnderMouse = getRectangleAtPosition(currentMouseX, currentMouseY);
    if (rectUnderMouse) {
      document.documentElement.classList.add(REPOSITIONING_MODE_CLASS);
    } else {
      document.documentElement.classList.remove(REPOSITIONING_MODE_CLASS);
    }
  } else {
    document.documentElement.classList.remove(REPOSITIONING_MODE_CLASS);
  }

  if (alt) {
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

// Switch from repositioning to duplicating mid-drag (when Alt is pressed during Cmd+drag)
function switchRepositionToDuplicate() {
  // Revert the original rectangle to its starting position
  repositioningRectangle.style.left = repositionStartX + "px";
  repositioningRectangle.style.top = repositionStartY + "px";

  // Create a clone from the original rectangle
  var b = getRectBounds(repositioningRectangle);
  duplicatingRectangle = createRectangle(b.left, b.top, b.width, b.height);

  // Copy color from original rectangle
  var colorIndex = repositioningRectangle.getAttribute("data-color-index") || "0";
  duplicatingRectangle.setAttribute("data-color-index", colorIndex);
  if (COLOR_CLASSES[parseInt(colorIndex, 10)]) {
    duplicatingRectangle.classList.add(COLOR_CLASSES[parseInt(colorIndex, 10)]);
  }

  document.body.appendChild(duplicatingRectangle);

  // Transfer offsets (cursor-to-corner offset is the same)
  duplicateOffsetX = repositionOffsetX;
  duplicateOffsetY = repositionOffsetY;
  duplicateStartX = repositionStartX;
  duplicateStartY = repositionStartY;
  duplicateAxisLocked = repositionAxisLocked;

  // Flip state flags
  isRepositioning = false;
  isDuplicating = true;

  // Swap CSS classes
  document.documentElement.classList.remove(DRAGGING_MODE_CLASS);
  document.documentElement.classList.add(DUPLICATION_DRAGGING_CLASS);

  // Clear repositioning state
  repositioningRectangle = null;
  repositionAxisLocked = null;
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

  // Edge/corner resize has highest priority — regardless of modifier keys
  if (!isCurrentlyDrawing) {
    var resizeHit = getResizeHandle(event.clientX, event.clientY);
    if (resizeHit) {
      isResizing = true;
      resizingRectangle = resizeHit.rect;
      resizeHandle = resizeHit.handle;
      var rb = getRectBounds(resizeHit.rect);
      resizeStartBounds = { left: rb.left, top: rb.top, width: rb.width, height: rb.height };
      setResizeCursor(resizeHit.handle);
      event.preventDefault();
      return;
    }
  }

  // If Alt is held and mouse is over a rectangle, start duplicating (Figma-style)
  // Alt takes priority over Cmd/Ctrl — Cmd+Alt starts duplication, not repositioning
  if (event.altKey && !isCurrentlyDrawing) {
    var rectUnderMouse = getRectangleAtPosition(event.clientX, event.clientY);
    if (rectUnderMouse) {
      clearResizeCursor();
      isDuplicating = true;

      // Show copy cursor during duplication drag
      document.documentElement.classList.remove(DUPLICATION_HOVER_CLASS);
      document.documentElement.classList.add(DUPLICATION_DRAGGING_CLASS);

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
      duplicateOffsetX = b.left - event.clientX;
      duplicateOffsetY = b.top - event.clientY;

      // Store starting position for axis locking
      duplicateStartX = b.left;
      duplicateStartY = b.top;
      duplicateAxisLocked = null;

      event.preventDefault();
      return;
    }
  }

  // If Cmd/Ctrl is held and mouse is over a rectangle, start repositioning
  if ((event.metaKey || event.ctrlKey) && !isCurrentlyDrawing) {
    var rectUnderMouse = getRectangleAtPosition(event.clientX, event.clientY);
    if (rectUnderMouse) {
      clearResizeCursor();
      isRepositioning = true;
      repositioningRectangle = rectUnderMouse;

      // Switch to grabbed cursor during drag
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
  isShiftHeld = event.shiftKey; // Capture initial Shift state
  axisConstraintMode = null; // Reset axis constraint
  startX = event.clientX;
  startY = event.clientY;

  // Remove hover cursor classes when starting to draw
  clearResizeCursor();
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

  // Update hover cursors based on modifier keys and mouse position
  updateHoverCursors(event.metaKey || event.ctrlKey, event.altKey);

  // Handle resize mode
  if (isResizing && resizingRectangle) {
    var cm = clampMouse(currentMouseX, currentMouseY);
    var newBounds = calculateResizeBounds(cm.x, cm.y, resizeHandle, resizeStartBounds, event.altKey);
    var clamped = applySnapClampAndGuides(newBounds.left, newBounds.top, newBounds.width, newBounds.height, resizingRectangle, applyResizeSnapping);
    resizingRectangle.style.left = clamped.x + "px";
    resizingRectangle.style.top = clamped.y + "px";
    resizingRectangle.style.width = clamped.width + "px";
    resizingRectangle.style.height = clamped.height + "px";
    event.preventDefault();
    return;
  }

  // Handle repositioning mode
  if (isRepositioning && repositioningRectangle) {
    // Mid-drag switch: if Alt is pressed during reposition, switch to duplication
    if (event.altKey) {
      switchRepositionToDuplicate();
      return;
    }

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

  // Update Alt and Shift state during drawing
  isAltHeld = event.altKey;
  isShiftHeld = event.shiftKey;

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

  // If resizing, finalize the resize
  if (isResizing && resizingRectangle) {
    isResizing = false;
    resizingRectangle = null;
    resizeHandle = null;
    resizeStartBounds = null;
    clearResizeCursor();
    event.preventDefault();
    return;
  }

  // If duplicating, finalize the duplicate placement
  if (isDuplicating && duplicatingRectangle) {
    placedRectangles.push(duplicatingRectangle);
    duplicatingRectangle = null;
    isDuplicating = false;
    duplicateAxisLocked = null;
    document.documentElement.classList.remove(DUPLICATION_DRAGGING_CLASS);
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
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      traverseSibling(-1);  // Previous sibling
      return;
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      traverseSibling(1);   // Next sibling
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
    // If resizing, cancel and revert to original bounds
    if (isResizing && resizingRectangle && resizeStartBounds) {
      hideGuideLines();
      resizingRectangle.style.left = resizeStartBounds.left + "px";
      resizingRectangle.style.top = resizeStartBounds.top + "px";
      resizingRectangle.style.width = resizeStartBounds.width + "px";
      resizingRectangle.style.height = resizeStartBounds.height + "px";
      isResizing = false;
      resizingRectangle = null;
      resizeHandle = null;
      resizeStartBounds = null;
      clearResizeCursor();
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
      } else if (isResizing && resizingRectangle) {
        targetRect = resizingRectangle;
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
    if (isDrawingMode && !isCurrentlyDrawing && !isDuplicating && !isRepositioning && !isResizing) {
      var rectUnderMouse = getRectangleAtPosition(currentMouseX, currentMouseY);
      if (rectUnderMouse) {
        event.preventDefault();
        deleteRectangle(rectUnderMouse);
        return;
      }
    }
  } else if (event.key === "u" || event.key === "U") {
    // Undo last deleted rectangle
    if (isDrawingMode && !isCurrentlyDrawing && !isDuplicating && !isRepositioning && !isResizing && !isInspecting && lastDeletedRect) {
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

  // Update hover cursors when modifier keys are pressed (even if mouse isn't moving)
  updateHoverCursors(event.metaKey || event.ctrlKey, event.altKey);
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

  // Update hover cursors when modifier keys are released (even if mouse isn't moving)
  updateHoverCursors(event.metaKey || event.ctrlKey, event.altKey);
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
  isResizing = false;
  resizingRectangle = null;
  resizeHandle = null;
  resizeStartBounds = null;
  lastDeletedRect = null;
  document.documentElement.classList.remove(DRAWING_MODE_CLASS);
  document.documentElement.classList.remove(PAN_MODE_CLASS);
  document.documentElement.classList.remove(REPOSITIONING_MODE_CLASS);
  document.documentElement.classList.remove(DUPLICATION_HOVER_CLASS);
  document.documentElement.classList.remove(DUPLICATION_DRAGGING_CLASS);
  document.documentElement.classList.remove(DRAGGING_MODE_CLASS);
  clearResizeCursor();

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
