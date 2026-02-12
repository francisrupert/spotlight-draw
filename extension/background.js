function checkShortcutStatus() {
  if (!chrome.commands || !chrome.commands.getAll) return;

  chrome.commands.getAll(function(commands) {
    var toggleCommand = null;
    for (var i = 0; i < commands.length; i++) {
      if (commands[i].name === "toggle-drawing-mode") {
        toggleCommand = commands[i];
        break;
      }
    }

    if (!toggleCommand || !toggleCommand.shortcut) {
      // No shortcut set — warn the user
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#E67700" });
      chrome.action.setTitle({
        title: "SpotlightDraw - No shortcut set! Click to draw, or set one in chrome://extensions/shortcuts"
      });
    } else {
      // Shortcut is configured — clear badge, show shortcut in tooltip
      chrome.action.setBadgeText({ text: "" });
      chrome.action.setTitle({
        title: "SpotlightDraw - Toggle drawing mode (" + toggleCommand.shortcut + ")"
      });
    }
  });
}

function handleInstalled(details) {
  if (!details || !details.reason) return;

  if (details.reason === "install") {
    console.log("SpotlightDraw extension installed");
    chrome.tabs.create({ url: "welcome/welcome.html" });
  }

  checkShortcutStatus();
}

function sendToggleMessage(tab) {
  if (!tab || !tab.id) {
    return;
  }

  // Use promise .catch() for Manifest V3
  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_BOX_HIGHLIGHT" })
    .catch(function() {
      // Silently ignore errors (e.g., content script not loaded on restricted pages)
    });
}

function handleCommand(command) {
  if (command !== "toggle-drawing-mode") {
    return;
  }

  // Send toggle message to the active tab
  if (chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs && tabs.length > 0) {
        sendToggleMessage(tabs[0]);
      }
    });
  }
}

if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(handleInstalled);
}

if (typeof chrome !== "undefined" && chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener(handleCommand);
}

if (typeof chrome !== "undefined" && chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(function(tab) {
    sendToggleMessage(tab);
  });
}

if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message && message.type === "GET_SHORTCUT") {
      if (chrome.commands && chrome.commands.getAll) {
        chrome.commands.getAll(function(commands) {
          var shortcut = "";
          for (var i = 0; i < commands.length; i++) {
            if (commands[i].name === "toggle-drawing-mode") {
              shortcut = commands[i].shortcut || "";
              break;
            }
          }
          sendResponse({ shortcut: shortcut });
        });
        return true; // async sendResponse
      }
      sendResponse({ shortcut: "" });
    }
  });
}

// Check shortcut status on service worker startup
checkShortcutStatus();
