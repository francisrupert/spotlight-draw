// Save options to chrome.storage.sync
function saveOptions() {
  var borderSize = document.getElementById("borderSize").value;
  var defaultColor = document.getElementById("defaultColor").value;

  chrome.storage.sync.set({
    borderSize: borderSize,
    defaultColor: defaultColor
  }, function() {
    // Show success message
    var status = document.getElementById("status");
    status.textContent = "Settings saved successfully!";
    status.className = "show success";

    setTimeout(function() {
      status.className = "";
    }, 3000);
  });
}

// Load saved options from chrome.storage.sync
function loadOptions() {
  chrome.storage.sync.get({
    borderSize: "1",     // default values
    defaultColor: ""
  }, function(items) {
    document.getElementById("borderSize").value = items.borderSize;
    document.getElementById("defaultColor").value = items.defaultColor;
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", loadOptions);
document.getElementById("save").addEventListener("click", saveOptions);
