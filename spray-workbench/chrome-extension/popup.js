import { captureDiagnosticMessage, normalizeRawPageCapture, sourceFromUrl } from "./item-rules.js";
import { prepareTranslator, translateDescriptions } from "./translation.js";

const page = document.querySelector("#page"); const status = document.querySelector("#status"); const button = document.querySelector("#capture");
let activeTab; let activeSource = "generic"; let pageLanguage = "und";

const captureFromContentScript = (tabId) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => finish(new Error("页面提取超时，请刷新当前页面后重试")), 12_000);
  const listener = (message, sender) => {
    if (message?.type !== "page-capture-result" || sender.tab?.id !== tabId) return;
    finish(message.error ? new Error(message.error) : undefined, message.payload);
  };
  const finish = (error, payload) => {
    clearTimeout(timeout); chrome.runtime.onMessage.removeListener(listener);
    error ? reject(error) : resolve(payload);
  };
  chrome.runtime.onMessage.addListener(listener);
  chrome.scripting.executeScript({ target: { tabId }, files: ["capture-page.js"] }).catch((error) => finish(error));
});

chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
  activeTab = tab; activeSource = sourceFromUrl(tab?.url); const valid = /^https?:/.test(tab?.url || "") && activeSource !== "generic";
  page.textContent = valid ? `${activeSource} · ${tab.title || tab.url}` : "请打开受支持平台的榜单或具体项目页面。";
  button.disabled = !valid;
  if (valid && tab.id) pageLanguage = await chrome.tabs.detectLanguage(tab.id).catch(() => "und");
}).catch(() => { page.textContent = "无法读取当前标签页。"; });

button.addEventListener("click", async () => {
  if (!activeTab?.id) return;
  button.disabled = true; status.textContent = "正在读取已加载的具体项目…";
  const translatorTask = prepareTranslator(pageLanguage, globalThis.Translator, (progress) => { status.textContent = `正在下载本机语言包 ${progress}%…`; });
  try {
    const rawCapture = await captureFromContentScript(activeTab.id);
    const extracted = normalizeRawPageCapture(rawCapture, activeSource);
    if (!extracted.items.length) throw new Error(captureDiagnosticMessage(extracted.diagnostics));
    const prepared = await translatorTask;
    const items = await translateDescriptions(extracted.items, prepared, (done, total) => { status.textContent = `正在本机翻译说明 ${done}/${total}…`; });
    const response = await chrome.runtime.sendMessage({ type: "submit-capture", payload: { pageUrl: extracted.pageUrl, pageTitle: extracted.pageTitle, items } });
    if (!response?.ok) throw new Error(response?.error || "提交失败");
    const unavailable = items.filter((item) => item.translationStatus === "unavailable" || item.translationStatus === "failed").length;
    status.textContent = `已识别 ${extracted.diagnostics.candidateLinks} 个候选，提交 ${response.itemCount} 条${unavailable ? `，${unavailable} 条保留原文` : "，说明已处理为中文"}。`;
  } catch (error) {
    status.textContent = `抓取失败：${error.message}`; button.disabled = false;
  }
});
