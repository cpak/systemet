chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    console.debug(request, sender);
    return true;
});