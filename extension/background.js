function handleInstalled(details) {
  if (!details || details.reason !== "install") {
    return;
  }

  console.log("Box Highlight extension installed");
}

if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(handleInstalled);
}
