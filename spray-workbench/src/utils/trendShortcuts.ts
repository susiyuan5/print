export type TrendShortcutGroup = "model-ranking" | "market-validation" | "social-signal";

export interface TrendShortcut {
  id: string;
  group: TrendShortcutGroup;
  label: string;
  platform: string;
  url: string;
  keyword?: string;
  description: string;
}

export interface CustomTrendShortcut {
  id: string;
  label: string;
  platform: string;
  url: string;
  description: string;
}

export interface TrendShortcutPreferences {
  lastOpenedId?: string;
  lastOpenedAt?: string;
  recentIds: string[];
  hiddenIds: string[];
  order: string[];
  custom: CustomTrendShortcut[];
}

export const AMAZON_KEYWORDS = ["desk organizer", "controller stand", "headphone hanger", "cable organizer", "pegboard accessories", "replacement knob"];

export function buildSearchUrl(origin: string, parameter: string, query: string) {
  const url = new URL(origin);
  url.searchParams.set(parameter, query);
  return url.toString();
}

export const officialTrendShortcuts: TrendShortcut[] = [
  { id: "cults-trending", group: "model-ranking", platform: "Cults3D", label: "Cults3D", url: "https://cults3d.com/zh", description: "打开当前 Chrome 已登录的 Cults3D 中文站点" },
  { id: "printables-featured", group: "model-ranking", platform: "Printables", label: "Printables", url: "https://www.printables.com/", description: "打开当前 Chrome 已登录的 Printables" },
  { id: "makerworld-popular", group: "model-ranking", platform: "MakerWorld", label: "MakerWorld", url: "https://makerworld.com/en", description: "打开当前 Chrome 已登录的 MakerWorld" },
  { id: "thingiverse-popular", group: "model-ranking", platform: "Thingiverse", label: "Thingiverse", url: "https://www.thingiverse.com/", description: "打开当前 Chrome 已登录的 Thingiverse" },
  { id: "myminifactory-search", group: "model-ranking", platform: "MyMiniFactory", label: "MyMiniFactory · 3D 模型搜索", url: buildSearchUrl("https://www.myminifactory.com/search/", "query", "3d printing"), description: "查看精选创作者和可打印模型，可能需要手动登录" },
  { id: "etsy-3dprinted", group: "market-validation", platform: "Etsy", label: "Etsy Canada", url: "https://www.etsy.com/ca/?ref=lgo", description: "打开当前 Chrome 已登录的 Etsy 加拿大站点" },
  { id: "amazon-demand", group: "market-validation", platform: "Amazon", label: "Amazon · 实用产品需求", url: buildSearchUrl("https://www.amazon.com/s", "k", AMAZON_KEYWORDS[0]), keyword: AMAZON_KEYWORDS[0], description: "验证大众实用产品需求" },
  { id: "tiktok-3dprinting", group: "social-signal", platform: "TikTok", label: "TikTok · #3dprinting", url: "https://www.tiktok.com/tag/3dprinting", keyword: "#3dprinting", description: "观察短视频内容与互动信号，可能需要手动登录或验证" },
  { id: "instagram-3dprinting", group: "social-signal", platform: "Instagram", label: "Instagram · #3dprinting", url: "https://www.instagram.com/explore/tags/3dprinting/", keyword: "#3dprinting", description: "观察图片内容与互动信号，可能需要手动登录或验证" },
];

const KEY = "trend-radar:shortcut-preferences";
const empty = (): TrendShortcutPreferences => ({ recentIds: [], hiddenIds: [], order: [], custom: [] });

export function loadShortcutPreferences(): TrendShortcutPreferences {
  if (typeof localStorage === "undefined") return empty();
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return empty(); }
}

export function saveShortcutPreferences(value: TrendShortcutPreferences) {
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(value));
}

export function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const privateHost = host === "localhost" || host === "::1" || host === "[::1]" || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) || /^169\.254\./.test(host) || /^fc|^fd|^fe80/i.test(host);
    return /^https?:$/.test(url.protocol) && !privateHost;
  } catch { return false; }
}

export function visibleShortcuts(preferences: TrendShortcutPreferences) {
  const all = [...officialTrendShortcuts, ...preferences.custom];
  const position = new Map(preferences.order.map((id, index) => [id, index]));
  return all.filter((shortcut) => !preferences.hiddenIds.includes(shortcut.id)).sort((a, b) => (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (position.get(b.id) ?? Number.MAX_SAFE_INTEGER));
}

export function recordShortcutOpen(preferences: TrendShortcutPreferences, id: string, at = new Date().toISOString()): TrendShortcutPreferences {
  return { ...preferences, lastOpenedId: id, lastOpenedAt: at, recentIds: [id, ...preferences.recentIds.filter((item) => item !== id)].slice(0, 6) };
}

export function calculateRadarCounters(state: { items?: Array<{ status?: string; conversionProductId?: string }>; captureHistory?: Array<{ capturedAt: string; rawItemCount: number }>; pendingCaptures?: Array<{ items: unknown[] }>; duplicateReviews?: Array<{ status?: string }> }) {
  const latest = state.captureHistory?.[0];
  return {
    latestCapturedAt: latest?.capturedAt,
    latestCaptureCount: latest?.rawItemCount ?? 0,
    pendingCount: (state.pendingCaptures ?? []).reduce((sum, capture) => sum + capture.items.length, 0),
    importedCount: state.items?.length ?? 0,
    duplicateCount: (state.duplicateReviews ?? []).filter((review) => review.status === "pending").length,
    convertedCount: (state.items ?? []).filter((item) => item.status === "converted" || Boolean(item.conversionProductId)).length,
  };
}
