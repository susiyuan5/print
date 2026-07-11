import type { WorkbenchData } from "../types/workbench";

export const sampleData: WorkbenchData = {
  version: 2,
  updatedAt: "2026-06-16T00:00:00.000Z",
  models: [
    {
      id: "model_rx78",
      name: "RX-78-2 高达",
      brand: "万代",
      series: "HG",
      scale: "1/144",
      status: "in_progress",
      tags: ["机甲", "白蓝红", "练习件"],
      imageUrl: "https://images.unsplash.com/photo-1631373339959-a45900447f71?auto=format&fit=crop&w=1200&q=80",
      notes: "计划尝试低饱和白色和轻微旧化。",
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z"
    },
    {
      id: "model_car",
      name: "经典跑车外壳",
      brand: "Tamiya",
      scale: "1/24",
      status: "planned",
      tags: ["车辆", "亮面"],
      imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
      notes: "用于测试清漆和抛光流程。",
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z"
    }
  ],
  paints: [
    { id: "paint_warm_white", name: "暖白", brand: "Gaia", code: "EX-01", hex: "#f1eee4", finish: "matte", notes: "机甲外甲主色。" },
    { id: "paint_signal_blue", name: "信号蓝", brand: "Mr.Color", code: "C80", hex: "#1d5fa7", finish: "satin", notes: "胸甲和肩部辅色。" },
    { id: "paint_vivid_red", name: "鲜红", brand: "Gaia", code: "003", hex: "#d83b32", finish: "gloss", notes: "点缀色，少量使用。" },
    { id: "paint_frame_gray", name: "骨架灰", brand: "自调", code: "灰黑 3:1", hex: "#555b62", finish: "matte", notes: "内构和机械零件。" }
  ],
  colorSchemes: [
    {
      id: "scheme_gundam_low_sat",
      name: "低饱和高达经典配色",
      description: "保留经典白蓝红，但整体降低饱和度，适合轻旧化。",
      modelIds: ["model_rx78"],
      tags: ["机甲", "经典", "低饱和"],
      colors: [
        { paintId: "paint_warm_white", role: "main", layerType: "base", percentage: 70, ratio: "原液", notes: "外甲大面积主色。" },
        { paintId: "paint_signal_blue", role: "secondary", layerType: "base", percentage: 20, notes: "胸部和脚部。" },
        { paintId: "paint_vivid_red", role: "accent", layerType: "detail", percentage: 10, notes: "下巴、盾牌和小面积强调。" }
      ],
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z"
    }
  ],
  projects: [
    {
      id: "project_rx78",
      name: "RX-78-2 低饱和喷涂项目",
      modelId: "model_rx78",
      status: "painting",
      goal: "做一个干净但有轻微战损感的经典白蓝红机体。",
      styleKeywords: ["低饱和", "轻旧化", "经典配色"],
      colorSchemeIds: ["scheme_gundam_low_sat"],
      sprayLogIds: ["log_rx78_primer"],
      imageIds: [],
      startedAt: "2026-06-16",
      notes: "优先验证白色层次和蓝色遮盖边界。",
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z"
    }
  ],
  workshopImages: [],
  colorLabExperiments: [],
  aiRepaintConcepts: [],
  paintRecipes: [],
  parameterTemplates: [
    {
      id: "water_basic",
      name: "水性漆基础喷涂",
      layerType: "base",
      ratio: "漆 1 : 稀释剂 1.5",
      thinner: "水性专用稀释剂",
      pressure: "16-18 PSI",
      technique: "薄喷两到三层，每层间隔 5 分钟。",
      notes: "适合大面积主色，先轻喷建立附着，再湿喷收面。"
    },
    {
      id: "metal_low_pressure",
      name: "金属色低压薄喷",
      layerType: "detail",
      ratio: "漆 1 : 稀释剂 2",
      thinner: "缓干型稀释剂",
      pressure: "12-14 PSI",
      technique: "低压薄喷，避免一次喷得过湿。",
      notes: "适合金属颗粒均匀铺开，底色建议先做黑色或深灰。"
    },
    {
      id: "varnish_wet",
      name: "保护漆湿喷",
      layerType: "varnish",
      ratio: "漆 1 : 稀释剂 1.2",
      thinner: "对应保护漆稀释剂",
      pressure: "18-20 PSI",
      technique: "先薄雾层，再湿喷一层形成均匀光泽。",
      notes: "注意边角积漆，湿喷后放入防尘环境干燥。"
    }
  ],
  sprayLogs: [
    {
      id: "log_rx78_primer",
      modelId: "model_rx78",
      title: "外甲底漆和主白测试",
      date: "2026-06-16",
      imageUrls: ["https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=1200&q=80"],
      resultNotes: "暖白遮盖力足够，下一次需要把蓝色区域边界遮盖得更干净。",
      steps: [
        { id: "step_primer", layerType: "primer", paintIds: ["paint_frame_gray"], title: "灰色底漆", ratio: "1:1.5", thinner: "标准稀释剂", pressure: "18 PSI", technique: "薄喷两层", notes: "检查表面瑕疵。" },
        { id: "step_white", layerType: "base", paintIds: ["paint_warm_white"], title: "暖白主色", ratio: "1:1.2", thinner: "缓干稀释剂", pressure: "16 PSI", technique: "湿喷收面", notes: "保留轻微明度变化。" }
      ],
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z"
    }
  ]
};
