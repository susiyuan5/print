import type { LicenseRecord, MarketSource, ProductOpportunity, ProductStatus, ProductTestRecord, SalesTestRecord } from "../types/workbench";

const DAY = 86_400_000;
const positive = (value?: number) => Math.max(0, value ?? 0);

export function opportunityScore(product: ProductOpportunity) {
  if (["blocked"].includes(product.ipRisk) || ["blocked"].includes(product.complianceRisk)) return 0;
  const base = product.demandScore * .2 + product.profitScore * .2 + product.shippingScore * .15 + product.customizationScore * .15 + (100 - product.competitionScore) * .1 + product.videoScore * .1 + product.repeatabilityScore * .1;
  const penalty = (product.ipRisk === "medium" ? 10 : product.ipRisk === "high" ? 30 : 0) + (product.complianceRisk === "medium" ? 10 : product.complianceRisk === "high" ? 25 : 0);
  return Math.round(Math.max(0, Math.min(100, base - penalty)));
}

export function evidenceInfo(sources: MarketSource[], now = Date.now()) {
  const stale = sources.filter((source) => now - Date.parse(source.checkedAt) > 30 * DAY).length;
  const score = sources.length ? Math.round(sources.reduce((sum, source) => sum + (source.confidence === "high" ? 100 : source.confidence === "medium" ? 65 : 35), 0) / sources.length) : 0;
  return { count: sources.length, score, stale, lastReviewed: [...sources].sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0]?.checkedAt };
}

export function profit(product: ProductOpportunity) {
  const costs = product.costSettings ?? {}; const price = positive(product.sellingPriceCad); const direct = positive(product.materialCostCad) + positive(costs.supportMaterialCostCad) + positive(product.packagingCostCad) + positive(product.shippingCostCad) + positive(costs.electricityCostCad) + positive(costs.paintFinishingCostCad) + positive(costs.returnLossAllowanceCad);
  const operating = positive(product.printTimeHours) * positive(costs.depreciationPerHourCad) + positive(costs.manualLaborMinutes) / 60 * positive(costs.laborHourlyCad);
  const fees = price * (positive(costs.platformFeePercent) + positive(costs.paymentFeePercent) + positive(costs.advertisingPercent)) / 100 + positive(costs.listingFeeCad) + positive(costs.advertisingCostCad);
  const total = direct + operating + fees + (direct + operating) * positive(costs.failureLossPercent) / 100; const net = price - total;
  return { direct, fees, operating, total, gross: price - direct, net, grossMargin: price ? (price - direct) / price * 100 : 0, netMargin: price ? net / price * 100 : 0, netPerMachineHour: positive(product.printTimeHours) ? net / positive(product.printTimeHours) : 0, netPerLaborHour: positive(costs.manualLaborMinutes) ? net / (positive(costs.manualLaborMinutes) / 60) : 0 };
}

export function isMeaningfulSalesTest(record: SalesTestRecord) { return positive(record.impressions) > 0 && positive(record.views) > 0 && Boolean(record.periodStart || record.periodEnd); }
export function salesMetrics(record: SalesTestRecord) { const rate = (part?: number, whole?: number) => positive(whole) ? positive(part) / positive(whole) * 100 : 0; return { ctr: rate(record.views, record.impressions), favoriteRate: rate(record.favorites, record.views), inquiryRate: rate(record.inquiries, record.views), conversionRate: rate(record.orders, record.views), returnRate: rate(record.returns, record.orders), revenue: positive(record.revenueCad) || positive(record.orders) * positive(record.testPriceCad) }; }
export function salesDiagnosis(record?: SalesTestRecord) { if (!record || !isMeaningfulSalesTest(record)) return "暂无有效销售测试：需要曝光、浏览和真实测试日期。"; const metrics = salesMetrics(record); if (positive(record.impressions) >= 100 && metrics.ctr < 1) return "曝光高但点击低：优先检查标题、主图和首屏卖点。"; if (positive(record.views) >= 20 && metrics.conversionRate < 1) return "点击后下单低：检查价格、运费、信任信息和商品页说明。"; if (positive(record.orders) > 0 && metrics.returnRate > 8) return "订单已有但退货率偏高：检查质量和商品描述。"; if (positive(record.impressions) < 100 && metrics.conversionRate >= 3) return "转化良好但流量不足：优先补充曝光。"; return "数据正在积累：继续测试并在下一周期复盘。"; }

export function hasValidCommercialLicense(product: ProductOpportunity, licenses: LicenseRecord[]) { return licenses.some((license) => license.productId === product.id && ["original", "commercial-license"].includes(license.licenseType) && license.physicalSalesAllowed === true && Boolean(license.proofOfLicense?.trim()) && !/禁止|not allowed|personal use/i.test(license.platformRestrictions ?? "") && (license.activeSubscriptionRequired !== true || Boolean(license.platformRestrictions?.trim()))); }
export function approvalMissing(product: ProductOpportunity, tests: ProductTestRecord[], sales: SalesTestRecord[], _licenses: LicenseRecord[]) { const missing: string[] = []; if (["high", "blocked"].includes(product.ipRisk)) missing.push("IP 风险需降至中低"); if (["high", "blocked"].includes(product.complianceRisk)) missing.push("合规风险需降至中低"); if (!tests.some((test) => test.productId === product.id && test.result === "pass")) missing.push("至少一条通过的打印测试"); if (!(positive(product.sellingPriceCad) && product.materialCostCad !== undefined && product.printTimeHours !== undefined)) missing.push("售价、材料成本与打印时长"); if (!sales.some((test) => test.productId === product.id && isMeaningfulSalesTest(test))) missing.push("至少一条有效销售测试"); return missing; }
export function transitionProduct(product: ProductOpportunity, target: ProductStatus, tests: ProductTestRecord[], sales: SalesTestRecord[], licenses: LicenseRecord[]) { if (target === "approved") { const missing = approvalMissing(product, tests, sales, licenses); if (missing.length) return { ok: false as const, message: `无法批准：还缺少${missing.join("、")}。` }; } if (target === "test-selling" && !tests.some((test) => test.productId === product.id && test.result === "pass")) return { ok: false as const, message: "无法进入销售测试：请先记录至少一条通过的打印测试。" }; return { ok: true as const }; }
