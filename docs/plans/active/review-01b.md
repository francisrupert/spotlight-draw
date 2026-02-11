# Refactor: DRY, BEM, and Code Organization

## Context

Code review identified significant duplication between `content.css` and `options.css` (18 duplicated CSS rules), repeated JS patterns throughout `content.js` (30+ `parseInt` calls, duplicated axis-locking blocks, mouse-clamping pairs), and magic numbers scattered without constants. A peer review (review-01a) independently flagged several of the same issues plus a shortcut text bug, duplicated `setupButtonGroup` JS, and inconsistent state resets. This plan incorporates those findings and addresses the highest-impact DRY violations while avoiding overengineering (no state object restructuring, no file-splitting of the snapping system, no `!important` chain rework).

---

## Phase 1: Extract shared CSS into `components.css`

**Why:** 18 rules duplicated across two files — the single biggest DRY violation.

**Create** `extension/components.css` containing the canonical versions of:
- `.button-group` family (6 rules: base, item, :last-child, :hover, .active, :focus)
- `.color-button` family (8 rules: base, 5 data-color variants, .active::after)
- `.checkbox-label` family (3 rules: base, input, span)
- `.shortcuts-table` family (5 rules: table, tr, tr:last-child, .shortcut-keys, .shortcut-description)

**Reconcile the 4 minor differences** between files:
| Difference | Resolution |
|---|---|
| `transition` on `.button-group-item` (content only) | Include it — harmless enhancement for options |
| `.button-group-item:last-child` border (options only) | Include it |
| `.color-button.active::after`: content has `font-weight: bold`, options has `font-family: var(--font-system)` | Include both properties |
| `.shortcut-keys inline-size`: content `45%`, options `40%` | Use `45%` (dialog is the tighter layout) |

**Edit** `extension/manifest.json` — add `"components.css"` to the `css` array between `tokens.css` and `content/content.css`:
```json
"css": ["tokens.css", "components.css", "content/content.css"]
```

**Edit** `extension/options/options.html` — add `<link rel="stylesheet" href="../components.css">` between the tokens and options links (between lines 7 and 8).

**Edit** `extension/content/content.css` — delete lines 219–312 (the 11 dialog-scoped `.box-highlight-help__dialog .xxx` rules for button-group, color-button, and checkbox-label). Also delete lines 331–361 (shortcuts-table, shortcut-keys, shortcut-description). Keep lines 314–329 (`.box-highlight-help__shortcuts`, `.shortcuts-category`, `.shortcuts-category h4` — these are content-specific layout).

**Edit** `extension/options/options.css` — delete lines 35–130 (button-group through checkbox-label) and lines 144–174 (shortcuts-table through shortcut-description). Also delete the 2 dead empty rules: `.setting-group {}` (line 23–24) and `.color-group {}` (line 71–72). Keep lines 132–142 (`.shortcuts-section`, `.shortcuts-section h2` — options-specific layout).

**Verification:** Open options popup — button groups, color buttons, checkbox, shortcuts table should render identically. Activate drawing mode, press `?` — help dialog components should render correctly inside the dialog (the `!important` wildcard override on `.box-highlight-help__dialog *` at content.css lines 140–146 already handles pointer-events).

---

## Phase 2: JS helper — `getRectBounds(rect)`

**Why:** `parseInt(rect.style.X, 10)` across 4 properties appears as a full block 6+ times and partially 30+ times.

**Add** after `clampToViewport` (~line 106 in `content.js`):
```js
function getRectBounds(rect) {
  return {
    left: parseInt(rect.style.left, 10),
    top: parseInt(rect.style.top, 10),
    width: parseInt(rect.style.width, 10),
    height: parseInt(rect.style.height, 10)
  };
}
```

**Replace at** these call sites (use `var b = getRectBounds(rect)` then `b.left`, etc.):
- Lines 444–447 (`getSnapTargets`)
- Lines 883–886 (`getRectangleAtPosition`)
- Lines 931–934 (`deleteRectangle`)
- Lines 1145–1148 (`handleMouseDown` duplication setup)
- Lines 1294–1295 (`handleMouseMove` repositioning — width/height only)
- Lines 1339–1340 (`handleMouseMove` duplication — width/height only)
- Lines 1436–1437 (`handleMouseUp` — width/height only)
- Lines 1502–1507 (`handleSpacebarDown` — width/height then left/top)
- Lines 1526–1529 (`handleSpacebarUp`)

**Verification:** Draw, reposition (Cmd+drag), duplicate (Alt+drag), delete, undo, spacebar pan — all exercise refactored sites.

---

## Phase 3: JS helper — `clampMouse(x, y)`

**Why:** 3 identical pairs of clamping lines in `handleMouseMove`.

**Add** near `clampToViewport`:
```js
function clampMouse(x, y) {
  return {
    x: Math.max(0, Math.min(x, window.innerWidth)),
    y: Math.max(0, Math.min(y, window.innerHeight))
  };
}
```

**Replace at** lines 1263–1264, 1308–1309, 1380–1381 with:
```js
var cm = clampMouse(currentMouseX, currentMouseY);
var clampedMouseX = cm.x;
var clampedMouseY = cm.y;
```

(Keeping `clampedMouseX`/`clampedMouseY` variable names minimizes the diff at each site.)

**Verification:** Reposition, duplicate, and draw near viewport edges.

---

## Phase 4: JS helper — `applyAxisLock()`

**Why:** Two identical 24-line blocks at lines 1269–1292 (repositioning) and 1314–1337 (duplication) differ only in variable names.

**Add** helper:
```js
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
```

**Replace** both blocks with 4-line calls:
```js
var locked = applyAxisLock(newX, newY, repositionStartX, repositionStartY, repositionAxisLocked, event.shiftKey);
newX = locked.x;
newY = locked.y;
repositionAxisLocked = locked.axisLocked;
```
(Same pattern for duplication with `duplicateStartX/Y`, `duplicateAxisLocked`.)

**Verification:** Hold Shift while repositioning and duplicating — axis locks correctly, releasing Shift frees movement.

---

## Phase 5: JS helpers — `removeColorClasses()` + magic number constants

### 5a: `removeColorClasses(rect)`

**Why:** Same loop at lines 908–911 and 1665–1667.

```js
function removeColorClasses(rect) {
  for (var i = 0; i < COLOR_CLASSES.length; i++) {
    if (COLOR_CLASSES[i]) {
      rect.classList.remove(COLOR_CLASSES[i]);
    }
  }
}
```

Replace both call sites.

### 5b: Constants

**Add** after `SNAP_THRESHOLD` (~line 81):
```js
var Z_INDEX_RECTANGLE = "2147483647";
var Z_INDEX_GUIDE = "2147483646";
var MIN_RECT_SIZE = 3;
var GUIDE_BORDER_STYLE = "0.5px dashed GrayText";
var ANIMATION_DURATION = 300;
```

**Replace at:**
- `"2147483647"` → `Z_INDEX_RECTANGLE` at line 137
- `"2147483646"` → `Z_INDEX_GUIDE` at lines 727, 740
- `3` → `MIN_RECT_SIZE` at line 1439
- `"0.5px dashed GrayText"` → `GUIDE_BORDER_STYLE` at lines 725, 738
- `300` → `ANIMATION_DURATION` at line 270

**Verification:** Draw rectangles (z-index), snap guides appear (guide z-index + border style), draw tiny rect and release (min size), open/close help (animation timeout).

---

## Phase 6: Tokenize shadow/backdrop values in CSS

**Why:** `rgba(0, 0, 0, 0.3)` and `rgba(0, 0, 0, 0.5)` are opaque hardcoded values.

**Edit** `extension/tokens.css` — add:
```css
--shadow-dialog: rgba(0, 0, 0, 0.3);
--backdrop-overlay: rgba(0, 0, 0, 0.5);
```

**Edit** `extension/content/content.css`:
- Line 125 `box-shadow`: replace `rgba(0, 0, 0, 0.3)` with `var(--shadow-dialog)`
- Line 135 `background`: replace `rgba(0, 0, 0, 0.5)` with `var(--backdrop-overlay)`

**Verification:** Open help dialog — shadow and backdrop look the same.

---

## Phase 7: Fix shortcut text mismatch

**Why:** `KEYBOARD_SHORTCUTS` in `shortcuts-data.js` line 8 says `"Shift + Drag: Lock to horizontal or vertical axis"` under the Drawing Mode section. But during drawing, Cmd/Ctrl is used for axis constraint — Shift only locks axis during reposition (Cmd+drag) and duplicate (Alt+drag). This is a documentation bug flagged by the peer review.

**Edit** `extension/shortcuts-data.js` line 8 — move the "Shift + Drag" entry from the Drawing Mode section to the Rectangle Operations section (where Alt+drag and Cmd/Ctrl+drag live), and clarify it applies when repositioning or duplicating.

**Verification:** Press `?` in drawing mode and check the options page — the shortcut description should accurately reflect the actual behavior.

---

## Phase 8: Shared `setupButtonGroup` in `shortcuts-data.js`

**Why:** `setupButtonGroup()` in `options.js:52–69` and `setupDialogButtonGroup()` in `content.js:351–375` are near-identical — both toggle `.active` class on click and persist the value. The only differences are: options uses `document.getElementById`, content uses `helpDialog.querySelector`; and the save mechanism (`saveOptions()` vs `saveSetting(key, value)`).

**Add** to `extension/shortcuts-data.js` a shared helper:
```js
function setupButtonGroup(container, groupId, onChange) {
  var group = container.querySelector("#" + groupId);
  if (!group) return;
  var buttons = group.querySelectorAll(".button-group-item");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener("click", function() {
      for (var j = 0; j < buttons.length; j++) {
        buttons[j].classList.remove("active");
      }
      this.classList.add("active");
      if (onChange) onChange(this.getAttribute("data-value"));
    });
  }
}
```

**Edit** `extension/options/options.js` — replace `setupButtonGroup(groupId)` with calls to the shared version, passing `document` as the container and `saveOptions` as the callback.

**Edit** `extension/content/content.js` — replace `setupDialogButtonGroup(groupId, settingKey)` with calls to the shared version, passing `helpDialog` as the container and a `saveSetting` wrapper as the callback.

**Files affected:** `extension/shortcuts-data.js`, `extension/options/options.js`, `extension/content/content.js`

**Verification:** Open options page — click border size and color buttons, verify they toggle correctly and persist. Open help dialog — same test.

---

## Phase 9: `resetDragState()` helper

**Why:** State reset code is scattered across `handleMouseUp` (line 1429–1432) and `disableDrawingMode` (line 1743–1749) with inconsistent coverage. We already hit a real bug from this — `isSpacebarHeld` was being reset in `handleMouseUp` but the keyup handler depended on it staying true. A single reset function prevents such drift.

**Add** helper in `content.js`:
```js
function resetDragState() {
  isCurrentlyDrawing = false;
  isAltHeld = false;
  isCmdCtrlHeld = false;
  axisConstraintMode = null;
  duplicateAxisLocked = null;
  repositionAxisLocked = null;
}
```

**Replace** the manual resets at:
- `handleMouseUp` (~line 1429–1432): replace `isCurrentlyDrawing = false; isAltHeld = false; isCmdCtrlHeld = false; axisConstraintMode = null;` with `resetDragState();`
- `disableDrawingMode` (~line 1743–1749): replace the equivalent lines with `resetDragState();` plus the additional resets specific to full disable (`isSpacebarHeld`, `isDuplicating`, `isRepositioning`, `lastDeletedRect`).

Note: `isSpacebarHeld` is deliberately NOT in `resetDragState()` — it has its own lifecycle (set on keydown, cleared on keyup). Including it would re-introduce the bug we just fixed.

**Verification:** Draw a rectangle and release — state resets. Disable drawing mode entirely — all state clears. Spacebar pan still works correctly (isSpacebarHeld not prematurely cleared).

---

## Files modified

| File | Phases |
|---|---|
| `extension/components.css` (NEW) | 1 |
| `extension/manifest.json` | 1 |
| `extension/options/options.html` | 1 |
| `extension/content/content.css` | 1, 6 |
| `extension/options/options.css` | 1 |
| `extension/content/content.js` | 2, 3, 4, 5, 8, 9 |
| `extension/tokens.css` | 6 |
| `extension/shortcuts-data.js` | 7, 8 |
| `extension/options/options.js` | 8 |

## Deliberately skipped

- **Grouping globals into state objects** — touches nearly every line, high risk, marginal benefit
- **Extracting snapping into a separate file** — well-organized already, no module system
- **Fixing CSS `!important` chain** — requires rethinking the overlay model, high breakage risk
- **Decomposing `handleMouseMove`/`handleKeyDown` into sub-functions** — the helpers in Phases 2–4 already reduce their bulk significantly; further splitting adds indirection without removing duplication
- **Merging `showHorizontalGuides`/`showVerticalGuides`** — only 2 lines differ, named functions are clearer
- **Event listener loop** — 7 symmetric lines are already readable
- **`innerHTML` to `createElement`** — massive rewrite, marginal benefit

### Considered from peer review (01a) but skipped

- **Split `shortcuts-data.js` into 3 files** (preferences.js, shortcuts.js, segmented.js) — the file is 80 lines; splitting adds file management overhead without meaningful benefit
- **BEM pass on options page** (`.container` → `.box-highlight-options__container`, etc.) — the options page is isolated in its own HTML with no collision risk; renaming everything is cosmetic overhead
- **`var` → `let/const` migration** — valid modernization but a massive diff orthogonal to DRY/BEM focus; better as a separate dedicated pass
- **IIFE wrapper for content script** — nice hygiene but unrelated to the DRY/BEM goals
- **CSS custom properties for z-index** — z-index is set via JS inline styles, not CSS rules; the JS constants in Phase 5 are sufficient
- **`getElementAtCursor` simplification** — micro-optimization, out of scope
- **Accessibility improvements** (focus management, aria-labelledby) — valid but separate concern
