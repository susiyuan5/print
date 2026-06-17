import type { ColorRole, ModelStatus, PaintColorFamily, PaintFinish, PaintLayerType, PaintOpacity, PaintTemperature, PaintType, PreviewShape } from "../types/workbench";

export const statusLabels: Record<ModelStatus, string> = {
  planned: "计划中",
  in_progress: "制作中",
  painted: "已喷涂",
  finished: "已完成",
  archived: "已归档",
};

export const layerLabels: Record<PaintLayerType, string> = {
  primer: "底漆",
  base: "主色",
  shade: "阴影",
  highlight: "高光",
  detail: "细节",
  wash: "渗线",
  varnish: "保护漆",
  other: "其他",
};

export const finishLabels: Record<PaintFinish, string> = {
  matte: "消光",
  satin: "半光",
  gloss: "光泽",
  metallic: "金属",
  transparent: "透明",
  other: "其他",
};

export const paintTypeLabels: Record<PaintType, string> = {
  water_based: "水性漆",
  lacquer: "硝基漆",
  enamel: "珐琅漆",
  acrylic: "丙烯",
  other: "其他",
};

export const opacityLabels: Record<PaintOpacity, string> = {
  transparent: "透明",
  semi_transparent: "半透明",
  high_coverage: "高遮盖",
};

export const temperatureLabels: Record<PaintTemperature, string> = {
  cool: "冷色",
  neutral: "中性",
  warm: "暖色",
};

export const colorFamilyLabels: Record<PaintColorFamily, string> = {
  red: "红",
  orange: "橙",
  yellow: "黄",
  green: "绿",
  blue: "蓝",
  purple: "紫",
  black: "黑",
  white: "白",
  gray: "灰",
  brown: "棕",
  metallic: "金属",
  transparent: "透明",
  other: "其他",
};

export const roleLabels: Record<ColorRole, string> = {
  main: "主色",
  secondary: "辅色",
  accent: "点缀色",
  detail: "细节色",
  other: "其他",
};

export const shapeLabels: Record<PreviewShape, string> = {
  car: "车辆",
  aircraft: "飞行器",
  robot: "机器人",
  part: "零件",
};

export function splitTags(value: string) {
  return value
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function joinTags(tags: string[]) {
  return tags.join("，");
}

export function inferColorFamily(hex: string, finish?: PaintFinish): PaintColorFamily {
  if (finish === "metallic") return "metallic";
  if (finish === "transparent") return "transparent";
  const value = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return "other";
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (lightness < 0.12) return "black";
  if (lightness > 0.9 && delta < 0.08) return "white";
  if (delta < 0.08) return "gray";
  let hue = 0;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  if (max === g) hue = 60 * ((b - r) / delta + 2);
  if (max === b) hue = 60 * ((r - g) / delta + 4);
  hue = ((hue % 360) + 360) % 360;
  if (hue < 15 || hue >= 345) return "red";
  if (hue < 45) return lightness < 0.45 ? "brown" : "orange";
  if (hue < 70) return "yellow";
  if (hue < 165) return "green";
  if (hue < 255) return "blue";
  if (hue < 300) return "purple";
  return "red";
}

export function inferTemperature(hex: string): PaintTemperature {
  const family = inferColorFamily(hex);
  if (["red", "orange", "yellow", "brown"].includes(family)) return "warm";
  if (["green", "blue", "purple"].includes(family)) return "cool";
  return "neutral";
}
