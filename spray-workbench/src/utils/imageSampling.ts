import type { MouseEvent } from "react";
import { formatHsl, formatRgb, rgbToHex, rgbToHsl, type RgbColor } from "./colorMath";
import { getPerceptualColorInfo } from "./perceptualColor";

export type SampleSize = 1 | 3 | 5;

export interface SampledColor {
  hex: string;
  rgb: string;
  hsl: string;
  lab: string;
  oklab: string;
  x: number;
  y: number;
  sampleSize: SampleSize;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function sampleCanvasColor(canvas: HTMLCanvasElement, x: number, y: number, sampleSize: SampleSize): SampledColor {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法读取图片画布。");
  const radius = Math.floor(sampleSize / 2);
  const startX = clamp(Math.round(x) - radius, 0, canvas.width - 1);
  const startY = clamp(Math.round(y) - radius, 0, canvas.height - 1);
  const width = Math.min(sampleSize, canvas.width - startX);
  const height = Math.min(sampleSize, canvas.height - startY);
  const pixels = context.getImageData(startX, startY, width, height).data;
  const totalPixels = pixels.length / 4;
  const rgb: RgbColor = { r: 0, g: 0, b: 0 };

  for (let index = 0; index < pixels.length; index += 4) {
    rgb.r += pixels[index];
    rgb.g += pixels[index + 1];
    rgb.b += pixels[index + 2];
  }

  rgb.r /= totalPixels;
  rgb.g /= totalPixels;
  rgb.b /= totalPixels;
  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  const perceptual = getPerceptualColorInfo(hex);
  return {
    hex,
    rgb: formatRgb(rgb),
    hsl: formatHsl(hsl),
    lab: perceptual.lab,
    oklab: perceptual.oklab,
    x: Math.round(x),
    y: Math.round(y),
    sampleSize,
  };
}

export function getCanvasPointFromImageClick(image: HTMLImageElement, event: MouseEvent<HTMLImageElement>) {
  const rect = image.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * image.naturalWidth;
  const y = ((event.clientY - rect.top) / rect.height) * image.naturalHeight;
  return { x, y };
}
