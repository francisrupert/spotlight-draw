// Save options to chrome.storage.sync
function saveOptions() {
  // Get selected border size from active button
  var borderSizeGroup = document.getElementById("borderSize");
  var activeBorderButton = borderSizeGroup.querySelector(".button-group-item.active");
  var borderSize = activeBorderButton ? activeBorderButton.getAttribute("data-value") : "1";

  // Get selected color from active button
  var colorGroup = document.getElementById("defaultColor");
  var activeColorButton = colorGroup.querySelector(".button-group-item.active");
  var defaultColor = activeColorButton ? activeColorButton.getAttribute("data-value") : "";

  // Get checkbox value
  var snapToEdges = document.getElementById("snapToEdges").checked;

  var toggleInput = document.getElementById("toggleShortcut");
  var quickDrawInput = document.getElementById("quickDrawShortcut");

  chrome.storage.sync.set({
    borderSize: borderSize,
    defaultColor: defaultColor,
    snapToEdges: snapToEdges,
    toggleShortcut: toggleInput.getAttribute("data-shortcut") || DEFAULT_PREFERENCES.toggleShortcut,
    quickDrawShortcut: quickDrawInput.getAttribute("data-shortcut") || DEFAULT_PREFERENCES.quickDrawShortcut
  });
}

// Load saved options from chrome.storage.sync
function loadOptions() {
  chrome.storage.sync.get(DEFAULT_PREFERENCES, function(items) {
    // Set active border size button
    var borderButtons = document.querySelectorAll("#borderSize .button-group-item");
    borderButtons.forEach(function(button) {
      if (button.getAttribute("data-value") === items.borderSize) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });

    // Set active color button
    var colorButtons = document.querySelectorAll("#defaultColor .button-group-item");
    colorButtons.forEach(function(button) {
      if (button.getAttribute("data-value") === items.defaultColor) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });

    // Set checkbox value
    document.getElementById("snapToEdges").checked = items.snapToEdges;

    updateShortcutInput(document, "toggleShortcut", items.toggleShortcut);
    updateShortcutInput(document, "quickDrawShortcut", items.quickDrawShortcut);

    updateCustomShortcutDisplays(document, items);
  });
}

// Setup button groups using shared helper with auto-save

function getShortcutPreferencesFromInputs() {
  var toggleInput = document.getElementById("toggleShortcut");
  var quickDrawInput = document.getElementById("quickDrawShortcut");
  return {
    toggleShortcut: toggleInput.getAttribute("data-shortcut") || DEFAULT_PREFERENCES.toggleShortcut,
    quickDrawShortcut: quickDrawInput.getAttribute("data-shortcut") || DEFAULT_PREFERENCES.quickDrawShortcut
  };
}

function saveShortcutOption(key, value) {
  var settings = {};
  settings[key] = value;
  chrome.storage.sync.set(settings);

  updateShortcutInput(document, key, value);
  updateCustomShortcutDisplays(document, getShortcutPreferencesFromInputs());
}

// Render keyboard shortcuts using shared renderer
function renderShortcuts() {
  var container = document.getElementById("shortcuts-container");
  renderShortcutsInto(container, "h2", "shortcuts-section");
  chrome.storage.sync.get(DEFAULT_PREFERENCES, function(items) {
    updateCustomShortcutDisplays(container, items);
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", function() {
  loadOptions();
  setupButtonGroup(document, "borderSize", function() { saveOptions(); });
  setupButtonGroup(document, "defaultColor", function() { saveOptions(); });

  // Add event listener for checkbox with auto-save
  document.getElementById("snapToEdges").addEventListener("change", saveOptions);
  setupShortcutInput(document, "toggleShortcut", "keyboard", function(shortcut) {
    saveShortcutOption("toggleShortcut", shortcut);
  });
  setupShortcutInput(document, "quickDrawShortcut", "modifiers", function(shortcut) {
    saveShortcutOption("quickDrawShortcut", shortcut);
  });
  setupShortcutResetButton(document, "resetToggleShortcut", "toggleShortcut", "toggleShortcut", function(shortcut) {
    saveShortcutOption("toggleShortcut", shortcut);
  });
  setupShortcutResetButton(document, "resetQuickDrawShortcut", "quickDrawShortcut", "quickDrawShortcut", function(shortcut) {
    saveShortcutOption("quickDrawShortcut", shortcut);
  });

  // Render shortcuts
  renderShortcuts();
});
