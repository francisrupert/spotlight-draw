function handleTabsQuery(tabs) {
  if (!tabs || !tabs.length) {
    return;
  }

  var activeTab = tabs[0];

  if (!activeTab || !activeTab.id) {
    return;
  }

  chrome.tabs.sendMessage(activeTab.id, { type: "TOGGLE_BOX_HIGHLIGHT" });
}

function handleToggleClick() {
  if (!chrome.tabs || !chrome.tabs.query) {
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, handleTabsQuery);
}

function initializePopup() {
  var toggleButton = document.getElementById("popup-toggle-highlight");

  if (!toggleButton) {
    return;
  }

  toggleButton.addEventListener("click", handleToggleClick);
}

document.addEventListener("DOMContentLoaded", initializePopup);
