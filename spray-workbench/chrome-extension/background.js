chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "submit-capture") return undefined;
  fetch("http://127.0.0.1:3456/api/browser/extension-captures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message.payload),
  }).then(async (response) => sendResponse(await response.json()))
    .catch((error) => sendResponse({ ok: false, error: `本地服务不可用：${error.message}` }));
  return true;
});
