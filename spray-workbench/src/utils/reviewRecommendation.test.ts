import { describe, expect, it } from "vitest";
import { recommendReview } from "./reviewRecommendation";

describe("recommendReview", () => {
  it("suggests both colour and process corrections", () => {
    const result = recommendReview(["too_warm", "poor_coverage", "runs"], "2026-01-01T00:00:00.000Z");
    expect(result.colorAdjustment).toContain("冷色");
    expect(result.processAdjustment).toContain("薄喷");
    expect(result.processAdjustment).toContain("出漆量");
  });

  it("uses a safe baseline when there are no observations", () => {
    const result = recommendReview([]);
    expect(result.summary).toContain("未选择");
  });
});
