import { formatHsl, formatRgb, hexToRgb, normalizeHex, rgbToHsl } from "./colorMath";

export function compareColors(targetHex: string, estimatedHex: string) {
  const target = hexToRgb(normalizeHex(targetHex));
  const estimated = hexToRgb(normalizeHex(estimatedHex));
  const targetHsl = rgbToHsl(target);
  const estimatedHsl = rgbToHsl(estimated);
  const rgbDelta = {
    r: estimated.r - target.r,
    g: estimated.g - target.g,
    b: estimated.b - target.b,
  };
  const hslDelta = {
    h: estimatedHsl.h - targetHsl.h,
    s: estimatedHsl.s - targetHsl.s,
    l: estimatedHsl.l - targetHsl.l,
  };
  const suggestions: string[] = [];
  if (hslDelta.l < -6) suggestions.push("经验建议：预估色偏暗，可尝试加白色或提高亮色比例。");
  if (hslDelta.l > 6) suggestions.push("经验建议：预估色偏亮，可尝试加灰色、黑色或降低白色比例。");
  if (hslDelta.h > 8) suggestions.push("经验建议：色相可能偏冷，可尝试少量加入暖色。");
  if (hslDelta.h < -8) suggestions.push("经验建议：色相可能偏暖，可尝试少量加入冷色。");
  if (hslDelta.s > 8) suggestions.push("经验建议：饱和度偏高，可尝试加灰色或少量互补色中和。");
  if (hslDelta.s < -8) suggestions.push("经验建议：饱和度偏低，可尝试增加主色比例。");
  if (suggestions.length === 0) suggestions.push("经验建议：预估色与目标色接近，可先做小面积试色确认。");
  return {
    targetRgb: formatRgb(target),
    estimatedRgb: formatRgb(estimated),
    targetHsl: formatHsl(targetHsl),
    estimatedHsl: formatHsl(estimatedHsl),
    rgbDelta,
    hslDelta,
    suggestions,
  };
}
