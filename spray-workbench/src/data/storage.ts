import { sampleData } from "./sampleData";
import { parseWorkbenchData } from "./validators";
import type { WorkbenchData } from "../types/workbench";

export const STORAGE_KEY = "spray-workbench:data:v1";

export type DataSource = "localStorage" | "sample";

export interface LoadedData {
  data: WorkbenchData;
  source: DataSource;
  warning?: string;
}

export function loadData(): LoadedData {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { data: sampleData, source: "sample" };

  try {
    return { data: parseWorkbenchData(JSON.parse(raw)), source: "localStorage" };
  } catch {
    return {
      data: sampleData,
      source: "sample",
      warning: "本地保存的数据无法读取，已加载示例数据。",
    };
  }
}

export function saveData(data: WorkbenchData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2));
}

export function resetData() {
  saveData(sampleData);
  return sampleData;
}

export function downloadJson(data: WorkbenchData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `spray-workbench-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
