import Color from "colorjs.io";
import type { PaintColor } from "../types/workbench";
import { normalizeHex } from "./colorMath";

export interface PerceptualColorInfo {
  hex: string;
  lab: string;
  oklab: string;
  error?: string;
}

function isHexLike(input: string) {
  return /^#?[0-9a-fA-F]{6}$/.test(input.trim());
}

export function safeColorToHex(input: string) {
  if (!isHexLike(input)) return { hex: "#808080", error: "HEX 格式无效，已使用中性灰作为安全兜底。" };
  return { hex: normalizeHex(input) };
}

function makeColor(hex: string) {
  const safe = safeColorToHex(hex);
  return { color: new Color(safe.hex), hex: safe.hex, error: safe.error };
}

export function getDeltaE(targetHex: string, candidateHex: string) {
  try {
    const target = makeColor(targetHex);
    const candidate = makeColor(candidateHex);
    return Math.round(target.color.deltaE(candidate.color, "2000") * 100) / 100;
  } catch {
    return undefined;
  }
}

export function getLabColor(hex: string) {
  try {
    const { color } = makeColor(hex);
    const [l, a, b] = color.to("lab").coords;
    return { l: Number(l) || 0, a: Number(a) || 0, b: Number(b) || 0 };
  } catch {
    return undefined;
  }
}

export function getOklabColor(hex: string) {
  try {
    const { color } = makeColor(hex);
    const [l, a, b] = color.to("oklab").coords;
    return { l: Number(l) || 0, a: Number(a) || 0, b: Number(b) || 0 };
  } catch {
    return undefined;
  }
}

export function formatLab(values?: { l: number; a: number; b: number }) {
  if (!values) return "Lab 暂不可用";
  return `L ${values.l.toFixed(1)} / a ${values.a.toFixed(1)} / b ${values.b.toFixed(1)}`;
}

export function formatOklab(values?: { l: number; a: number; b: number }) {
  if (!values) return "OKLab 暂不可用";
  return `L ${values.l.toFixed(3)} / a ${values.a.toFixed(3)} / b ${values.b.toFixed(3)}`;
}

export function getPerceptualColorInfo(hex: string): PerceptualColorInfo {
  const safe = safeColorToHex(hex);
  return {
    hex: safe.hex,
    lab: formatLab(getLabColor(safe.hex)),
    oklab: formatOklab(getOklabColor(safe.hex)),
    error: safe.error,
  };
}

export function scoreColorMatch(deltaE?: number) {
  if (deltaE === undefined || Number.isNaN(deltaE)) return { score: 0, label: "无法评分" };
  const score = Math.max(0, Math.min(100, Math.round(100 - deltaE * 2)));
  const label = deltaE < 2 ? "非常接近" : deltaE < 5 ? "接近" : deltaE < 12 ? "可作为试色起点" : "差异明显";
  return { score, label };
}

export function sortColorsByDeltaE(targetHex: string, colors: PaintColor[]) {
  return colors
    .map((paint) => {
      const deltaE = getDeltaE(targetHex, paint.hex);
      return { paint, deltaE, match: scoreColorMatch(deltaE) };
    })
    .sort((a, b) => (a.deltaE ?? Number.POSITIVE_INFINITY) - (b.deltaE ?? Number.POSITIVE_INFINITY));
}
