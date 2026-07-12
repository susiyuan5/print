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

