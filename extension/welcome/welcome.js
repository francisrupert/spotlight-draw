var shortcutDisplay = document.getElementById("shortcut-display");
if (shortcutDisplay) {
  shortcutDisplay.textContent = formatShortcutForDisplay(DEFAULT_PREFERENCES.toggleShortcut);
}

var openButton = document.getElementById("open-options");
if (openButton) {
  openButton.addEventListener("click", function() {
    chrome.runtime.openOptionsPage();
  });
}
