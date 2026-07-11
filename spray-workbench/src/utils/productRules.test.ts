import { describe, expect, it } from "vitest";
import { approvalMissing, isMeaningfulSalesTest, transitionProduct } from "./productRules";
import type { ProductOpportunity, ProductTestRecord, SalesTestRecord } from "../types/workbench";

const product: ProductOpportunity = { id:"p", name:"P", category:"x", markets:["Canada"], productRole:"profit", description:"", targetCustomer:"", customerProblem:"", customizationOptions:[], demandScore:50, competitionScore:50, profitScore:50, shippingScore:50, videoScore:50, customizationScore:50, repeatabilityScore:50, licenseStatus:"unknown", ipRisk:"low", complianceRisk:"low", riskTags:[], sourceLinks:[], evidenceNotes:[], status:"candidate", sellingPriceCad:20, materialCostCad:2, printTimeHours:1 };
const print: ProductTestRecord = { id:"t", productId:"p", result:"pass", updatedAt:"2026-01-01" };
const sales: SalesTestRecord = { id:"s", productId:"p", platform:"Etsy", impressions:10, views:2, periodStart:"2026-01-01", updatedAt:"2026-01-01" };

describe("product approval gates", () => {
  it("does not require a commercial license record",()=>expect(approvalMissing(product,[print],[sales],[])).not.toContain("有效的结构化商用授权记录"));
  it("blocks without a passed print",()=>expect(approvalMissing(product,[],[sales],[])).toContain("至少一条通过的打印测试"));
  it("blocks without meaningful sales",()=>expect(approvalMissing(product,[print],[],[])).toContain("至少一条有效销售测试"));
  it("does not count impressions only",()=>expect(isMeaningfulSalesTest({...sales,views:0})).toBe(false));
  it("does not count views only",()=>expect(isMeaningfulSalesTest({...sales,impressions:0})).toBe(false));
  it("counts zero-order traffic",()=>expect(isMeaningfulSalesTest(sales)).toBe(true));
  it("blocks without core cost",()=>expect(approvalMissing({...product,materialCostCad:undefined},[print],[sales],[])).toContain("售价、材料成本与打印时长"));
  it("approves complete production evidence without license tracking",()=>expect(transitionProduct(product,"approved",[print],[sales],[]).ok).toBe(true));
  it("blocks selling before print pass",()=>expect(transitionProduct(product,"test-selling",[],[sales],[]).ok).toBe(false));
});
