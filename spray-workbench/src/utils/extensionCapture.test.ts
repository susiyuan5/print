import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
// @ts-expect-error Server module is plain ESM and tested without starting Express.
import { isChromeExtensionOrigin, normalizeExtensionCapture } from "../../server/extension-capture.mjs";
// @ts-expect-error Server module is plain ESM and tested without launching Chrome.
import { detectSource, validateUrl } from "../../server/browser-capture.mjs";

describe("Chrome extension capture bridge", () => {
  it("creates a pending-capture compatible payload while preserving image, price and a compact description", () => {
    const capture = normalizeExtensionCapture({ pageUrl: "https://www.etsy.com/search?q=3d+printed", pageTitle: "Etsy", items: [{ title: "Desk organizer", url: "https://www.etsy.com/listing/1", imageUrl: "https://images.example/item.jpg", priceText: "US$ 20", description: `  模块化\n  收纳盒 ${"中".repeat(1_400)}`, sourceDescription: "Modular organizer", descriptionLanguage: "en", translationStatus: "translated", descriptionReadStatus: "success" }] }, { validateUrl, detectSource, now: "2026-07-12T00:00:00.000Z" });
    expect(capture).toMatchObject({ source: "etsy", pageTitle: "Etsy", capturedAt: "2026-07-12T00:00:00.000Z" });
    expect(capture.items[0]).toMatchObject({ title: "Desk organizer", imageUrl: "https://images.example/item.jpg", priceText: "US$ 20" });
    expect(capture.items[0].description).toHaveLength(1_200);
    expect(capture.items[0]).toMatchObject({ sourceDescription: "Modular organizer", descriptionLanguage: "en", translationStatus: "translated", descriptionReadStatus: "success" });
  });
  it("keeps legacy capture items without a description compatible", () => {
    const capture = normalizeExtensionCapture({ pageUrl: "https://www.printables.com/model", items: [{ title: "Legacy model", url: "https://www.printables.com/model/1" }] }, { validateUrl, detectSource });
    expect(capture.items[0].description).toBeUndefined();
  });
  it("rejects unsafe item URLs and non-extension origins", () => {
    expect(() => normalizeExtensionCapture({ pageUrl: "https://example.com", items: [{ title: "bad", url: "file:///secret" }] }, { validateUrl, detectSource })).toThrow("没有可确认");
    expect(isChromeExtensionOrigin("chrome-extension://abcdefghijklmnopabcdefghijklmnop")).toBe(true);
    expect(isChromeExtensionOrigin("http://localhost:5173")).toBe(false);
  });
  it("ships a Manifest V3 extension with only local-service host permission", async () => {
    const manifest = JSON.parse(await readFile(new URL("../../chrome-extension/manifest.json", import.meta.url), "utf8"));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.version).toBe("1.5.4");
    expect(Number(manifest.minimum_chrome_version)).toBeGreaterThanOrEqual(138);
    expect(manifest.permissions).toEqual(expect.arrayContaining(["activeTab", "scripting"]));
    expect(manifest.host_permissions).toEqual(expect.arrayContaining(["http://127.0.0.1:3456/*", "https://*.makerworld.com/*"]));
  });
  it("uses a content-script message instead of the nullable executeScript result", async () => {
    const [popup, capturePage, background] = await Promise.all([
      readFile(new URL("../../chrome-extension/popup.js", import.meta.url), "utf8"),
      readFile(new URL("../../chrome-extension/capture-page.js", import.meta.url), "utf8"),
      readFile(new URL("../../chrome-extension/background.js", import.meta.url), "utf8"),
    ]);
    expect(popup).toContain('files: ["capture-page.js"]');
    expect(popup).toContain('message?.type !== "page-capture-result"');
    expect(capturePage).toContain('type: "page-capture-result"');
    expect(capturePage).toContain('String(value ?? "").split(",")');
    expect(capturePage).toContain('data-background-image');
    expect(capturePage).toContain("candidate.pathname === current.pathname && candidate.search === current.search");
    expect(capturePage).not.toContain("renderedDescription");
    expect(capturePage).toContain("printablesSnapshotCount() < 100");
    expect(capturePage).toContain("collectVisibleItems()");
    expect(capturePage).toContain("itemSnapshots.set(url, incoming)");
    expect(capturePage).toContain("previousCount < 100");
    expect(capturePage).toContain("originalScrollY");
    expect(popup).toContain("正在读取 ${extracted.items.length} 个产品详情页的 Description");
    expect(popup).toContain("description: descriptions.get(item.url)");
    expect(popup).not.toContain("descriptions.get(item.url) || item.description");
    expect(background).toContain('chrome.tabs.create({ url: safeUrl, active: false })');
    expect(background).toContain("func: extractDetailInPage");
    expect(background).toContain("meta[property='og:image']");
    expect(background).toContain('document.querySelector(".user-inserted")');
    expect(background).toContain('description?.toLowerCase() === "pdf"');
    expect(popup).toContain("validItemImage(detailImages.get(item.url)) || validItemImage(item.imageUrl)");
    expect(popup).toContain('url.hostname === "media.printables.com"');
    expect(background).toContain("chrome.tabs.remove(tabId)");
  });
  it("marks missing detail descriptions without promoting card metrics to a description", () => {
    const capture = normalizeExtensionCapture({ pageUrl: "https://makerworld.com/en/3d-models", items: [{ title: "Benchy", url: "https://makerworld.com/en/models/1-benchy", descriptionReadStatus: "failed" }] }, { validateUrl, detectSource });
    expect(capture.items[0]).toMatchObject({ title: "Benchy", descriptionReadStatus: "failed" });
    expect(capture.items[0].description).toBeUndefined();
    expect(capture.warnings.join(" ")).toContain("未使用榜单卡片文字冒充说明");
  });
  it("eagerly loads the first preview images and keeps a retry path", async () => {
    const page = await readFile(new URL("../pages/TrendRadarPage.tsx", import.meta.url), "utf8");
    expect(page).toContain('eager={index < 30}');
    expect(page).toContain("图片加载失败，点击重试");
    expect(page).toContain("attempt >= 2");
  });
});
