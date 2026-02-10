function handleInstalled(details) {
  if (!details || details.reason !== "install") {
    return;
  }

  console.log("Box Highlight extension installed");
}

function sendToggleMessage(tab) {
  if (!tab || !tab.id) {
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_BOX_HIGHLIGHT" });
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
