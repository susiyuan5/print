import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
// @ts-expect-error Server module is plain ESM and tested without starting Express.
import { isChromeExtensionOrigin, normalizeExtensionCapture } from "../../server/extension-capture.mjs";
// @ts-expect-error Server module is plain ESM and tested without launching Chrome.
import { detectSource, validateUrl } from "../../server/browser-capture.mjs";

describe("Chrome extension capture bridge", () => {
  it("creates a pending-capture compatible payload while preserving image, price and a compact description", () => {
    const capture = normalizeExtensionCapture({ pageUrl: "https://www.etsy.com/search?q=3d+printed", pageTitle: "Etsy", items: [{ title: "Desk organizer", url: "https://www.etsy.com/listing/1", imageUrl: "https://images.example/item.jpg", priceText: "US$ 20", description: `  模块化\n  收纳盒 ${"中".repeat(400)}`, sourceDescription: "Modular organizer", descriptionLanguage: "en", translationStatus: "translated" }] }, { validateUrl, detectSource, now: "2026-07-12T00:00:00.000Z" });
    expect(capture).toMatchObject({ source: "etsy", pageTitle: "Etsy", capturedAt: "2026-07-12T00:00:00.000Z" });
    expect(capture.items[0]).toMatchObject({ title: "Desk organizer", imageUrl: "https://images.example/item.jpg", priceText: "US$ 20" });
    expect(capture.items[0].description).toHaveLength(300);
    expect(capture.items[0]).toMatchObject({ sourceDescription: "Modular organizer", descriptionLanguage: "en", translationStatus: "translated" });
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
    expect(manifest.version).toBe("1.3.2");
    expect(Number(manifest.minimum_chrome_version)).toBeGreaterThanOrEqual(138);
    expect(manifest.permissions).toEqual(expect.arrayContaining(["activeTab", "scripting"]));
    expect(manifest.host_permissions).toEqual(["http://127.0.0.1:3456/*"]);
  });
  it("uses a content-script message instead of the nullable executeScript result", async () => {
    const [popup, capturePage] = await Promise.all([
      readFile(new URL("../../chrome-extension/popup.js", import.meta.url), "utf8"),
      readFile(new URL("../../chrome-extension/capture-page.js", import.meta.url), "utf8"),
    ]);
    expect(popup).toContain('files: ["capture-page.js"]');
    expect(popup).toContain('message?.type !== "page-capture-result"');
    expect(capturePage).toContain('type: "page-capture-result"');
    expect(capturePage).toContain('String(value ?? "").split(",")');
    expect(capturePage).toContain('data-background-image');
  });
  it("eagerly loads the first preview images and keeps a retry path", async () => {
    const page = await readFile(new URL("../pages/TrendRadarPage.tsx", import.meta.url), "utf8");
    expect(page).toContain('eager={index < 30}');
    expect(page).toContain("图片加载失败，点击重试");
    expect(page).toContain("attempt >= 2");
  });
});
