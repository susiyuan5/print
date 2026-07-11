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
export type PaintType = "water_based" | "lacquer" | "enamel" | "acrylic" | "other";
export type PaintOpacity = "transparent" | "semi_transparent" | "high_coverage";
export type PaintTemperature = "cool" | "neutral" | "warm";
export type PaintColorFamily = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "black" | "white" | "gray" | "brown" | "metallic" | "transparent" | "other";
export type PaintRecipeUnitMode = "percent" | "parts" | "drops" | "ml";
export type ColorRole = "main" | "secondary" | "accent" | "detail" | "other";
export type PreviewShape = "car" | "aircraft" | "robot" | "part";
export type ProjectStatus = "planned" | "in_progress" | "painting" | "reviewing" | "finished" | "archived";
export type ImageStorageType = "dataUrl" | "localFile" | "remoteUrl";
export type ColorLabExperimentType = "color_harmony" | "paint_mix";
export type AiShadowLevel = "low" | "medium" | "high";
export type AiHighlightLevel = "low" | "medium" | "high";
export type AiContrastLevel = "natural" | "high" | "comic";
export type AiVolumeLevel = "natural" | "enhanced_body" | "enhanced_mecha";
export type AiEdgeHighlight = "none" | "subtle" | "strong";
export type AiPreserveOriginal = "strict" | "slight_beautify";
export type ComfyImageMode = "img2img" | "reference_image" | "control_workflow";
export type ModelSourceType = "temporary" | "localFile" | "remoteUrl";
export type ModelFileExtension = "glb" | "gltf" | "stl" | "obj" | "other";

export interface WorkbenchData {
  version: 1;
  models: ScaleModel[];
  modelAssets?: ModelAsset[];
  paints: PaintColor[];
  colorSchemes: ColorScheme[];
  sprayLogs: SprayLog[];
  projects?: SprayProject[];
  workshopImages?: WorkshopImage[];
  parameterTemplates?: SprayStepTemplate[];
  colorLabExperiments?: ColorLabExperiment[];
  aiRepaintConcepts?: AiRepaintConcept[];
  paintRecipes?: PaintRecipe[];
  productOpportunities?: ProductOpportunity[];
  marketSources?: MarketSource[];
  licenseRecords?: LicenseRecord[];
  productTestRecords?: ProductTestRecord[];
  updatedAt: string;
}

export type ProductMarket = "Canada" | "USA" | "UK" | "EU";
export type ProductRole = "traffic" | "profit" | "search" | "seasonal" | "replacement";
export type LicenseStatus = "original" | "commercial-license" | "permission-required" | "personal-use-only" | "unknown";
export type RiskLevel = "low" | "medium" | "high" | "blocked";
export type ProductStatus = "watching" | "candidate" | "test-print" | "test-selling" | "approved" | "rejected";

export interface ProductOpportunity {
  id: string; name: string; category: string; markets: ProductMarket[]; productRole: ProductRole;
  description: string; targetCustomer: string; customerProblem: string; customizationOptions: string[];
  demandScore: number; competitionScore: number; profitScore: number; shippingScore: number; videoScore: number; customizationScore: number; repeatabilityScore: number;
  printTimeHours?: number; materialWeightGrams?: number; materialCostCad?: number; packagingCostCad?: number; shippingCostCad?: number; sellingPriceCad?: number; grossMargin?: number;
  licenseStatus: LicenseStatus; licenseSource?: string; designer?: string; licenseEvidence?: string;
  ipRisk: RiskLevel; complianceRisk: RiskLevel; riskTags: string[]; sourceLinks: string[]; evidenceNotes: string[];
  status: ProductStatus; lastCheckedAt?: string;
}

export interface LicenseRecord {
  id: string; productId?: string; modelName: string; designer?: string; platform?: string; modelUrl?: string; licenseType: LicenseStatus;
  physicalSalesAllowed?: boolean; platformRestrictions?: string; attributionRequired?: boolean; activeSubscriptionRequired?: boolean;
  purchaseDate?: string; proofOfLicense?: string; lastReviewedAt?: string;
}

export interface ProductTestRecord {
  id: string; productId: string; printSuccessRate?: number; printTimeHours?: number; postProcessingMinutes?: number; packedWeightGrams?: number; actualShippingCostCad?: number;
  videoViews?: number; favoriteRate?: number; inquiries?: number; orders?: number; returns?: number; customerFeedback?: string; updatedAt: string;
}

export interface MarketSource {
  id: string; name: string; url: string; market: string; keyword: string; observedPrice?: string; reviewCount?: number; salesSignal?: string; engagementSignal?: string;
  summary: string; confidence: "high" | "medium" | "low"; checkedAt: string;
}

export interface PaintRecipe {
  id: string;
  name: string;
  projectId?: string;
  modelId?: string;
  resultColorHex?: string;
  estimatedColorHex?: string;
  targetColorHex?: string;
  items: PaintRecipeItem[];
  unitMode: PaintRecipeUnitMode;
  targetTotalMl?: number;
  thinner?: string;
  paintToThinnerRatio?: string;
  airPressure?: string;
  airbrushNozzle?: string;
  primerColor?: string;
  baseColor?: string;
  coatCount?: number;
  testImageIds: string[];
  resultNotes?: string;
  adjustmentNotes?: string;
  isFavorite?: boolean;
  rgbEstimatedColorHex?: string;
  pigmentEstimatedColorHex?: string;
  deltaE?: number;
  matchNotes?: string;
  isFinalRecipe?: boolean;
  correctionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaintRecipeItem {
  paintId: string;
  amount: number;
  computedPercent?: number;
  computedMl?: number;
  notes?: string;
}

export interface AiRepaintConcept {
  id: string;
  name: string;
  projectId?: string;
  sourceImageId?: string;
  resultImageIds: string[];
  modelType?: string;
  stylePreset?: string;
  mainColorHex?: string;
  secondaryColorHex?: string;
  accentColorHex?: string;
  shadowColorHex?: string;
  highlightColorHex?: string;
  lightingDirection?: string;
  shadowLevel?: AiShadowLevel;
  highlightLevel?: AiHighlightLevel;
  contrastLevel?: AiContrastLevel;
  volumeLevel?: AiVolumeLevel;
  edgeHighlight?: AiEdgeHighlight;
  preserveOriginal?: AiPreserveOriginal;
  comfyModelType?: string;
  comfyImageMode?: ComfyImageMode;
  denoiseStrength?: string;
  cfgScale?: string;
  steps?: string;
  samplerNotes?: string;
  seedNotes?: string;
  loraNotes?: string;
  controlNetNotes?: string;
  positivePromptZh: string;
  negativePromptZh: string;
  positivePromptEn: string;
  negativePromptEn: string;
  comfyPromptEn: string;
  promptZhDescription: string;
  notes?: string;
  createdAt: string;
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
  paintType?: PaintType;
  opacity?: PaintOpacity;
  temperature?: PaintTemperature;
  colorFamily?: PaintColorFamily;
  stockAmount?: string;
  bottleSize?: string;
  purchaseDate?: string;
  favorite?: boolean;
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

export interface ModelAsset {
  id: string;
  name: string;
  projectId?: string;
  physicalModelId?: string;
  sourceType: ModelSourceType;
  fileName: string;
  fileExtension: ModelFileExtension;
  fileSizeBytes?: number;
  localRelativePath?: string;
  localPreviewRelativePath?: string;
  modelFileCount?: number;
  localInfoText?: string;
  imageFileCount?: number;
  remoteUrl?: string;
  thumbnailImageId?: string;
  notes?: string;
  tags?: string[];
  previewSettings?: ModelPreviewSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ModelPreviewSettings {
  background?: "dark" | "light" | "grid";
  autoRotate?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  cameraDistance?: number;
}
