import { describe, expect, it } from "vitest";
// @ts-expect-error The capture service is plain ESM and is tested without launching a browser.
import { validateUrl } from "../../server/browser-capture.mjs";

describe("browser URL validation", () => {
  it("accepts public HTTP(S) and rejects scripts, files and private networks", () => {
    expect(validateUrl("https://www.etsy.com/search?q=3d+printed")?.hostname).toBe("www.etsy.com");
    ["file:///C:/secret", "javascript:alert(1)", "http://localhost:3000", "http://10.0.0.1", "http://169.254.1.1", "http://[::1]"]
      .forEach((value) => expect(validateUrl(value)).toBeNull());
  });
});
