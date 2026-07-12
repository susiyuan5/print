import { describe, expect, it } from "vitest";
// @ts-expect-error Chrome extension helper is plain ESM and is exercised directly by Vitest.
import { canonicalItemUrl, captureDiagnosticMessage, normalizeRawPageCapture, sourceFromUrl } from "../../chrome-extension/item-rules.js";

describe("extension specific item URL rules", () => {
  const specific = [
    ["cults3d", "https://cults3d.com/zh/3d-m%C3%B3x%C3%ADng/y%C3%ACsh%C3%B9/flexi-dragon"],
    ["printables", "https://www.printables.com/model/12345-flexi-dragon"],
    ["makerworld", "https://makerworld.com/en/models/1015187?from=search"],
    ["thingiverse", "https://www.thingiverse.com/thing:12345"],
    ["myminifactory", "https://www.myminifactory.com/object/3d-print-fidget-twisters-30716"],
    ["etsy", "https://www.etsy.com/ca/listing/1055928069/model?ref=search"],
    ["amazon", "https://www.amazon.com/example/dp/B0ABC12345?tag=x"],
    ["tiktok", "https://www.tiktok.com/@maker/video/1234567890"],
    ["instagram", "https://www.instagram.com/reel/ABC_123/"],
  ];

  it.each(specific)("accepts a concrete %s item", (source, url) => {
    expect(sourceFromUrl(url)).toBe(source);
    expect(canonicalItemUrl(url)).toBeTruthy();
  });

  it.each([
    "https://cults3d.com/zh",
    "https://www.printables.com/model",
    "https://makerworld.com/en/3d-models",
    "https://www.thingiverse.com/explore/popular",
    "https://www.myminifactory.com/search/?query=dragon",
    "https://www.etsy.com/ca/market/3d_printed_products",
    "https://www.amazon.com/s?k=3d+printing",
    "https://www.tiktok.com/tag/3dprinting",
    "https://www.instagram.com/explore/tags/3dprinting/",
  ])("rejects navigation and ranking URL %s", (url) => expect(canonicalItemUrl(url)).toBeUndefined());

  it("removes tracking data while preserving the concrete item path", () => {
    expect(canonicalItemUrl("https://makerworld.com/en/models/1015187?from=search#profile")).toBe("https://makerworld.com/en/models/1015187");
  });

  it("merges MakerWorld image and title links into 40 concrete models", () => {
    const modelLinks = Array.from({ length: 40 }, (_, index) => {
      const id = 3_000_000 + index; const url = `https://makerworld.com/en/models/${id}-model-${index}?from=hot`;
      return [{ url, title: "", imageUrl: `https://makerworld.example/${id}.jpg` }, { url, title: `Model ${index}`, description: `Maker ${index} 1 k 2 k` }];
    }).flat();
    const capture = normalizeRawPageCapture({ pageUrl: "https://makerworld.com/en/3d-models?orderBy=hotScore", pageTitle: "3D Models - MakerWorld", totalLinks: 240, items: [...modelLinks, { url: "https://makerworld.com/en/3d-models/100-art", title: "Art" }] }, "makerworld");
    expect(capture.diagnostics).toEqual({ totalLinks: 240, candidateLinks: 80, validItems: 40, timedOut: false });
    expect(capture.items[0]).toMatchObject({ title: "Model 0", imageUrl: "https://makerworld.example/3000000.jpg", url: "https://makerworld.com/en/models/3000000-model-0" });
  });

  it("keeps up to 100 unique Printables models for preview", () => {
    const items = Array.from({ length: 120 }, (_, index) => ({ title: `Printable ${index}`, url: `https://www.printables.com/model/${10_000 + index}-printable-${index}` }));
    const capture = normalizeRawPageCapture({ pageUrl: "https://www.printables.com/model", totalLinks: 500, items }, "printables");
    expect(capture.items).toHaveLength(100);
    expect(capture.diagnostics.candidateLinks).toBe(120);
  });

  it("returns actionable diagnostics for loading, candidate and title failures", () => {
    expect(captureDiagnosticMessage({ timedOut: true, totalLinks: 20 })).toContain("8 秒内仍未加载");
    expect(captureDiagnosticMessage({ totalLinks: 200, candidateLinks: 0 })).toContain("没有识别到具体项目链接");
    expect(captureDiagnosticMessage({ totalLinks: 200, candidateLinks: 5, validItems: 0 })).toContain("缺少可用标题");
  });

  it("treats a null injected result as an empty compatible capture", () => {
    expect(normalizeRawPageCapture(null, "makerworld")).toEqual({ pageUrl: undefined, pageTitle: undefined, items: [], diagnostics: { totalLinks: 0, candidateLinks: 0, validItems: 0, timedOut: false } });
  });
});
