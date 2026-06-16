export type ModelStatus = "planned" | "in_progress" | "painted" | "finished" | "archived";

export type PaintLayerType =
  | "primer"
  | "base"
  | "shade"
  | "highlight"
  | "detail"
  | "wash"
  | "varnish"
  | "other";

export type PaintFinish = "matte" | "satin" | "gloss" | "metallic" | "transparent" | "other";
export type ColorRole = "main" | "secondary" | "accent" | "detail" | "other";
export type PreviewShape = "car" | "aircraft" | "robot" | "part";
export type ProjectStatus = "planned" | "in_progress" | "painting" | "reviewing" | "finished" | "archived";
export type ImageStorageType = "dataUrl" | "localFile" | "remoteUrl";
export type ColorLabExperimentType = "color_harmony" | "paint_mix";

export interface WorkbenchData {
  version: 1;
  models: ScaleModel[];
  paints: PaintColor[];
  colorSchemes: ColorScheme[];
  sprayLogs: SprayLog[];
  projects?: SprayProject[];
  workshopImages?: WorkshopImage[];
  parameterTemplates?: SprayStepTemplate[];
  colorLabExperiments?: ColorLabExperiment[];
  updatedAt: string;
}

export interface ColorLabExperiment {
  id: string;
  type: ColorLabExperimentType;
  name: string;
  projectId?: string;
  baseColorHex?: string;
  resultColorHex?: string;
  paintMixItems?: PaintMixItem[];
  generatedColors?: GeneratedColor[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaintMixItem {
  paintId: string;
  ratioPercent: number;
}

export interface GeneratedColor {
  role: string;
  hex: string;
  rgb: string;
  hsl: string;
  notes?: string;
}

export interface SprayProject {
  id: string;
  name: string;
  modelId?: string;
  status: ProjectStatus;
  goal?: string;
  styleKeywords: string[];
  colorSchemeIds: string[];
  sprayLogIds: string[];
  imageIds: string[];
  startedAt?: string;
  finishedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopImage {
  id: string;
  projectId?: string;
  modelId?: string;
  sprayLogId?: string;
  stepId?: string;
  title?: string;
  notes?: string;
  capturedAt?: string;
  storageType?: ImageStorageType;
  dataUrl?: string;
  imageUrl?: string;
  localRelativePath?: string;
  mimeType: string;
  width: number;
  height: number;
  originalSizeBytes?: number;
  sizeBytes: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SprayStepTemplate {
  id: string;
  name: string;
  layerType: PaintLayerType;
  ratio: string;
  thinner: string;
  pressure: string;
  technique: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScaleModel {
  id: string;
  name: string;
  brand?: string;
  series?: string;
  scale?: string;
  status: ModelStatus;
  tags: string[];
  imageUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaintColor {
  id: string;
  name: string;
  brand?: string;
  code?: string;
  hex: string;
  finish?: PaintFinish;
  notes?: string;
}

export interface ColorScheme {
  id: string;
  name: string;
  description?: string;
  modelIds: string[];
  colors: ColorSchemeColor[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ColorSchemeColor {
  paintId: string;
  role: ColorRole;
  layerType?: PaintLayerType;
  percentage?: number;
  ratio?: string;
  notes?: string;
}

export interface SprayLog {
  id: string;
  modelId: string;
  title: string;
  date: string;
  steps: SprayStep[];
  resultNotes?: string;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SprayStep {
  id: string;
  layerType: PaintLayerType;
  paintIds: string[];
  title: string;
  ratio?: string;
  thinner?: string;
  pressure?: string;
  technique?: string;
  notes?: string;
}

export interface PreviewSelection {
  shape: PreviewShape;
  mainPaintId?: string;
  secondaryPaintId?: string;
  accentPaintId?: string;
}

export interface FutureThreePreviewConfig {
  enabled: false;
  glbUrl?: string;
  materialSlots?: Record<string, string>;
}
