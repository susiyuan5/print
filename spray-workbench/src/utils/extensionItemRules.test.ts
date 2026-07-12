import { describe, expect, it } from "vitest";
// @ts-expect-error Chrome extension helper is plain ESM and is exercised directly by Vitest.
import { canonicalItemUrl, sourceFromUrl } from "../../chrome-extension/item-rules.js";

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
});

