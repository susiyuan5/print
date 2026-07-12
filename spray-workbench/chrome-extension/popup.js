import { ITEM_RULES, canonicalItemUrl, sourceFromUrl } from "./item-rules.js";
import { prepareTranslator, translateDescriptions } from "./translation.js";

const page = document.querySelector("#page"); const status = document.querySelector("#status"); const button = document.querySelector("#capture");
let activeTab; let activeSource = "generic"; let pageLanguage = "und";

const extractSpecificItems = (rule, source) => {
  const pricePattern = /(?:CA\$|US\$|\$|£|€)\s?\d+(?:[.,]\d+)?/;
  const compact = (value = "") => value.replace(/\s+/g, " ").trim();
  const absoluteHttpUrl = (value) => { try { const url = new URL(value, location.href); return /^https?:$/.test(url.protocol) ? url.href : undefined; } catch { return undefined; } };
  const specificUrl = (value) => {
    try {
      const url = new URL(value, location.href); const host = url.hostname.toLowerCase().replace(/^www\./, ""); const path = decodeURIComponent(url.pathname);
      if (!rule || !rule.hosts.some((part) => host.includes(part)) || !rule.paths.some((pattern) => new RegExp(pattern, "i").test(path))) return undefined;
      url.hash = ""; url.search = ""; return url.toString().replace(/\/$/, "");
    } catch { return undefined; }
  };
  const usableImage = (value) => { const url = absoluteHttpUrl(value); return url && !/(?:placeholder|transparent|spacer|blank|pixel)(?:[._/-]|$)/i.test(url) ? url : undefined; };
  const srcsetUrls = (value = "") => value.split(",").map((part) => part.trim().split(/\s+/)[0]).map(usableImage).filter(Boolean).reverse();
  const imageFrom = (root) => {
    if (!root) return undefined;
    const images = [...(root.querySelectorAll?.("img") ?? [])]; const sources = [...(root.querySelectorAll?.("picture source") ?? [])];
    for (const image of images) {
      const candidates = [image.currentSrc, ...srcsetUrls(image.getAttribute("data-srcset")), ...srcsetUrls(image.getAttribute("srcset")), image.getAttribute("data-original"), image.getAttribute("data-src"), image.getAttribute("data-lazy-src"), image.getAttribute("src")];
      const candidate = candidates.map(usableImage).find(Boolean); if (candidate) return candidate;
    }
    for (const entry of sources) { const candidate = [...srcsetUrls(entry.getAttribute("srcset")), ...srcsetUrls(entry.getAttribute("data-srcset"))][0]; if (candidate) return candidate; }
    for (const element of [root, ...(root.querySelectorAll?.("[style]") ?? [])].slice(0, 30)) {
      const background = getComputedStyle(element).backgroundImage.match(/url\(["']?(.+?)["']?\)/)?.[1]; const candidate = usableImage(background); if (candidate) return candidate;
    }
    return undefined;
  };
  const cardFor = (link) => {
    let current = link; let best = link;
    for (let depth = 0; current && depth < 7; depth += 1, current = current.parentElement) {
      const projectUrls = new Set([...current.querySelectorAll("a[href]")].map((entry) => specificUrl(entry.href)).filter(Boolean));
      const text = compact(current.innerText || "");
      if (projectUrls.size > 1 || text.length > 1_500) break;
      if (projectUrls.size === 1) best = current;
    }
    return best;
  };
  const detailsItem = () => {
    const currentUrl = specificUrl(location.href); if (!currentUrl) return undefined;
    const meta = (selector) => compact(document.querySelector(selector)?.content || "");
    const canonical = specificUrl(document.querySelector("link[rel='canonical']")?.href) || currentUrl;
    const title = meta("meta[property='og:title']") || compact(document.querySelector("h1")?.innerText || document.title).slice(0, 160);
    const description = (meta("meta[property='og:description']") || meta("meta[name='description']")).slice(0, 300) || undefined;
    const imageUrl = usableImage(meta("meta[property='og:image']") || meta("meta[name='twitter:image']")) || imageFrom(document.querySelector("main") || document.body);
    const priceText = meta("meta[property='product:price:amount']") || compact(document.body.innerText).match(pricePattern)?.[0];
    return title ? { title, url: canonical, imageUrl, priceText, description, source } : undefined;
  };
  const candidates = [...document.querySelectorAll("a[href]")].map((link) => ({ link, url: specificUrl(link.href) })).filter((entry) => entry.url);
  const byUrl = new Map();
  for (const { link, url } of candidates) {
    const card = cardFor(link); const imageUrl = imageFrom(link) || imageFrom(card);
    const linkText = compact(link.innerText || ""); const imageAlt = compact((link.querySelector("img") || card.querySelector("img"))?.alt || "");
    const title = compact(card.querySelector("h1,h2,h3,h4,h5,h6")?.innerText || link.getAttribute("aria-label") || imageAlt || linkText.split(/\r?\n/)[0]).slice(0, 160);
    const nearby = compact(card.innerText || linkText); const priceText = nearby.match(pricePattern)?.[0];
    const description = compact(nearby.replace(title, "").replace(priceText || "", "")).slice(0, 300) || undefined;
    if (!title) continue;
    const item = { title, url, imageUrl, priceText, description, source }; const previous = byUrl.get(url);
    const score = (value) => (value.imageUrl ? 1_000 : 0) + (value.description?.length ?? 0);
    if (!previous || score(item) > score(previous)) byUrl.set(url, item);
  }
  const detail = detailsItem(); if (detail) byUrl.set(detail.url, detail);
  return { pageUrl: location.href, pageTitle: document.title, items: [...byUrl.values()].slice(0, 100) };
};

chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
  activeTab = tab; activeSource = sourceFromUrl(tab?.url); const valid = /^https?:/.test(tab?.url || "") && activeSource !== "generic";
  page.textContent = valid ? `${activeSource} · ${tab.title || tab.url}` : "请打开受支持平台的榜单或具体项目页面。";
  button.disabled = !valid;
  if (valid && tab.id) pageLanguage = await chrome.tabs.detectLanguage(tab.id).catch(() => "und");
}).catch(() => { page.textContent = "无法读取当前标签页。"; });

button.addEventListener("click", async () => {
  if (!activeTab?.id) return;
  button.disabled = true; status.textContent = "正在准备本机中文翻译…";
  const translatorTask = prepareTranslator(pageLanguage, globalThis.Translator, (progress) => { status.textContent = `正在下载本机语言包 ${progress}%…`; });
  try {
    const [result] = await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, func: extractSpecificItems, args: [ITEM_RULES[activeSource], activeSource] });
    const extracted = result.result;
    if (!extracted?.items?.length) throw new Error("本页未识别到具体项目，请进入模型榜单或单个项目详情页后重试");
    const prepared = await translatorTask;
    const items = await translateDescriptions(extracted.items, prepared, (done, total) => { status.textContent = `正在本机翻译说明 ${done}/${total}…`; });
    const response = await chrome.runtime.sendMessage({ type: "submit-capture", payload: { ...extracted, items } });
    if (!response?.ok) throw new Error(response?.error || "提交失败");
    const unavailable = items.filter((item) => item.translationStatus === "unavailable" || item.translationStatus === "failed").length;
    status.textContent = `已提交 ${response.itemCount} 条${unavailable ? `，${unavailable} 条保留原文` : "，说明已处理为中文"}。回到趋势雷达查看预览。`;
  } catch (error) {
    status.textContent = `抓取失败：${error.message}`; button.disabled = false;
  }
});
