import { describe, expect, it } from "vitest";
// @ts-expect-error The capture service is plain ESM and is tested without launching a browser.
import { CDP_PORT, browserReuseMode, chromeLaunchArgs, detectSource, searchUrl, trendRadarChromeProfile, validateUrl } from "../../server/browser-capture.mjs";

describe("browser URL validation", () => {
  it("accepts public HTTP(S) and rejects scripts, files and private networks", () => {
    expect(validateUrl("https://www.etsy.com/search?q=3d+printed")?.hostname).toBe("www.etsy.com");
    ["file:///C:/secret", "javascript:alert(1)", "http://localhost:3000", "http://10.0.0.1", "http://169.254.1.1", "http://[::1]"]
      .forEach((value) => expect(validateUrl(value)).toBeNull());
  });
  it("recognizes the new model and social platforms without visiting them", () => {
    expect(detectSource("https://www.thingiverse.com/?sort=popular")).toBe("thingiverse");
    expect(detectSource("https://www.instagram.com/explore/tags/3dprinting/")).toBe("instagram");
    expect(searchUrl("myminifactory", "3d printing")).toContain("query=3d%20printing");
    expect(searchUrl("instagram", "#3dprinting")).toContain("/3dprinting/");
  });
  it("uses a separate Chrome profile and only reuses an active CDP browser", () => {
    expect(chromeLaunchArgs()).toEqual(expect.arrayContaining([`--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${trendRadarChromeProfile}`]));
    expect(trendRadarChromeProfile).not.toContain("Google\\Chrome\\User Data");
    expect(browserReuseMode(true, true)).toBe("reuse-page");
    expect(browserReuseMode(true, false)).toBe("reuse-window");
    expect(browserReuseMode(false, false)).toBe("launch-window");
  });
});
