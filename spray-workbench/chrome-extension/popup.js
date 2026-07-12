const page = document.querySelector("#page"); const status = document.querySelector("#status"); const button = document.querySelector("#capture");
let activeTab;
const sourceName = (url = "") => ["cults3d", "printables", "makerworld", "thingiverse", "myminifactory", "etsy", "amazon", "tiktok", "instagram"].find((name) => new URL(url).hostname.includes(name)) ?? "其他网站";
const extractVisibleItems = () => {
  const pricePattern = /(?:CA\$|US\$|\$|£|€)\s?\d+(?:[.,]\d+)?/;
  const raw = [...document.querySelectorAll("a[href]")].map((link) => { const text = (link.innerText || link.getAttribute("aria-label") || "").trim(); const image = link.querySelector("img"); const nearby = link.parentElement?.innerText || ""; return { title: text.slice(0, 160), url: link.href, imageUrl: image?.currentSrc || image?.src, priceText: nearby.match(pricePattern)?.[0] }; }).filter((item) => item.title && /^https?:/.test(item.url));
  return { pageUrl: location.href, pageTitle: document.title, items: [...new Map(raw.map((item) => [item.url, item])).values()].slice(0, 100) };
};
chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => { activeTab = tab; const valid = /^https?:/.test(tab?.url || ""); page.textContent = valid ? `${sourceName(tab.url)} · ${tab.title || tab.url}` : "请打开一个公网网页后再使用扩展。"; button.disabled = !valid; }).catch(() => { page.textContent = "无法读取当前标签页。"; });
button.addEventListener("click", async () => { if (!activeTab?.id) return; button.disabled = true; status.textContent = "正在读取当前页可见内容…"; try { const [result] = await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, func: extractVisibleItems }); const response = await chrome.runtime.sendMessage({ type: "submit-capture", payload: result.result }); if (!response?.ok) throw new Error(response?.error || "提交失败"); status.textContent = `已提交 ${response.itemCount} 条，回到趋势雷达查看待确认抓取。`; } catch (error) { status.textContent = `提交失败：${error.message}`; button.disabled = false; } });
