import { captureDiagnosticMessage, normalizeRawPageCapture, sourceFromUrl } from "./item-rules.js";
import { prepareTranslator, translateDescriptions } from "./translation.js";

const page = document.querySelector("#page"); const status = document.querySelector("#status"); const button = document.querySelector("#capture");
let activeTab; let activeSource = "generic"; let pageLanguage = "und";

const captureFromContentScript = (tabId) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => finish(new Error("页面加载 100 条项目超时，请确认网络正常后重试")), 45_000);
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

const loadProductDescriptions = async (items) => {
  const response = await chrome.runtime.sendMessage({ type: "load-detail-descriptions", urls: items.map((item) => item.url) }).catch(() => undefined);
  return response?.ok && Array.isArray(response.results) ? response.results : [];
};

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
    status.textContent = `正在读取 ${extracted.items.length} 个产品详情页的 Description…`;
    const descriptionResults = await loadProductDescriptions(extracted.items);
    const descriptions = new Map(descriptionResults.filter((result) => result?.description).map((result) => [result.url, result.description]));
    const detailedItems = extracted.items.map(({ description: _cardText, ...item }) => ({ ...item, description: descriptions.get(item.url), descriptionReadStatus: descriptions.has(item.url) ? "success" : "failed" }));
    const prepared = await translatorTask;
    const items = await translateDescriptions(detailedItems, prepared, (done, total) => { status.textContent = `正在本机翻译说明 ${done}/${total}…`; });
    const response = await chrome.runtime.sendMessage({ type: "submit-capture", payload: { pageUrl: extracted.pageUrl, pageTitle: extracted.pageTitle, items } });
    if (!response?.ok) throw new Error(response?.error || "提交失败");
    const unavailable = items.filter((item) => item.translationStatus === "unavailable" || item.translationStatus === "failed").length;
    const missing = items.length - descriptions.size;
    status.textContent = `提交 ${response.itemCount} 条，其中 ${descriptions.size} 条读取并处理了产品 Description${missing ? `，${missing} 条详情读取失败` : ""}${unavailable ? `，${unavailable} 条翻译时保留原文` : ""}。`;
  } catch (error) {
    status.textContent = `抓取失败：${error.message}`; button.disabled = false;
  }
});
