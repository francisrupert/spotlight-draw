# Even Spacing Feature Implementation

**Date**: 2026-02-11
**Branch**: space-evely

## Overview

Implemented a Figma-style "smart distribute" feature that automatically snaps rectangles to positions that create equal spacing between adjacent rectangles when dragging or duplicating.

## User Experience

When moving or duplicating a rectangle:
- If positioned between two other rectangles
- And the position would create equal gaps on both sides
- Within 8px snap threshold (same as edge snapping)
- The rectangle snaps to the even-spacing position
- Visual guides appear at the gap midpoints

## Visual Feedback

**Spacing Guide Lines:**
- Solid colored lines (using `var(--spotlight-draw-color)`)
- Positioned at the midpoint of gaps
- Span only the gap region (not full viewport like edge guides)
- Horizontal spacing = vertical line in the horizontal gap
- Vertical spacing = horizontal line in the vertical gap

**Different from Edge Guides:**
- Edge guides: dashed GrayText, span full viewport
- Spacing guides: solid color, span only gaps

## Implementation Details

### New Variables (lines 90-96)
```javascript
// Spacing guide lines (for even spacing visualization)
var spacingGuideHorizontal = null;
var spacingGuideVertical = null;
```

### New Function: `getEvenSpacingTargets(rect, excludeRect)`
**Location**: After `getSnapTargets()` (around line 500)

**Purpose**: Detects all positions where a rectangle would create even spacing between adjacent rectangles

**Algorithm**:
1. Collect all rectangles except the one being moved
2. For horizontal spacing:
   - Sort rectangles by left edge
   - For each adjacent pair (A, B):
     - Calculate gap: `B.left - A.right`
     - If rect fits: calculate even position: `A.right + (gap - rectWidth) / 2`
     - Store as spacing target
3. Repeat for vertical spacing (sort by top edge)

**Returns**:
```javascript
{
  horizontal: [
    {
      position: x,           // Left position for even spacing
      gap: pixels,           // Size of each equal gap
      between: [rectA, rectB], // The two rectangles
      gapStart: x,           // Start of gap (A.right)
      gapEnd: x              // End of gap (B.left)
    }
  ],
  vertical: [ /* same structure */ ]
}
```

### Modified: `applyPositionSnapping()`
**Location**: Lines 603-867

**Changes**:
1. Added `spacingGuides` array to return value
2. Track whether edge/center snapping occurred (`xSnapped`, `ySnapped`)
3. If no edge/center snap:
   - Call `getEvenSpacingTargets()`
   - Check if current position is within threshold of any spacing target
   - If yes: snap to position and store guide info

**Priority Order**:
1. Edge alignment (existing)
2. Center alignment (existing)
3. Even spacing (new) - only if neither edge nor center snapped

### Modified: `applySnapping()`
**Returns**: Added `spacingGuides: []` for consistency (drawing mode doesn't use spacing)

### New Function: `showSpacingGuides(guides)`
**Location**: Before `hideGuideLines()` (around line 900)

**Purpose**: Display spacing guide lines in gaps

**Implementation**:
- For horizontal spacing (vertical line):
  - Position at gap midpoint: `(gapStart + gapEnd) / 2`
  - Span vertically using `between` rectangles' extent
- For vertical spacing (horizontal line):
  - Position at gap midpoint
  - Span horizontally using `between` rectangles' extent

### Modified: `createGuideLines()`
**Changes**: Added creation of spacing guide elements

### Modified: `removeGuideLines()`
**Changes**: Added removal of spacing guide elements

### Modified: `hideGuideLines()`
**Changes**: Added hiding of spacing guides

### Modified: `applySnapClampAndGuides()`
**Changes**:
- Added `spacingGuides: []` to fallback when snap disabled
- Call `showSpacingGuides()` if spacing guides present
- Hide spacing guides if no spacing snap

### Modified: `getElementAtCursor()`
**Changes**: Exclude spacing guide elements from element detection

## Testing

### Unit Tests
**File**: `tests/unit/helpers.test.js`

**New Tests** (8 total):
1. ✓ Finds horizontal even spacing between two rectangles
2. ✓ Finds vertical even spacing between two rectangles
3. ✓ Ignores gaps where rectangle is too large to fit
4. ✓ Handles multiple spacing opportunities
5. ✓ Excludes specified rectangle from calculations
6. ✓ Handles no rectangles
7. ✓ Ignores overlapping rectangles
8. ✓ Calculates correct even spacing positions

### Manual Testing
**File**: `test-even-spacing.html`

**Test Scenarios**:
1. Horizontal even spacing between two rectangles
2. Vertical even spacing between two rectangles
3. Duplication with even spacing (Alt+drag)
4. Repositioning with even spacing (Cmd/Ctrl+drag)
5. Priority verification (edge alignment vs even spacing)
6. Rectangle too large (no spacing snap)

## Edge Cases Handled

1. **Rectangle too large**: No spacing snap if rectangle doesn't fit in gap
2. **Overlapping rectangles**: Ignored (no actual gap)
3. **Multiple opportunities**: Uses closest spacing target
4. **Priority**: Edge/center alignment takes precedence
5. **Viewport boundaries**: Guide lines clamped to visible region
6. **No rectangles**: Returns empty targets gracefully

## User Preferences

- Controlled by existing "Snap to Edges" preference
- When disabled, even spacing is also disabled
- No separate toggle needed

## Performance Considerations

- Spacing calculation only runs when:
  - Snap to edges is enabled
  - User is moving/duplicating (not drawing)
  - No edge/center snap already occurred
- Sorting is done on small arrays (typically < 10 rectangles)
- O(n log n) for sorting, O(n) for iteration

## Future Enhancements (Not Implemented)

1. Numeric spacing labels (explicitly excluded per requirements)
2. Multi-rectangle distribution (select multiple and distribute evenly)
3. Spacing snap during drawing mode (not useful for variable-size drawing)
4. Preferred spacing values (snap to specific gap sizes like 8px, 16px)

## Files Modified

1. `extension/content/content.js`:
   - Added spacing guide variables
   - Added `getEvenSpacingTargets()` function
   - Modified `applyPositionSnapping()`
   - Modified `applySnapping()` (return value)
   - Added `showSpacingGuides()` function
   - Modified `createGuideLines()`
   - Modified `removeGuideLines()`
   - Modified `hideGuideLines()`
   - Modified `applySnapClampAndGuides()`
   - Modified `getElementAtCursor()`

2. `tests/unit/helpers.test.js`:
   - Added 8 unit tests for `getEvenSpacingTargets()`

3. `.claude/projects/.../memory/MEMORY.md`:
   - Documented even spacing feature
   - Updated test count

4. `test-even-spacing.html` (new):
   - Manual testing guide

## Verification

Run tests:
```bash
npm test
```

Load extension and test manually:
1. Open `test-even-spacing.html`
2. Press `D` to enable drawing mode
3. Follow test scenarios in the HTML file

## Summary

The even spacing feature provides Figma-like smart distribution without numeric labels. It integrates seamlessly with existing snapping behavior, respects priority order, and provides clear visual feedback through gap-centered guide lines. The implementation is well-tested with 8 unit tests and handles all identified edge cases.
