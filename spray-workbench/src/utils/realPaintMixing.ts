import spectral from "spectral.js";
import type { PaintColor, PaintRecipeItem } from "../types/workbench";
import { normalizeHex } from "./colorMath";
import { computeEstimatedColor } from "./paintMixing";

export interface RecipeEstimate {
  rgbEstimatedColorHex: string;
  pigmentEstimatedColorHex?: string;
  estimateMethod: "rgb" | "rgb_and_pigment";
  warning: string;
}

export function computeRgbEstimate(items: PaintRecipeItem[], paints: PaintColor[]) {
  return computeEstimatedColor(items, paints);
}

export function computePigmentEstimate(items: PaintRecipeItem[], paints: PaintColor[]) {
  try {
    const spectralItems = items
      .map((item) => {
        const paint = paints.find((candidate) => candidate.id === item.paintId);
        const weight = item.computedPercent ?? item.amount;
        if (!paint || weight <= 0) return undefined;
        return [new spectral.Color(normalizeHex(paint.hex)), weight] as [InstanceType<typeof spectral.Color>, number];
      })
      .filter(Boolean) as Array<[InstanceType<typeof spectral.Color>, number]>;

    if (spectralItems.length === 0) return undefined;
    return normalizeHex(spectral.mix(...spectralItems).toString());
  } catch {
    return undefined;
  }
}

export function computeRecipeEstimate(items: PaintRecipeItem[], paints: PaintColor[]): RecipeEstimate {
  const rgbEstimatedColorHex = computeRgbEstimate(items, paints);
  const pigmentEstimatedColorHex = computePigmentEstimate(items, paints);
  return {
    rgbEstimatedColorHex,
    pigmentEstimatedColorHex,
    estimateMethod: pigmentEstimatedColorHex ? "rgb_and_pigment" : "rgb",
    warning: pigmentEstimatedColorHex
      ? "颜料模型预估比 RGB 平均更接近颜料混合思路，但仍不代表真实喷涂结果，实际颜色需要试色确认。"
      : "颜料模型预估暂不可用，当前仅显示 RGB 屏幕预估。RGB 加权平均只适合作为最低级屏幕参考。",
  };
}
