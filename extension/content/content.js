var boxHighlightEnabledClassName = "box-highlight--enabled";

function enableBoxHighlight() {
  if (!document.documentElement.classList.contains(boxHighlightEnabledClassName)) {
    document.documentElement.classList.add(boxHighlightEnabledClassName);
  }
}

function disableBoxHighlight() {
  if (document.documentElement.classList.contains(boxHighlightEnabledClassName)) {
    document.documentElement.classList.remove(boxHighlightEnabledClassName);
  }
}

function toggleBoxHighlight() {
  if (document.documentElement.classList.contains(boxHighlightEnabledClassName)) {
    disableBoxHighlight();
  } else {
    enableBoxHighlight();
  }
}

if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener(function handleMessage(message) {
    if (!message || message.type !== "TOGGLE_BOX_HIGHLIGHT") {
      return;
    }

    toggleBoxHighlight();
  });
}
