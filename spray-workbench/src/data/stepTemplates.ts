import type { PaintLayerType } from "../types/workbench";

export interface SprayStepTemplate {
  id: string;
  name: string;
  layerType: PaintLayerType;
  ratio: string;
  thinner: string;
  pressure: string;
  technique: string;
  notes: string;
}

export const sprayStepTemplates: SprayStepTemplate[] = [
  {
    id: "water_basic",
    name: "水性漆基础喷涂",
    layerType: "base",
    ratio: "漆 1 : 稀释剂 1.5",
    thinner: "水性专用稀释剂",
    pressure: "16-18 PSI",
    technique: "薄喷两到三层，每层间隔 5 分钟。",
    notes: "适合大面积主色，先轻喷建立附着，再湿喷收面。",
  },
  {
    id: "metal_low_pressure",
    name: "金属色低压薄喷",
    layerType: "detail",
    ratio: "漆 1 : 稀释剂 2",
    thinner: "缓干型稀释剂",
    pressure: "12-14 PSI",
    technique: "低压薄喷，避免一次喷得过湿。",
    notes: "适合金属颗粒均匀铺开，底色建议先做黑色或深灰。",
  },
  {
    id: "varnish_wet",
    name: "保护漆湿喷",
    layerType: "varnish",
    ratio: "漆 1 : 稀释剂 1.2",
    thinner: "对应保护漆稀释剂",
    pressure: "18-20 PSI",
    technique: "先薄雾层，再湿喷一层形成均匀光泽。",
    notes: "注意边角积漆，湿喷后放入防尘环境干燥。",
  },
];
