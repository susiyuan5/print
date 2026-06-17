import type { PaintColor, PaintRecipeItem, PaintRecipeUnitMode } from "../types/workbench";
import { mixRgbWeighted } from "./colorMath";

export function computePercentFromParts(amount: number, total: number) {
  return total > 0 ? (amount / total) * 100 : 0;
}

export function computePercentFromDrops(amount: number, total: number) {
  return computePercentFromParts(amount, total);
}

export function computePercentFromMl(amount: number, total: number) {
  return computePercentFromParts(amount, total);
}

export function computeMlFromPercent(percent: number, targetTotalMl = 0) {
  return targetTotalMl > 0 ? (percent / 100) * targetTotalMl : undefined;
}

export function computeRecipeItems(items: PaintRecipeItem[], unitMode: PaintRecipeUnitMode, targetTotalMl?: number) {
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return items.map((item) => {
    const amount = Number(item.amount) || 0;
    const computedPercent = unitMode === "percent"
      ? amount
      : unitMode === "drops"
        ? computePercentFromDrops(amount, total)
        : unitMode === "ml"
          ? computePercentFromMl(amount, total)
          : computePercentFromParts(amount, total);
    return {
      ...item,
      amount,
      computedPercent: Math.round(computedPercent * 100) / 100,
      computedMl: computeMlFromPercent(computedPercent, targetTotalMl),
    };
  });
}

export function computeEstimatedColor(items: PaintRecipeItem[], paints: PaintColor[]) {
  return mixRgbWeighted(items.map((item) => ({
    hex: paints.find((paint) => paint.id === item.paintId)?.hex ?? "#808080",
    weight: item.computedPercent ?? item.amount,
  })));
}

export function parsePaintToThinnerRatio(value: string) {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*[:：]\s*(\d+(?:\.\d+)?)$/);
  if (!match) return undefined;
  return { paint: Number(match[1]), thinner: Number(match[2]) };
}

export function unitModeLabel(unitMode: PaintRecipeUnitMode) {
  if (unitMode === "percent") return "百分比";
  if (unitMode === "parts") return "份数";
  if (unitMode === "drops") return "滴数";
  return "毫升";
}
