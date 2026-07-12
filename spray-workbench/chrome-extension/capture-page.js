void (async () => {
  try {
    const pricePattern = /(?:CA\$|US\$|\$|£|€)\s?\d+(?:[.,]\d+)?/;
    const compact = (value = "") => value.replace(/\s+/g, " ").trim();
    const host = location.hostname.toLowerCase().replace(/^www\./, ""); const makerWorld = host.includes("makerworld.com");
    const deadline = Date.now() + 8_000;
    while (makerWorld && !document.querySelector(".js-design-card") && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 250));
    const timedOut = makerWorld && !document.querySelector(".js-design-card");
    const absoluteHttpUrl = (value) => { try { const url = new URL(value, location.href); return /^https?:$/.test(url.protocol) ? url.href : undefined; } catch { return undefined; } };
    const usableImage = (value) => { const url = absoluteHttpUrl(value); return url && !/(?:placeholder|transparent|spacer|blank|pixel)(?:[._/-]|$)/i.test(url) ? url : undefined; };
    const srcsetUrls = (value = "") => value.split(",").map((part) => part.trim().split(/\s+/)[0]).map(usableImage).filter(Boolean).reverse();
    const imageFrom = (root) => {
      if (!root) return undefined;
      for (const image of root.matches?.("img") ? [root] : [...(root.querySelectorAll?.("img") ?? [])]) {
        const candidates = [image.currentSrc, ...srcsetUrls(image.getAttribute("data-srcset")), ...srcsetUrls(image.getAttribute("srcset")), image.getAttribute("data-original"), image.getAttribute("data-src"), image.getAttribute("data-lazy-src"), image.getAttribute("src")];
        const candidate = candidates.map(usableImage).find(Boolean); if (candidate) return candidate;
      }
      for (const entry of root.querySelectorAll?.("picture source") ?? []) { const candidate = [...srcsetUrls(entry.getAttribute("srcset")), ...srcsetUrls(entry.getAttribute("data-srcset"))][0]; if (candidate) return candidate; }
      for (const element of [root, ...(root.querySelectorAll?.("[style]") ?? [])].slice(0, 30)) {
        const background = getComputedStyle(element).backgroundImage.match(/url\(["']?(.+?)["']?\)/)?.[1]; const candidate = usableImage(background); if (candidate) return candidate;
      }
      return undefined;
    };
    const cardFor = (link) => {
      if (makerWorld) return link.closest(".js-design-card") || link.closest(".card-wrapper") || link.parentElement || link;
      const semantic = link.closest("article, li, [data-testid*='card'], [class*='product-card'], [class*='model-card'], [class*='listing-card']");
      if (semantic) return semantic;
      let current = link.parentElement; let best = link;
      for (let depth = 0; current && depth < 4; depth += 1, current = current.parentElement) {
        const text = compact(current.innerText || ""); if (text.length > 1_500 || current.querySelectorAll("a[href]").length > 6) break;
        if (text || current.querySelector("img")) best = current;
      }
      return best;
    };
    const allLinks = [...document.querySelectorAll("a[href]")]; const items = [];
    for (const link of allLinks) {
      let url;
      try { const parsed = new URL(link.href, location.href); if (parsed.hostname.toLowerCase().replace(/^www\./, "") !== host || !/^https?:$/.test(parsed.protocol)) continue; url = parsed.href; } catch { continue; }
      const card = cardFor(link); const image = link.querySelector("img") || card.querySelector("img");
      const linkText = compact(link.innerText || ""); const makerTitle = makerWorld ? compact(card.querySelector(".translated-text")?.innerText || "") : "";
      const title = compact(makerTitle || card.querySelector("h1,h2,h3,h4,h5,h6")?.innerText || link.getAttribute("aria-label") || image?.alt || linkText.split(/\r?\n/)[0]).slice(0, 160);
      const nearby = compact(card.innerText || linkText); const priceText = nearby.match(pricePattern)?.[0];
      const description = compact(nearby.replace(title, "").replace(priceText || "", "")).slice(0, 300) || undefined;
      items.push({ title, url, imageUrl: imageFrom(link) || imageFrom(card), priceText, description });
      if (items.length >= 800) break;
    }
    const meta = (selector) => compact(document.querySelector(selector)?.content || "");
    items.push({ title: meta("meta[property='og:title']") || compact(document.querySelector("h1")?.innerText || document.title).slice(0, 160), url: document.querySelector("link[rel='canonical']")?.href || location.href, imageUrl: usableImage(meta("meta[property='og:image']") || meta("meta[name='twitter:image']")), priceText: meta("meta[property='product:price:amount']") || undefined, description: (meta("meta[property='og:description']") || meta("meta[name='description']")).slice(0, 300) || undefined });
    await chrome.runtime.sendMessage({ type: "page-capture-result", payload: { pageUrl: location.href, pageTitle: document.title, totalLinks: allLinks.length, timedOut, items } });
  } catch (error) {
    await chrome.runtime.sendMessage({ type: "page-capture-result", error: error instanceof Error ? error.message : String(error) }).catch(() => undefined);
  }
})();
