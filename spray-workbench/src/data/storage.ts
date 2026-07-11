import { sampleData } from "./sampleData";
import { sprayStepTemplates } from "./stepTemplates";
import { parseWorkbenchData } from "./validators";
import type { ImageStorageType, WorkbenchData } from "../types/workbench";
import { inferColorFamily, inferTemperature } from "../utils/colors";

export const STORAGE_KEY = "spray-workbench:data:v1";

export type DataSource = "localStorage" | "sample";

export interface LoadedData {
  data: WorkbenchData;
  source: DataSource;
  warning?: string;
}

export function normalizeWorkbenchData(data: WorkbenchData): WorkbenchData {
  return {
    ...data,
    modelAssets: data.modelAssets ?? [],
    paints: data.paints.map((paint) => ({
      ...paint,
      paintType: paint.paintType ?? "other",
      opacity: paint.opacity ?? "high_coverage",
      temperature: paint.temperature ?? inferTemperature(paint.hex),
      colorFamily: paint.colorFamily ?? inferColorFamily(paint.hex, paint.finish),
      favorite: paint.favorite ?? false,
    })),
    projects: data.projects ?? [],
    workshopImages: (data.workshopImages ?? []).map((image) => {
      const storageType: ImageStorageType = image.storageType ?? (image.dataUrl ? "dataUrl" : image.imageUrl ? "remoteUrl" : "dataUrl");
      return {
        ...image,
        storageType,
        dataUrl: storageType === "dataUrl" ? image.dataUrl : image.dataUrl,
        imageUrl: storageType === "remoteUrl" ? image.imageUrl : image.imageUrl,
        localRelativePath: storageType === "localFile" ? image.localRelativePath : image.localRelativePath,
        title: image.title ?? "",
        notes: image.notes ?? "",
        capturedAt: image.capturedAt ?? "",
        stepId: image.stepId ?? undefined,
        originalSizeBytes: image.originalSizeBytes ?? image.sizeBytes,
        updatedAt: image.updatedAt ?? image.createdAt,
      };
    }),
    parameterTemplates: data.parameterTemplates?.length ? data.parameterTemplates : sprayStepTemplates,
    colorLabExperiments: data.colorLabExperiments ?? [],
    aiRepaintConcepts: data.aiRepaintConcepts ?? [],
    paintRecipes: data.paintRecipes ?? [],
    productOpportunities: data.productOpportunities ?? [],
    marketSources: data.marketSources ?? [],
    licenseRecords: data.licenseRecords ?? [],
    productTestRecords: data.productTestRecords ?? [],
  };
}

export function loadData(): LoadedData {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { data: normalizeWorkbenchData(sampleData), source: "sample" };

  try {
    return { data: normalizeWorkbenchData(parseWorkbenchData(JSON.parse(raw))), source: "localStorage" };
  } catch {
    return {
      data: normalizeWorkbenchData(sampleData),
      source: "sample",
      warning: "本地保存的数据无法读取，已加载示例数据。",
    };
  }
}

export function saveData(data: WorkbenchData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeWorkbenchData(data), null, 2));
}

export function resetData() {
  const data = normalizeWorkbenchData(sampleData);
  saveData(data);
  return data;
}

export function downloadJson(data: WorkbenchData) {
  const blob = new Blob([JSON.stringify(normalizeWorkbenchData(data), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `spray-digital-workshop-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
