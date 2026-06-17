import type { PaintColor, PaintColorFamily, PaintRecipeItem, PaintType } from "../types/workbench";
import { compareColors } from "./colorCompare";
import { getDeltaE, scoreColorMatch, sortColorsByDeltaE } from "./perceptualColor";
import { computeRecipeEstimate } from "./realPaintMixing";

export interface RecommendationOptions {
  brand?: string;
  paintType?: PaintType | "";
  colorFamily?: PaintColorFamily | "";
  onlyFavorite?: boolean;
  allowTransparent?: boolean;
  allowMetallic?: boolean;
  stepPercent?: 5 | 10;
}

export interface RecipeRecommendation {
  id: string;
  type: "single" | "two_color" | "three_color";
  items: PaintRecipeItem[];
  rgbEstimatedColorHex: string;
  pigmentEstimatedColorHex?: string;
  deltaE?: number;
  score: number;
  scoreLabel: string;
  suggestions: string[];
}

function isMixablePaint(paint: PaintColor, options: RecommendationOptions) {
  const text = `${paint.name} ${paint.brand ?? ""} ${paint.code ?? ""} ${paint.notes ?? ""}`.toLowerCase();
  const excluded = ["thinner", "稀释", "gloss_clear", "semi_gloss_clear", "matte_clear", "flattening_agent", "光油", "消光剂"];
  if (excluded.some((word) => text.includes(word))) return false;
  if (!options.allowTransparent && (paint.finish === "transparent" || paint.opacity === "transparent" || paint.colorFamily === "transparent")) return false;
  if (!options.allowMetallic && (paint.finish === "metallic" || paint.colorFamily === "metallic" || text.includes("pearl") || text.includes("珠光"))) return false;
  if (options.brand && paint.brand !== options.brand) return false;
  if (options.paintType && paint.paintType !== options.paintType) return false;
  if (options.colorFamily && paint.colorFamily !== options.colorFamily) return false;
  if (options.onlyFavorite && !paint.favorite) return false;
  return true;
}

function candidateFromItems(targetHex: string, paints: PaintColor[], type: RecipeRecommendation["type"], items: PaintRecipeItem[], id: string): RecipeRecommendation {
  const estimate = computeRecipeEstimate(items, paints);
  const colorForScore = estimate.pigmentEstimatedColorHex ?? estimate.rgbEstimatedColorHex;
  const deltaE = getDeltaE(targetHex, colorForScore);
  const match = scoreColorMatch(deltaE);
  return {
    id,
    type,
    items,
    rgbEstimatedColorHex: estimate.rgbEstimatedColorHex,
    pigmentEstimatedColorHex: estimate.pigmentEstimatedColorHex,
    deltaE,
    score: match.score,
    scoreLabel: match.label,
    suggestions: compareColors(targetHex, colorForScore).suggestions,
  };
}

export function findNearestPaints(targetHex: string, paints: PaintColor[], options: RecommendationOptions = {}) {
  return sortColorsByDeltaE(targetHex, paints.filter((paint) => isMixablePaint(paint, options))).slice(0, 5);
}

export function rankByDeltaE(targetHex: string, candidates: RecipeRecommendation[]) {
  return [...candidates].sort((a, b) => (a.deltaE ?? Number.POSITIVE_INFINITY) - (b.deltaE ?? Number.POSITIVE_INFINITY));
}

export function recommendTwoPaintRecipes(targetHex: string, paints: PaintColor[], options: RecommendationOptions = {}) {
  const step = options.stepPercent ?? 10;
  const candidates = findNearestPaints(targetHex, paints, options).slice(0, 12).map((item) => item.paint);
  const results: RecipeRecommendation[] = [];
  for (let a = 0; a < candidates.length; a += 1) {
    for (let b = a + 1; b < candidates.length; b += 1) {
      for (let percentA = step; percentA < 100; percentA += step) {
        const percentB = 100 - percentA;
        results.push(candidateFromItems(targetHex, paints, "two_color", [
          { paintId: candidates[a].id, amount: percentA, computedPercent: percentA },
          { paintId: candidates[b].id, amount: percentB, computedPercent: percentB },
        ], `two-${candidates[a].id}-${candidates[b].id}-${percentA}`));
      }
    }
  }
  return rankByDeltaE(targetHex, results).slice(0, 5);
}

export function recommendThreePaintRecipes(targetHex: string, paints: PaintColor[], options: RecommendationOptions = {}) {
  const step = options.stepPercent ?? 10;
  const candidates = findNearestPaints(targetHex, paints, options).slice(0, 12).map((item) => item.paint);
  const results: RecipeRecommendation[] = [];
  for (let a = 0; a < candidates.length; a += 1) {
    for (let b = a + 1; b < candidates.length; b += 1) {
      for (let c = b + 1; c < candidates.length; c += 1) {
        for (let percentA = step; percentA <= 80; percentA += step) {
          for (let percentB = step; percentB <= 90 - percentA; percentB += step) {
            const percentC = 100 - percentA - percentB;
            if (percentC <= 0) continue;
            results.push(candidateFromItems(targetHex, paints, "three_color", [
              { paintId: candidates[a].id, amount: percentA, computedPercent: percentA },
              { paintId: candidates[b].id, amount: percentB, computedPercent: percentB },
              { paintId: candidates[c].id, amount: percentC, computedPercent: percentC },
            ], `three-${candidates[a].id}-${candidates[b].id}-${candidates[c].id}-${percentA}-${percentB}`));
          }
        }
      }
    }
  }
  return rankByDeltaE(targetHex, results).slice(0, 5);
}
