// Shared keyboard shortcuts data and utilities for both options page and help dialog
var KEYBOARD_SHORTCUTS = [
  {
    category: "Drawing Mode",
    shortcuts: [
      { id: "toggleShortcut", keys: "Option + F", description: "Toggle drawing mode" },
      { id: "quickDrawShortcut", keys: "Ctrl + Option + Cmd + Drag", description: "Temporary quick draw" },
      { keys: "Spacebar (during quick draw)", description: "Move temporary rectangle" },
      { keys: "Click & Drag", description: "Draw rectangle" },
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
      { keys: "F + Click (highlighted element)", description: "Freeze highlighted element outline" },
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
      if (shortcut.id) {
        keysCell.setAttribute("data-shortcut-id", shortcut.id);
      }
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

function isModifierKeyName(key) {
  return key === "Control" || key === "Ctrl" || key === "Alt" || key === "Option" ||
    key === "Meta" || key === "Cmd" || key === "Command" || key === "Shift";
}

function normalizeShortcutKey(key) {
  if (!key) return "";
  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key;
}

function shortcutKeyFromEvent(event) {
  var code = event.code || "";
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (code === "Space") return "Space";
  return normalizeShortcutKey(event.key);
}

function shortcutFromEvent(event, mode) {
  var parts = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.metaKey) parts.push("Meta");
  if (event.shiftKey) parts.push("Shift");

  if (mode === "modifiers") {
    return parts.length ? parts.join("+") : null;
  }

  var key = shortcutKeyFromEvent(event);
  if (!key || isModifierKeyName(key)) {
    return null;
  }

  parts.push(key);
  return parts.join("+");
}

function parseShortcut(shortcut) {
  var result = {
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    key: ""
  };
  if (!shortcut) return result;

  var tokens = shortcut.split("+");
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i].trim();
    var lower = token.toLowerCase();
    if (lower === "ctrl" || lower === "control") {
      result.ctrlKey = true;
    } else if (lower === "alt" || lower === "option") {
      result.altKey = true;
    } else if (lower === "meta" || lower === "cmd" || lower === "command") {
      result.metaKey = true;
    } else if (lower === "shift") {
      result.shiftKey = true;
    } else if (token) {
      result.key = normalizeShortcutKey(token);
    }
  }
  return result;
}

function eventMatchesShortcut(event, shortcut) {
  var parsed = parseShortcut(shortcut);
  if (event.ctrlKey !== parsed.ctrlKey ||
      event.altKey !== parsed.altKey ||
      event.metaKey !== parsed.metaKey ||
      event.shiftKey !== parsed.shiftKey) {
    return false;
  }

  if (!parsed.key) {
    return true;
  }

  return shortcutKeyFromEvent(event) === parsed.key;
}

function formatShortcutForDisplay(shortcut) {
  var parsed = parseShortcut(shortcut);
  var parts = [];
  if (parsed.ctrlKey) parts.push("Ctrl");
  if (parsed.altKey) parts.push("Option");
  if (parsed.metaKey) parts.push("Cmd");
  if (parsed.shiftKey) parts.push("Shift");
  if (parsed.key) {
    parts.push(parsed.key === "Space" ? "Spacebar" : parsed.key);
  }
  return parts.join(" + ");
}

function updateShortcutDisplay(container, shortcutId, shortcutText) {
  if (!container || !shortcutId || !shortcutText) return;
  var cell = container.querySelector('[data-shortcut-id="' + shortcutId + '"]');
  if (cell) {
    cell.textContent = shortcutText;
  }
}

function updateCustomShortcutDisplays(container, preferences) {
  if (!preferences) return;
  updateShortcutDisplay(container, "toggleShortcut", formatShortcutForDisplay(preferences.toggleShortcut));
  updateShortcutDisplay(
    container,
    "quickDrawShortcut",
    formatShortcutForDisplay(preferences.quickDrawShortcut) + " + Drag"
  );
}

function updateShortcutInput(container, inputId, shortcut) {
  var input = container.querySelector("#" + inputId);
  if (!input) return;
  input.value = formatShortcutForDisplay(shortcut);
  input.setAttribute("data-shortcut", shortcut);
  updateShortcutResetButtons(container, inputId);
}

function updateShortcutResetButtons(container, inputId) {
  var input = container.querySelector("#" + inputId);
  var buttons = container.querySelectorAll('[data-shortcut-input="' + inputId + '"]');
  for (var i = 0; i < buttons.length; i++) {
    var preferenceKey = buttons[i].getAttribute("data-shortcut-preference-key");
    buttons[i].disabled = !input || input.getAttribute("data-shortcut") === DEFAULT_PREFERENCES[preferenceKey];
  }
}

function setupShortcutInput(container, inputId, mode, onChange) {
  var input = container.querySelector("#" + inputId);
  if (!input) return;

  input.addEventListener("keydown", function(event) {
    var shortcut = shortcutFromEvent(event, mode);
    event.preventDefault();
    event.stopPropagation();

    if (!shortcut) {
      return;
    }

    updateShortcutInput(container, inputId, shortcut);
    if (onChange) {
      onChange(shortcut);
    }
  });
}

function setupShortcutResetButton(container, buttonId, inputId, preferenceKey, onChange) {
  var button = container.querySelector("#" + buttonId);
  if (!button) return;

  button.setAttribute("data-shortcut-input", inputId);
  button.setAttribute("data-shortcut-preference-key", preferenceKey);
  updateShortcutResetButtons(container, inputId);

  button.addEventListener("click", function(event) {
    var shortcut = DEFAULT_PREFERENCES[preferenceKey];
    event.preventDefault();
    updateShortcutInput(container, inputId, shortcut);
    if (onChange) {
      onChange(shortcut);
    }
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

// Shared preference defaults
var DEFAULT_PREFERENCES = {
  borderSize: "1",
  defaultColor: "",
  snapToEdges: true,
  toggleShortcut: "Alt+F",
  quickDrawShortcut: "Ctrl+Alt+Meta"
};
