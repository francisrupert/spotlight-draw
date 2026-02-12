// Display actual configured shortcut
if (chrome.commands && chrome.commands.getAll) {
  chrome.commands.getAll(function(commands) {
    for (var i = 0; i < commands.length; i++) {
      if (commands[i].name === "toggle-drawing-mode" && commands[i].shortcut) {
        var el = document.getElementById("shortcut-display");
        if (el) {
          el.textContent = commands[i].shortcut;
        }
        break;
      }
    }
  });
}

// Open shortcut settings button
var openButton = document.getElementById("open-shortcuts");
if (openButton) {
  openButton.addEventListener("click", function() {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  });
}
