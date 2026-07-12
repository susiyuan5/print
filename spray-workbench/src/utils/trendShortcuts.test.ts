import { describe, expect, it } from "vitest";
import { buildSearchUrl, calculateRadarCounters, isPublicHttpUrl, loadShortcutPreferences, officialTrendShortcuts, recordShortcutOpen, visibleShortcuts } from "./trendShortcuts";

describe("trend shortcuts", () => {
  it("contains the configured official ranking and validation entry points", () => {
    expect(officialTrendShortcuts).toHaveLength(9);
    expect(new Set(officialTrendShortcuts.map((shortcut) => shortcut.platform)).size).toBe(9);
    expect(officialTrendShortcuts.every((shortcut) => isPublicHttpUrl(shortcut.url))).toBe(true);
    expect(officialTrendShortcuts.filter((shortcut) => shortcut.group === "social-signal").map((shortcut) => shortcut.keyword)).toEqual(["#3dprinting", "#3dprinting"]);
    expect(Object.fromEntries(officialTrendShortcuts.map((shortcut) => [shortcut.platform, shortcut.url]))).toMatchObject({
      Cults3D: "https://cults3d.com/zh",
      Printables: "https://www.printables.com/",
      MakerWorld: "https://makerworld.com/en",
      Thingiverse: "https://www.thingiverse.com/",
      Etsy: "https://www.etsy.com/ca/?ref=lgo",
    });
  });
  it("encodes marketplace search queries", () => {
    expect(buildSearchUrl("https://www.etsy.com/search", "q", "3d printed organizer")).toContain("q=3d+printed+organizer");
  });
  it("rejects non-public and non-http custom URLs", () => {
    ["file:///tmp/a", "javascript:alert(1)", "http://127.0.0.1:3000", "http://192.168.1.2", "https://example.com"].forEach((value, index) => expect(isPublicHttpUrl(value)).toBe(index === 4));
  });
  it("records recent opens and applies hide/order preferences", () => {
    const prefs = recordShortcutOpen({ ...loadShortcutPreferences(), hiddenIds: ["cults-trending"], order: ["etsy-3dprinted"], custom: [] }, "etsy-3dprinted", "2026-07-12T00:00:00.000Z");
    expect(prefs.recentIds[0]).toBe("etsy-3dprinted");
    expect(visibleShortcuts(prefs)[0].id).toBe("etsy-3dprinted");
    expect(visibleShortcuts(prefs).some((shortcut) => shortcut.id === "cults-trending")).toBe(false);
  });
  it("derives header counters from persisted radar state", () => {
    expect(calculateRadarCounters({ items: [{ status: "new" }, { conversionProductId: "product-1" }], captureHistory: [{ capturedAt: "2026-07-12", rawItemCount: 8 }], pendingCaptures: [{ items: [1, 2] }], duplicateReviews: [{ status: "pending" }, { status: "merged" }] })).toMatchObject({ latestCaptureCount: 8, pendingCount: 2, importedCount: 2, duplicateCount: 1, convertedCount: 1 });
  });
});
