import type { GeneratedColor } from "../types/workbench";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export interface HarmonyGroup {
  id: string;
  name: string;
  description: string;
  colors: GeneratedColor[];
}

const fallbackHex = "#808080";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHue(hue: number) {
  return ((hue % 360) + 360) % 360;
}

export function normalizeHex(hex: string) {
  const value = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(value)) return `#${value.toUpperCase()}`;
  return fallbackHex;
}

export function getHexError(hex: string) {
  const value = hex.trim();
  if (/^#?[0-9a-fA-F]{6}$/.test(value)) return "";
  return "HEX 格式无效，请使用 #RRGGBB，例如 #2F6F73。";
}

export function hexToRgb(hex: string): RgbColor {
  const safeHex = normalizeHex(hex).replace("#", "");
  return {
    r: parseInt(safeHex.slice(0, 2), 16),
    g: parseInt(safeHex.slice(2, 4), 16),
    b: parseInt(safeHex.slice(4, 6), 16),
  };
}

export function rgbToHex(rgb: RgbColor) {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function rgbToHsl(rgb: RgbColor): HslColor {
  const r = clamp(rgb.r, 0, 255) / 255;
  const g = clamp(rgb.g, 0, 255) / 255;
  const b = clamp(rgb.b, 0, 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    if (max === g) h = 60 * ((b - r) / delta + 2);
    if (max === b) h = 60 * ((r - g) / delta + 4);
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h: normalizeHue(Math.round(h)), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb(hsl: HslColor): RgbColor {
  const h = normalizeHue(hsl.h);
  const s = clamp(hsl.s, 0, 100) / 100;
  const l = clamp(hsl.l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rotateHue(hex: string, degrees: number) {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, h: normalizeHue(hsl.h + degrees) }));
}

function toGeneratedColor(role: string, hex: string, notes?: string): GeneratedColor {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  return {
    role,
    hex,
    rgb: formatRgb(rgb),
    hsl: formatHsl(hsl),
    notes,
  };
}

export function generateHarmony(hex: string): HarmonyGroup[] {
  const baseHex = normalizeHex(hex);
  return [
    {
      id: "complementary",
      name: "互补色",
      description: "适合做强对比点缀或敌我识别色。",
      colors: [toGeneratedColor("点缀色", rotateHue(baseHex, 180), "H + 180")],
    },
    {
      id: "analogous",
      name: "类似色",
      description: "适合做主色、辅色和柔和高光。",
      colors: [
        toGeneratedColor("辅色", rotateHue(baseHex, -30), "H - 30"),
        toGeneratedColor("高光色", rotateHue(baseHex, 30), "H + 30"),
      ],
    },
    {
      id: "triadic",
      name: "三角配色",
      description: "适合机甲、载具等需要清晰区域分色的方案。",
      colors: [
        toGeneratedColor("辅色", rotateHue(baseHex, 120), "H + 120"),
        toGeneratedColor("点缀色", rotateHue(baseHex, 240), "H + 240"),
      ],
    },
    {
      id: "split_complementary",
      name: "分裂互补色",
      description: "比互补色更稳，适合大面积主色配两个小面积强调。",
      colors: [
        toGeneratedColor("阴影色", rotateHue(baseHex, 150), "H + 150"),
        toGeneratedColor("点缀色", rotateHue(baseHex, 210), "H + 210"),
      ],
    },
    {
      id: "tetradic",
      name: "四方配色",
      description: "适合复杂模型的多区域分色，使用时建议控制比例。",
      colors: [
        toGeneratedColor("辅色", rotateHue(baseHex, 90), "H + 90"),
        toGeneratedColor("阴影色", rotateHue(baseHex, 180), "H + 180"),
        toGeneratedColor("点缀色", rotateHue(baseHex, 270), "H + 270"),
      ],
    },
  ];
}

export function mixRgbWeighted(items: Array<{ hex: string; weight: number }>) {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (total <= 0) return fallbackHex;
  const mixed = items.reduce(
    (acc, item) => {
      const rgb = hexToRgb(item.hex);
      const weight = Math.max(0, item.weight);
      return {
        r: acc.r + rgb.r * weight,
        g: acc.g + rgb.g * weight,
        b: acc.b + rgb.b * weight,
      };
    },
    { r: 0, g: 0, b: 0 },
  );
  // 真实颜料混色不是简单 RGB 平均；MVP 仅用于记录和粗略预览，后续可升级为更接近颜料的混色模型。
  return rgbToHex({ r: mixed.r / total, g: mixed.g / total, b: mixed.b / total });
}

export function formatRgb(rgb: RgbColor) {
  return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
}

export function formatHsl(hsl: HslColor) {
  return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}
