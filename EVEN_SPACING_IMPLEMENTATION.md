# Even Spacing Feature Implementation

**Date**: 2026-02-11
**Branch**: space-evely

## Overview

Implemented a Figma-style "smart distribute" feature that automatically snaps rectangles to positions that create equal spacing between adjacent rectangles when dragging or duplicating.

## User Experience

When moving or duplicating a rectangle:
- Detects three positioning scenarios:
  1. **Between**: Position between two rectangles with equal gaps on both sides
  2. **Left/Above**: Position to the left/above to match an existing gap
  3. **Right/Below**: Position to the right/below to match an existing gap
- Within 8px snap threshold (same as edge snapping)
- The rectangle snaps to the even-spacing position
- Visual guides appear spanning the gap

## Visual Feedback

**Spacing Guide Lines:**
- Solid gray lines (1px solid GrayText)
- Span along the gap (parallel to the spacing direction)
- Horizontal spacing = horizontal line spanning the gap
- Vertical spacing = vertical line spanning the gap
- Positioned at the vertical/horizontal midpoint of adjacent rectangles

**Different from Edge Guides:**
- Edge guides: 0.5px dashed GrayText, span full viewport
- Spacing guides: 1px solid GrayText, span only the gap length

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
   - For each adjacent pair (A, B) with a gap:
     - Calculate gap: `B.left - A.right`
     - **Case 1 - Between**: If rect fits between A and B:
       - Position: `A.right + (gap - rectWidth) / 2`
       - Creates equal gaps on both sides
     - **Case 2 - Left**: Position rect to the left of A:
       - Position: `A.left - gap - rectWidth`
       - Creates gap between C and A equal to gap between A and B
     - **Case 3 - Right**: Position rect to the right of B:
       - Position: `B.right + gap`
       - Creates gap between B and C equal to gap between A and B
3. Repeat for vertical spacing (sort by top edge, same logic for above/below)

**Returns**:
```javascript
{
  horizontal: [
    {
      position: x,                   // Left position for even spacing
      gap: pixels,                   // Size of each equal gap
      between: [rectA, rectB] | null, // For "between" case, or null for left/right
      referenceRects: [rectA, rectB], // Reference rectangles for visual extent
      gapStart: x,                   // Start of the gap being indicated
      gapEnd: x                      // End of the gap being indicated
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

**New Tests** (12 total):
1. ✓ Finds horizontal even spacing between two rectangles
2. ✓ Finds vertical even spacing between two rectangles
3. ✓ Ignores gaps where rectangle is too large to fit
4. ✓ Handles multiple spacing opportunities (now finds 6 targets per 2 pairs)
5. ✓ Excludes specified rectangle from calculations
6. ✓ Handles no rectangles
7. ✓ Ignores overlapping rectangles
8. ✓ Calculates correct even spacing positions
9. ✓ Finds left positioning target for even spacing
10. ✓ Finds right positioning target for even spacing
11. ✓ Finds above positioning target for vertical even spacing
12. ✓ Finds below positioning target for vertical even spacing

### Manual Testing
**File**: `test-even-spacing.html`

**Test Scenarios**:
1. Horizontal even spacing (between) - position C between A and B
2. Horizontal even spacing (right) - position C right of B matching A-B gap
3. Horizontal even spacing (left) - position C left of A matching A-B gap
4. Vertical even spacing (between) - position C between A and B vertically
5. Vertical even spacing (below) - position C below B matching A-B gap
6. Vertical even spacing (above) - position C above A matching A-B gap
7. Duplication with even spacing (Alt+drag)
8. Repositioning with even spacing (Cmd/Ctrl+drag)
9. Priority verification (edge alignment vs even spacing)
10. Rectangle too large (no spacing snap)

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
