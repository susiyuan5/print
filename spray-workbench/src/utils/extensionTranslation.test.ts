import { describe, expect, it, vi } from "vitest";
// @ts-expect-error Chrome extension helper is plain ESM and is exercised directly by Vitest.
import { prepareTranslator, translateDescriptions } from "../../chrome-extension/translation.js";

describe("Chrome local description translation", () => {
  it("translates an English description and preserves its source text", async () => {
    const progress = vi.fn(); const translate = vi.fn(async () => "模块化桌面收纳盒"); const destroy = vi.fn();
    const api = { create: vi.fn(({ monitor }) => { monitor({ addEventListener: (_name: string, handler: (event: { loaded: number }) => void) => handler({ loaded: .5 }) }); return Promise.resolve({ translate, destroy }); }) };
    const prepared = await prepareTranslator("en-US", api, progress);
    const [item] = await translateDescriptions([{ title: "Organizer", description: "Modular desk organizer" }], prepared);
    expect(progress).toHaveBeenCalledWith(50);
    expect(item).toMatchObject({ description: "模块化桌面收纳盒", sourceDescription: "Modular desk organizer", descriptionLanguage: "en", translationStatus: "translated" });
    expect(destroy).toHaveBeenCalled();
  });

  it("keeps Chinese descriptions without creating a translator", async () => {
    const api = { create: vi.fn() }; const prepared = await prepareTranslator("zh-CN", api);
    const [item] = await translateDescriptions([{ description: "模块化桌面收纳盒" }], prepared);
    expect(api.create).not.toHaveBeenCalled();
    expect(item).toMatchObject({ description: "模块化桌面收纳盒", descriptionLanguage: "zh", translationStatus: "not-needed" });
  });

  it("keeps original text when the local language pack is unavailable", async () => {
    const prepared = await prepareTranslator("en", undefined);
    const [item] = await translateDescriptions([{ description: "Original description" }], prepared);
    expect(item).toMatchObject({ description: "Original description", sourceDescription: "Original description", translationStatus: "unavailable" });
  });

  it("falls back when creating the local translator throws synchronously", async () => {
    const prepared = await prepareTranslator("fr", { create: () => { throw new Error("blocked"); } });
    expect(prepared).toMatchObject({ status: "unavailable", language: "fr", error: "blocked" });
  });

  it("keeps original text when translating one item fails", async () => {
    const prepared = { status: "ready", language: "en", translator: { translate: vi.fn().mockRejectedValue(new Error("failed")), destroy: vi.fn() } };
    const [item] = await translateDescriptions([{ description: "Original description" }], prepared);
    expect(item).toMatchObject({ description: "Original description", sourceDescription: "Original description", translationStatus: "failed" });
  });
});
