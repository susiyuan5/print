void (async () => {
  try {
    const pricePattern = /(?:CA\$|US\$|\$|£|€)\s?\d+(?:[.,]\d+)?/;
    const compact = (value = "") => value.replace(/\s+/g, " ").trim();
    const host = location.hostname.toLowerCase().replace(/^www\./, ""); const makerWorld = host.includes("makerworld.com"); const printables = host.includes("printables.com"); const cults3d = host.includes("cults3d.com");
    const deadline = Date.now() + 8_000;
    while (makerWorld && !document.querySelector(".js-design-card") && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 250));
    const timedOut = makerWorld && !document.querySelector(".js-design-card");
    const absoluteHttpUrl = (value) => { try { const url = new URL(value, location.href); return /^https?:$/.test(url.protocol) ? url.href : undefined; } catch { return undefined; } };
    const usableImage = (value) => { const url = absoluteHttpUrl(value); return url && !/(?:placeholder|transparent|spacer|blank|pixel)(?:[._/-]|$)/i.test(url) ? url : undefined; };
    const srcsetUrls = (value) => String(value ?? "").split(",").map((part) => part.trim().split(/\s+/)[0]).map(usableImage).filter(Boolean).reverse();
    const imageFrom = (root) => {
      if (!root) return undefined;
      for (const image of root.matches?.("img") ? [root] : [...(root.querySelectorAll?.("img") ?? [])]) {
        const candidates = [image.currentSrc, ...srcsetUrls(image.getAttribute("data-srcset")), ...srcsetUrls(image.getAttribute("srcset")), image.getAttribute("data-original"), image.getAttribute("data-original-src"), image.getAttribute("data-src"), image.getAttribute("data-lazy-src"), image.getAttribute("data-lazy"), image.getAttribute("data-url"), image.getAttribute("poster"), image.getAttribute("src")];
        const candidate = candidates.map(usableImage).find(Boolean); if (candidate) return candidate;
      }
      for (const entry of root.querySelectorAll?.("picture source") ?? []) { const candidate = [...srcsetUrls(entry.getAttribute("srcset")), ...srcsetUrls(entry.getAttribute("data-srcset"))][0]; if (candidate) return candidate; }
      for (const element of [root, ...(root.querySelectorAll?.("[style]") ?? [])].slice(0, 30)) {
        const background = getComputedStyle(element).backgroundImage.match(/url\(["']?(.+?)["']?\)/)?.[1]; const candidate = usableImage(background); if (candidate) return candidate;
      }
      for (const element of [root, ...(root.querySelectorAll?.("[data-bg], [data-background], [data-background-image]") ?? [])].slice(0, 30)) {
        const candidate = [element.getAttribute?.("data-bg"), element.getAttribute?.("data-background"), element.getAttribute?.("data-background-image")].map(usableImage).find(Boolean); if (candidate) return candidate;
      }
      for (const noscript of root.querySelectorAll?.("noscript") ?? []) { const candidate = usableImage((noscript.textContent || "").match(/(?:src|data-src)=["']([^"']+)/i)?.[1]); if (candidate) return candidate; }
      return undefined;
    };
    const cardFor = (link) => {
      if (makerWorld) return link.closest(".js-design-card") || link.closest(".card-wrapper") || link.parentElement || link;
      const semantic = cults3d ? link.closest("article, [class*='card'], [class*='creation'], [class*='design']") : link.closest("article, li, [data-testid*='card'], [class*='product-card'], [class*='model-card'], [class*='listing-card']");
      if (semantic?.querySelector("img, picture, [data-bg], [data-background], [style*='background']")) return semantic;
      let current = semantic || link.parentElement; let best = semantic || link;
      for (let depth = 0; current && depth < 7; depth += 1, current = current.parentElement) {
        const text = compact(current.innerText || ""); if (text.length > 1_500 || current.querySelectorAll("a[href]").length > 6) break;
        if (text || current.querySelector("img, picture, [data-bg], [data-background], [style*='background']")) best = current;
        if (text && current.querySelector("img, picture, [data-bg], [data-background], [style*='background']")) break;
      }
      return best;
    };
    const itemSnapshots = new Map(); const allLinkUrls = new Set();
    const collectVisibleItems = () => {
      for (const link of document.querySelectorAll("a[href]")) {
        let url;
        try { const parsed = new URL(link.href, location.href); if (parsed.hostname.toLowerCase().replace(/^www\./, "") !== host || !/^https?:$/.test(parsed.protocol)) continue; parsed.hash = ""; parsed.search = ""; url = parsed.href; } catch { continue; }
        allLinkUrls.add(url);
        const card = cardFor(link); const image = link.querySelector("img") || card.querySelector("img");
        const linkText = compact(link.innerText || ""); const makerTitle = makerWorld ? compact(card.querySelector(".translated-text")?.innerText || "") : "";
        const title = compact(makerTitle || card.querySelector("h1,h2,h3,h4,h5,h6")?.innerText || link.getAttribute("aria-label") || image?.alt || linkText.split(/\r?\n/)[0]).slice(0, 160);
        const nearby = compact(card.innerText || linkText); const priceText = nearby.match(pricePattern)?.[0];
        const description = compact(nearby.replace(title, "").replace(priceText || "", "")).slice(0, 300) || undefined;
        const incoming = { title, url, imageUrl: imageFrom(link) || imageFrom(card), priceText, description }; const existing = itemSnapshots.get(url);
        if (!existing) itemSnapshots.set(url, incoming);
        else { if (incoming.title.length > existing.title.length) existing.title = incoming.title; existing.imageUrl ||= incoming.imageUrl; existing.priceText ||= incoming.priceText; if ((incoming.description?.length ?? 0) > (existing.description?.length ?? 0)) existing.description = incoming.description; }
      }
    };
    const printablesSnapshotCount = () => [...itemSnapshots.keys()].filter((value) => { try { return /^\/model\/\d+(?:-[^/]+)?\/?$/i.test(new URL(value).pathname); } catch { return false; } }).length;
    collectVisibleItems();
    if (printables && printablesSnapshotCount() < 100) {
      const originalScrollY = window.scrollY; window.scrollTo({ top: 0, behavior: "instant" }); await new Promise((resolve) => setTimeout(resolve, 500)); collectVisibleItems();
      let previousCount = printablesSnapshotCount(); let stableRounds = 0;
      for (let round = 0; round < 60 && previousCount < 100 && stableRounds < 7; round += 1) {
        const before = window.scrollY; window.scrollBy({ top: Math.max(window.innerHeight * .85, 600), behavior: "instant" });
        if (window.scrollY === before) window.scrollTo({ top: document.scrollingElement?.scrollHeight ?? document.body.scrollHeight, behavior: "instant" });
        await new Promise((resolve) => setTimeout(resolve, 500)); collectVisibleItems();
        const currentCount = printablesSnapshotCount(); stableRounds = currentCount > previousCount ? 0 : stableRounds + 1; previousCount = currentCount;
      }
      window.scrollTo({ top: originalScrollY, behavior: "instant" });
    }
    const items = [...itemSnapshots.values()];
    const meta = (selector) => compact(document.querySelector(selector)?.content || "");
    items.push({ title: meta("meta[property='og:title']") || compact(document.querySelector("h1")?.innerText || document.title).slice(0, 160), url: document.querySelector("link[rel='canonical']")?.href || location.href, imageUrl: usableImage(meta("meta[property='og:image']") || meta("meta[name='twitter:image']")), priceText: meta("meta[property='product:price:amount']") || undefined, description: (meta("meta[property='og:description']") || meta("meta[name='description']")).slice(0, 300) || undefined });
    await chrome.runtime.sendMessage({ type: "page-capture-result", payload: { pageUrl: location.href, pageTitle: document.title, totalLinks: allLinkUrls.size, timedOut, items } });
  } catch (error) {
    await chrome.runtime.sendMessage({ type: "page-capture-result", error: error instanceof Error ? error.message : String(error) }).catch(() => undefined);
  }
})();
