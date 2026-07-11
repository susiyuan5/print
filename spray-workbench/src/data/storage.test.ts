import { describe, expect, it } from "vitest";
import { sampleData } from "./sampleData";
import { normalizeWorkbenchData } from "./storage";

describe("legacy product cleanup", () => {
  it("removes only the identifiable 15-item seed record", () => {
    const data = structuredClone(sampleData);
    data.productOpportunities = [
      { id: "seed", name: "机械齿轮解压玩具", category: "x", markets: ["Canada"], productRole: "profit", description: "初始候选：尚未关联模型文件或市场证据。", targetCustomer: "", customerProblem: "", customizationOptions: [], demandScore: 60, competitionScore: 50, profitScore: 60, shippingScore: 70, videoScore: 55, customizationScore: 60, repeatabilityScore: 60, licenseStatus: "unknown", ipRisk: "low", complianceRisk: "low", riskTags: [], sourceLinks: [], evidenceNotes: [], status: "watching" },
      { id: "imported", name: "机械齿轮解压玩具", category: "x", markets: ["Canada"], productRole: "profit", description: "来自真实抓取", targetCustomer: "", customerProblem: "", customizationOptions: [], demandScore: 0, competitionScore: 0, profitScore: 0, shippingScore: 0, videoScore: 0, customizationScore: 0, repeatabilityScore: 0, licenseStatus: "unknown", ipRisk: "high", complianceRisk: "low", riskTags: [], sourceLinks: ["https://example.com/item"], evidenceNotes: [], status: "watching", radarItemId: "trend-1" },
    ];

    expect(normalizeWorkbenchData(data).productOpportunities?.map((product) => product.id)).toEqual(["imported"]);
  });

  it("is idempotent and preserves a manually edited demo-named product", () => {
    const data = structuredClone(sampleData);
    data.productOpportunities = [{ id: "manual", name: "机械齿轮解压玩具", category: "x", markets: ["Canada"], productRole: "profit", description: "初始候选：尚未关联模型文件或市场证据。", targetCustomer: "", customerProblem: "", customizationOptions: [], demandScore: 60, competitionScore: 50, profitScore: 60, shippingScore: 70, videoScore: 55, customizationScore: 60, repeatabilityScore: 60, licenseStatus: "unknown", ipRisk: "low", complianceRisk: "low", riskTags: [], sourceLinks: [], evidenceNotes: ["用户备注"], status: "watching", modelAssetId: "model-1", productionStatus: "queued" }];
    const once = normalizeWorkbenchData(data);
    const twice = normalizeWorkbenchData(once);
    expect(once.productOpportunities?.map((product) => product.id)).toEqual(["manual"]);
    expect(twice.productOpportunities).toEqual(once.productOpportunities);
  });
});
