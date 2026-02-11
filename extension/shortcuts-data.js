// Shared keyboard shortcuts data and utilities for both options page and help dialog
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
      { keys: "U (in drawing mode)", description: "Undo last deleted rectangle" },
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

// Shared renderer — used by both options page and content script help dialog
function renderShortcutsInto(container, headingTag, categoryClass) {
  if (!container || typeof KEYBOARD_SHORTCUTS === "undefined") return;
  KEYBOARD_SHORTCUTS.forEach(function(category) {
    var section = document.createElement("div");
    section.className = categoryClass;

    var heading = document.createElement(headingTag);
    heading.textContent = category.category;
    section.appendChild(heading);

    var table = document.createElement("table");
    table.className = "shortcuts-table";
    category.shortcuts.forEach(function(shortcut) {
      var row = document.createElement("tr");
      var keysCell = document.createElement("td");
      keysCell.className = "shortcut-keys";
      keysCell.textContent = shortcut.keys;
      row.appendChild(keysCell);
      var descCell = document.createElement("td");
      descCell.className = "shortcut-description";
      descCell.textContent = shortcut.description;
      row.appendChild(descCell);
      table.appendChild(row);
    });
    section.appendChild(table);
    container.appendChild(section);
  });
}

// Shared preference defaults
var DEFAULT_PREFERENCES = {
  borderSize: "1",
  defaultColor: "",
  snapToEdges: true
};
