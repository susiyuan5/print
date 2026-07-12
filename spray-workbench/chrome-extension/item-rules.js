export const ITEM_RULES = {
  cults3d: { hosts: ["cults3d.com"], paths: ["^/[a-z]{2}/(?:3d-model|3d-móxíng|objet-3d|modelo-3d|modello-3d|3d-modell)/[^/]+/[^/]+/?$"] },
  printables: { hosts: ["printables.com"], paths: ["^/model/\\d+(?:-[^/]+)?/?$"] },
  makerworld: { hosts: ["makerworld.com"], paths: ["^/(?:[a-z]{2}/)?models/\\d+(?:-[^/]+)?/?$"] },
  thingiverse: { hosts: ["thingiverse.com"], paths: ["^/thing:\\d+/?$"] },
  myminifactory: { hosts: ["myminifactory.com"], paths: ["^/object/3d-print-.+-\\d+/?$"] },
  etsy: { hosts: ["etsy.com"], paths: ["^/(?:[a-z]{2}/)?listing/\\d+(?:/[^/]+)?/?$"] },
  amazon: { hosts: ["amazon."], paths: ["^/(?:[^/]+/)?dp/[A-Z0-9]{10}/?$", "^/gp/product/[A-Z0-9]{10}/?$"] },
  tiktok: { hosts: ["tiktok.com"], paths: ["^/@[^/]+/video/\\d+/?$"] },
  instagram: { hosts: ["instagram.com"], paths: ["^/(?:p|reel)/[A-Za-z0-9_-]+/?$"] },
};

export function sourceFromUrl(value = "") {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return Object.entries(ITEM_RULES).find(([, rule]) => rule.hosts.some((part) => host.includes(part)))?.[0] ?? "generic";
  } catch {
    return "generic";
  }
}

export function canonicalItemUrl(value, source = sourceFromUrl(value)) {
  try {
    const rule = ITEM_RULES[source]; const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = decodeURIComponent(url.pathname);
    if (!rule || !rule.hosts.some((part) => host.includes(part)) || !rule.paths.some((pattern) => new RegExp(pattern, "i").test(path))) return undefined;
    url.hash = ""; url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

export function normalizeRawPageCapture(payload, source) {
  payload = payload && typeof payload === "object" ? payload : {};
  source ||= sourceFromUrl(payload.pageUrl);
  const byUrl = new Map(); let candidateLinks = 0;
  for (const raw of Array.isArray(payload.items) ? payload.items : []) {
    const url = canonicalItemUrl(raw?.url, source); if (!url) continue;
    candidateLinks += 1;
    const incoming = {
      title: typeof raw.title === "string" ? raw.title.replace(/\s+/g, " ").trim().slice(0, 160) : "",
      url,
      imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
      priceText: typeof raw.priceText === "string" ? raw.priceText : undefined,
      description: typeof raw.description === "string" ? raw.description.replace(/\s+/g, " ").trim().slice(0, 300) || undefined : undefined,
      source,
    };
    const existing = byUrl.get(url);
    if (!existing) { byUrl.set(url, incoming); continue; }
    if (!existing.title || incoming.title.length > existing.title.length) existing.title = incoming.title;
    existing.imageUrl ||= incoming.imageUrl;
    existing.priceText ||= incoming.priceText;
    if (!existing.description || (incoming.description?.length ?? 0) > existing.description.length) existing.description = incoming.description;
  }
  const items = [...byUrl.values()].filter((item) => item.title).slice(0, 100);
  return {
    pageUrl: payload.pageUrl,
    pageTitle: payload.pageTitle,
    items,
    diagnostics: {
      totalLinks: Number(payload.totalLinks) || 0,
      candidateLinks,
      validItems: items.length,
      timedOut: Boolean(payload.timedOut),
    },
  };
}

export function captureDiagnosticMessage({ totalLinks = 0, candidateLinks = 0, validItems = 0, timedOut = false } = {}) {
  const counts = `页面链接 ${totalLinks} 条，具体项目候选 ${candidateLinks} 条，有效项目 ${validItems} 条`;
  if (timedOut) return `页面在 8 秒内仍未加载模型卡片（${counts}），请确认榜单已显示后重试`;
  if (!totalLinks) return `页面尚未加载任何链接（${counts}），请稍后重试`;
  if (!candidateLinks) return `页面已加载，但没有识别到具体项目链接（${counts}）`;
  return `已识别具体项目链接，但缺少可用标题（${counts}）`;
}
