function handleInstalled(details) {
  if (!details || !details.reason) return;

  if (details.reason === "install") {
    console.log("SpotlightDraw extension installed");
    chrome.tabs.create({ url: "welcome/welcome.html" });
  }
}

function sendToggleMessage(tab) {
  if (!tab || !tab.id) {
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_BOX_HIGHLIGHT" })
    .catch(function() {
      // Content scripts are unavailable on restricted Chrome pages.
    });
}

if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(handleInstalled);
}

if (typeof chrome !== "undefined" && chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(function(tab) {
    sendToggleMessage(tab);
  });
}
