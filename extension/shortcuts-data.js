// Shared keyboard shortcuts data for both options page and help dialog
var KEYBOARD_SHORTCUTS = [
  {
    category: "Drawing Mode",
    shortcuts: [
      { keys: "Alt + F", description: "Toggle drawing mode" },
      { keys: "Click & Drag", description: "Draw rectangle" },
      { keys: "Shift + Drag", description: "Lock to horizontal or vertical axis" },
      { keys: "Alt (during drawing)", description: "Draw from center" },
      { keys: "Cmd/Ctrl (during drawing)", description: "Axis constraint" },
      { keys: "Spacebar (hold during drawing)", description: "Pan mode - move rectangle" }
    ]
  },
  {
    category: "Rectangle Operations",
    shortcuts: [
      { keys: "Alt + Drag (over rectangle)", description: "Duplicate rectangle" },
      { keys: "Cmd/Ctrl + Drag (over rectangle)", description: "Reposition rectangle" },
      { keys: "Tab (over rectangle)", description: "Cycle rectangle colors" },
      { keys: "Delete / Backspace (over rectangle)", description: "Remove rectangle" },
      { keys: "Right-click + Drag", description: "Multi-rectangle mode (like Shift)" }
    ]
  },
  {
    category: "Element Inspection",
    shortcuts: [
      { keys: "F (hold)", description: "Element inspection mode" },
      { keys: "Arrow Up (in inspection)", description: "Highlight parent element" },
      { keys: "Arrow Down (in inspection)", description: "Highlight child element" },
      { keys: "Tab (in inspection)", description: "Highlight next sibling element" },
      { keys: "Shift + Tab (in inspection)", description: "Highlight previous sibling element" }
    ]
  },
  {
    category: "General",
    shortcuts: [
      { keys: "?", description: "Toggle shortcuts & settings dialog" },
      { keys: "Escape", description: "Close dialog or exit current mode" }
    ]
  }
];
