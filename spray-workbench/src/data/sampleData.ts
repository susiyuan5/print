import type { WorkbenchData } from "../types/workbench";

export const sampleData: WorkbenchData = {
  version: 1,
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
        { paintId: "paint_warm_white", role: "main", layerType: "base", ratio: "原液", notes: "外甲大面积主色。" },
        { paintId: "paint_signal_blue", role: "secondary", layerType: "base", notes: "胸部和脚部。" },
        { paintId: "paint_vivid_red", role: "accent", layerType: "detail", notes: "下巴、盾牌和小面积强调。" }
      ],
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z"
    }
  ],
  sprayLogs: [
    {
      id: "log_rx78_primer",
      modelId: "model_rx78",
      title: "外甲底漆和主白测试",
      date: "2026-06-16",
      imageUrls: [],
      resultNotes: "暖白遮盖力足够，下一次需要把蓝色区域边界遮盖得更干净。",
      steps: [
        { id: "step_primer", layerType: "primer", paintIds: ["paint_frame_gray"], title: "灰色底漆", thinner: "1:1.5", pressure: "18 PSI", technique: "薄喷两层", notes: "检查表面瑕疵。" },
        { id: "step_white", layerType: "base", paintIds: ["paint_warm_white"], title: "暖白主色", thinner: "1:1.2", pressure: "16 PSI", technique: "湿喷收面", notes: "保留轻微明度变化。" }
      ],
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z"
    }
  ]
};
