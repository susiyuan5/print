import { sampleData } from "./sampleData";
import { sprayStepTemplates } from "./stepTemplates";
import { parseWorkbenchData } from "./validators";
import type { ImageStorageType, ProductOpportunity, WorkbenchData } from "../types/workbench";
import { inferColorFamily, inferTemperature } from "../utils/colors";

export const STORAGE_KEY = "spray-workbench:data:v1";
export const legacyStarterProductNames = new Set([
  "机械齿轮解压玩具", "无磁指尖滑块", "手柄支架", "桌下耳机挂架", "模块化理线器",
  "带托盘花盆", "个性化姓名花盆", "宠物剪影纪念品", "光栅灯罩", "婚礼姓名牌",
  "洞洞板工具挂架", "房车收纳挂钩", "滑雪手套烘干架", "家电替换旋钮", "特定型号替换卡扣",
]);

function isLegacyStarterProduct(product: ProductOpportunity) {
  return legacyStarterProductNames.has(product.name)
    && product.description.startsWith("初始候选：")
    && !product.radarItemId
    && !product.radarProvenance
    && product.sourceLinks.length === 0
    && product.evidenceNotes.length === 0
    && !(product.modelIds?.length || product.modelAssetIds?.length || product.modelAssetId)
    && !(product.projectIds?.length || product.colorSchemeIds?.length || product.sprayLogIds?.length)
    && !(product.statusHistory?.length || product.productionStatus || product.sourceImages?.length || product.prototypeImageIds?.length);
}

export type DataSource = "localStorage" | "sample";
const DB_NAME = "spray-workbench:data";
const STORE = "workspace";
const DATA_KEY = "current";
const SNAPSHOTS_KEY = "snapshots";
const MAX_SNAPSHOTS = 10;

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
    // Only the old, fully identifiable seed records are removed. Imported and manually created products stay intact.
    productOpportunities: (data.productOpportunities ?? []).filter((product) => !isLegacyStarterProduct(product)),
    marketSources: (data.marketSources ?? []).map((source) => ({ ...source, productId: source.productId ?? (source.id.includes(":") ? source.id.split(":")[0] : undefined) })),
    licenseRecords: data.licenseRecords ?? [],
    productTestRecords: data.productTestRecords ?? [],
    salesTestRecords: data.salesTestRecords ?? [],
    sprayReviews: data.sprayReviews ?? [],
    version: 2,
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

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readStore<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => { const request = db.transaction(STORE).objectStore(STORE).get(key); request.onsuccess = () => resolve(request.result as T | undefined); request.onerror = () => reject(request.error); });
}

export async function loadIndexedData(): Promise<WorkbenchData | undefined> {
  if (typeof indexedDB === "undefined") return undefined;
  const db = await openDb();
  try { const value = await readStore<unknown>(db, DATA_KEY); return value ? normalizeWorkbenchData(parseWorkbenchData(value)) : undefined; } finally { db.close(); }
}

export async function saveIndexedData(data: WorkbenchData) {
  if (typeof indexedDB === "undefined") return;
  const normalized = normalizeWorkbenchData(data);
  const db = await openDb();
  try {
    const existing = await readStore<Array<{ savedAt: string; data: WorkbenchData }>>(db, SNAPSHOTS_KEY) ?? [];
    await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(normalized, DATA_KEY); tx.objectStore(STORE).put([{ savedAt: new Date().toISOString(), data: normalized }, ...existing].slice(0, MAX_SNAPSHOTS), SNAPSHOTS_KEY); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  } finally { db.close(); }
}

export async function loadSnapshots() {
  if (typeof indexedDB === "undefined") return [] as Array<{ savedAt: string; data: WorkbenchData }>;
  const db = await openDb();
  try { return await readStore<Array<{ savedAt: string; data: WorkbenchData }>>(db, SNAPSHOTS_KEY) ?? []; } finally { db.close(); }
}

export function resetData() {
  const data = normalizeWorkbenchData(sampleData);
  saveData(data);
  return data;
}

export function downloadJson(data: WorkbenchData) {
  const payload = { exportedAt: new Date().toISOString(), data: normalizeWorkbenchData(data), imageManifest: (data.workshopImages ?? []).map(({ id, storageType, localRelativePath, title }) => ({ id, storageType, localRelativePath, title })) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `spray-digital-workshop-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
