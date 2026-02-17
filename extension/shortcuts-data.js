// Shared keyboard shortcuts data and utilities for both options page and help dialog
var KEYBOARD_SHORTCUTS = [
  {
    category: "Drawing Mode",
    shortcuts: [
      { keys: "Alt + F", description: "Toggle drawing mode" },
      { keys: "Click & Drag", description: "Draw rectangle" },
      { keys: "Alt (during drawing)", description: "Draw from center" },
      { keys: "Shift (during drawing)", description: "Constrain to square" },
      { keys: "Cmd/Ctrl (during drawing)", description: "Axis constraint" },
      { keys: "Spacebar (hold during drawing)", description: "Pan mode - move rectangle" }
    ]
  },
  {
    category: "Rectangle Operations",
    shortcuts: [
      { keys: "Alt + Drag (over rectangle)", description: "Duplicate rectangle" },
      { keys: "Cmd/Ctrl + Drag (over rectangle)", description: "Reposition rectangle" },
      { keys: "Cmd/Ctrl + Drag, then Alt", description: "Switch reposition to duplicate mid-drag" },
      { keys: "Shift + Drag (while repositioning/duplicating)", description: "Lock to horizontal or vertical axis" },
      { keys: "Tab", description: "Cycle rectangle colors" },
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
      { keys: "Arrow Left (in inspection)", description: "Highlight previous sibling element" },
      { keys: "Arrow Right (in inspection)", description: "Highlight next sibling element" },
      { keys: "Tab (in inspection)", description: "Cycle rectangle colors" }
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

// Shared button group handler — used by both options page and content script help dialog
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

// Update the toggle shortcut display in the first shortcuts table
function updateToggleShortcutDisplay(container, shortcutText) {
  if (!container || !shortcutText) return;
  var tables = container.querySelectorAll(".shortcuts-table");
  if (tables.length > 0) {
    var firstCell = tables[0].querySelector(".shortcut-keys");
    if (firstCell) {
      firstCell.textContent = shortcutText;
    }
  }
}

// Shared preference defaults
var DEFAULT_PREFERENCES = {
  borderSize: "1",
  defaultColor: "",
  snapToEdges: true
};
