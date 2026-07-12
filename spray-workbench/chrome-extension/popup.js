const page = document.querySelector("#page"); const status = document.querySelector("#status"); const button = document.querySelector("#capture");
let activeTab;
const sourceName = (url = "") => ["cults3d", "printables", "makerworld", "thingiverse", "myminifactory", "etsy", "amazon", "tiktok", "instagram"].find((name) => new URL(url).hostname.includes(name)) ?? "其他网站";
const extractVisibleItems = () => {
  const pricePattern = /(?:CA\$|US\$|\$|£|€)\s?\d+(?:[.,]\d+)?/;
  const compact = (value = "") => value.replace(/\s+/g, " ").trim();
  const absoluteHttpUrl = (value) => { try { const url = new URL(value, location.href); return /^https?:$/.test(url.protocol) ? url.href : undefined; } catch { return undefined; } };
  const imageSource = (image) => {
    if (!image) return undefined;
    const srcset = image.getAttribute("srcset")?.split(",")[0]?.trim().split(/\s+/)[0];
    return [image.currentSrc, image.getAttribute("data-src"), image.getAttribute("data-lazy-src"), image.getAttribute("data-original"), image.getAttribute("src"), srcset].map(absoluteHttpUrl).find(Boolean);
  };
  const cardContainer = (link) => {
    const semantic = link.closest("article, li, [data-testid*='card'], [class*='product-card'], [class*='model-card'], [class*='listing-card']");
    if (semantic && compact(semantic.innerText || "").length <= 1_000) return semantic;
    let current = link.parentElement; let best = link;
    for (let depth = 0; current && depth < 4; depth += 1, current = current.parentElement) {
      const text = compact(current.innerText || "");
      if (text.length > 1_000 || current.querySelectorAll("a[href]").length > 4) break;
      if (text) best = current;
    }
    return best;
  };
  const raw = [...document.querySelectorAll("a[href]")].map((link) => {
    const card = cardContainer(link); const image = link.querySelector("img") || card.querySelector?.("img");
    const linkText = compact(link.innerText || "");
    const heading = compact(link.querySelector("h1,h2,h3,h4,h5,h6")?.innerText || "");
    const firstLine = compact((link.innerText || "").split(/\r?\n/).find((line) => line.trim()) || "");
    const title = compact(link.getAttribute("aria-label") || heading || image?.getAttribute("alt") || firstLine || linkText).slice(0, 160);
    const nearby = compact(card.innerText || linkText); const priceText = nearby.match(pricePattern)?.[0];
    const description = compact(nearby.replace(title, "").replace(priceText || "", "")).slice(0, 300) || undefined;
    return { title, url: link.href, imageUrl: imageSource(image), priceText, description };
  }).filter((item) => item.title && /^https?:/.test(item.url));
  return { pageUrl: location.href, pageTitle: document.title, items: [...new Map(raw.map((item) => [item.url, item])).values()].slice(0, 100) };
};
chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => { activeTab = tab; const valid = /^https?:/.test(tab?.url || ""); page.textContent = valid ? `${sourceName(tab.url)} · ${tab.title || tab.url}` : "请打开一个公网网页后再使用扩展。"; button.disabled = !valid; }).catch(() => { page.textContent = "无法读取当前标签页。"; });
button.addEventListener("click", async () => { if (!activeTab?.id) return; button.disabled = true; status.textContent = "正在读取当前页可见内容…"; try { const [result] = await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, func: extractVisibleItems }); const response = await chrome.runtime.sendMessage({ type: "submit-capture", payload: result.result }); if (!response?.ok) throw new Error(response?.error || "提交失败"); status.textContent = `已提交 ${response.itemCount} 条，回到趋势雷达查看待确认抓取。`; } catch (error) { status.textContent = `提交失败：${error.message}`; button.disabled = false; } });
