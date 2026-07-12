void (async () => {
  try {
    const pricePattern = /(?:CA\$|US\$|\$|£|€)\s?\d+(?:[.,]\d+)?/;
    const compact = (value = "") => value.replace(/\s+/g, " ").trim();
    const host = location.hostname.toLowerCase().replace(/^www\./, ""); const makerWorld = host.includes("makerworld.com"); const printables = host.includes("printables.com"); const cults3d = host.includes("cults3d.com");
    const deadline = Date.now() + 8_000;
    while (makerWorld && !document.querySelector(".js-design-card") && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 250));
    const timedOut = makerWorld && !document.querySelector(".js-design-card");
    const printablesModelCount = () => new Set([...document.querySelectorAll("a[href]")].map((link) => {
      try { const url = new URL(link.href, location.href); return url.hostname.includes("printables.com") && /^\/model\/\d+(?:-[^/]+)?\/?$/i.test(url.pathname) ? `${url.origin}${url.pathname.replace(/\/$/, "")}` : undefined; } catch { return undefined; }
    }).filter(Boolean)).size;
    if (printables && printablesModelCount() < 100) {
      const originalScrollY = window.scrollY; let previousCount = printablesModelCount(); let stableRounds = 0;
      for (let round = 0; round < 36 && previousCount < 100 && stableRounds < 5; round += 1) {
        window.scrollTo({ top: document.scrollingElement?.scrollHeight ?? document.body.scrollHeight, behavior: "instant" });
        await new Promise((resolve) => setTimeout(resolve, 650));
        const currentCount = printablesModelCount();
        stableRounds = currentCount > previousCount ? 0 : stableRounds + 1; previousCount = currentCount;
      }
      window.scrollTo({ top: originalScrollY, behavior: "instant" });
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
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
