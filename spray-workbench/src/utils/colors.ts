import type { ColorRole, ModelStatus, PaintFinish, PaintLayerType, PreviewShape } from "../types/workbench";

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
