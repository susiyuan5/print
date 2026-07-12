const SUPPORTED_DETAIL_HOSTS = ["cults3d.com", "printables.com", "makerworld.com", "thingiverse.com", "myminifactory.com", "etsy.com", "amazon.com", "amazon.ca", "tiktok.com", "instagram.com"];
const compact = (value = "") => String(value).replace(/\s+/g, " ").trim();

function extractDetailInPage() {
  const tidy = (value = "") => String(value).replace(/\s+/g, " ").trim();
  const labels = new Set(["description", "描述", "说明", "商品描述", "item description", "about this item"]);
  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading']")];
  const heading = headings.find((element) => labels.has(tidy(element.textContent).toLowerCase()));
  let description;
  if (heading?.nextElementSibling) {
    const text = tidy(heading.nextElementSibling.textContent);
    if (text) description = text.slice(0, 2_000);
  }
  if (!description && heading?.parentElement) {
    const headingText = tidy(heading.textContent);
    const text = tidy(heading.parentElement.textContent).slice(headingText.length).trim();
    if (text) description = text.slice(0, 2_000);
  }
  if (!description) {
    const platform = document.querySelector("[data-testid*='description'], [data-product-details-description-text-content], [class*='description-content'], #description");
    const platformText = tidy(platform?.textContent); if (platformText) description = platformText.slice(0, 2_000);
  }
  const imageUrl = document.querySelector("meta[property='og:image']")?.content || document.querySelector("meta[name='twitter:image']")?.content || undefined;
  return { description, imageUrl };
}

const safeDetailUrl = (value) => {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return url.protocol === "https:" && SUPPORTED_DETAIL_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)) ? url.href : undefined;
  } catch { return undefined; }
};

const safeDetailImage = (value, detailUrl) => {
  try { const image = new URL(value, detailUrl); const detail = new URL(detailUrl); return image.protocol === "https:" && image.href !== detail.href ? image.href : undefined; } catch { return undefined; }
};

const waitForLoaded = async (tabId, timeoutMs = 25_000) => {
  const current = await chrome.tabs.get(tabId).catch(() => undefined);
  if (current?.status === "complete") return;
  await new Promise((resolve) => {
    const timeout = setTimeout(() => finish(), timeoutMs);
    const listener = (changedId, changeInfo) => { if (changedId === tabId && changeInfo.status === "complete") finish(); };
    const finish = () => { clearTimeout(timeout); chrome.tabs.onUpdated.removeListener(listener); resolve(); };
    chrome.tabs.onUpdated.addListener(listener);
  });
};

const readOneDescription = async (url) => {
  const safeUrl = safeDetailUrl(url);
  if (!safeUrl) return { url, error: "不支持的详情地址" };
  let tabId;
  try {
    const tab = await chrome.tabs.create({ url: safeUrl, active: false });
    tabId = tab.id;
    if (!tabId) throw new Error("无法创建后台标签页");
    await waitForLoaded(tabId);
    const deadline = Date.now() + 18_000; let lastImageUrl;
    while (Date.now() < deadline) {
      const [{ result } = {}] = await chrome.scripting.executeScript({ target: { tabId }, func: extractDetailInPage }).catch(() => []);
      const description = compact(result?.description); lastImageUrl = safeDetailImage(result?.imageUrl, safeUrl) || lastImageUrl;
      if (description) return { url, description, imageUrl: lastImageUrl };
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return { url, imageUrl: lastImageUrl, error: "详情页没有读取到 Description" };
  } catch (error) {
    return { url, error: error instanceof Error ? error.message : String(error) };
  } finally {
    if (tabId) await chrome.tabs.remove(tabId).catch(() => undefined);
  }
};

const loadDetailDescriptions = async (urls) => {
  const unique = [...new Set((Array.isArray(urls) ? urls : []).map(safeDetailUrl).filter(Boolean))].slice(0, 100);
  const results = new Array(unique.length); let cursor = 0;
  const workers = Array.from({ length: Math.min(3, unique.length) }, async () => {
    while (cursor < unique.length) { const index = cursor++; results[index] = await readOneDescription(unique[index]); }
  });
  await Promise.all(workers);
  return results;
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "load-detail-descriptions") {
    loadDetailDescriptions(message.urls).then((results) => sendResponse({ ok: true, results }))
      .catch((error) => sendResponse({ ok: false, error: error.message, results: [] }));
    return true;
  }
  if (message?.type !== "submit-capture") return undefined;
  fetch("http://127.0.0.1:3456/api/browser/extension-captures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message.payload),
  }).then(async (response) => sendResponse(await response.json()))
    .catch((error) => sendResponse({ ok: false, error: `本地服务不可用：${error.message}` }));
  return true;
});
