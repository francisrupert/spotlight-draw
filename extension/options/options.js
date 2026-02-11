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

  chrome.storage.sync.set({
    borderSize: borderSize,
    defaultColor: defaultColor
  });
}

// Load saved options from chrome.storage.sync
function loadOptions() {
  chrome.storage.sync.get({
    borderSize: "1",     // default values
    defaultColor: ""
  }, function(items) {
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
  });
}

// Handle button group clicks with auto-save
function setupButtonGroup(groupId) {
  var group = document.getElementById(groupId);
  var buttons = group.querySelectorAll(".button-group-item");

  buttons.forEach(function(button) {
    button.addEventListener("click", function() {
      // Remove active from all buttons in this group
      buttons.forEach(function(btn) {
        btn.classList.remove("active");
      });
      // Add active to clicked button
      button.classList.add("active");

      // Auto-save on change
      saveOptions();
    });
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", function() {
  loadOptions();
  setupButtonGroup("borderSize");
  setupButtonGroup("defaultColor");
});
