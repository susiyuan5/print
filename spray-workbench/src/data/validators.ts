import { z } from "zod";
import type { WorkbenchData } from "../types/workbench";

const modelStatusSchema = z.enum(["planned", "in_progress", "painted", "finished", "archived"]);
const layerSchema = z.enum(["primer", "base", "shade", "highlight", "detail", "wash", "varnish", "other"]);
const finishSchema = z.enum(["matte", "satin", "gloss", "metallic", "transparent", "other"]);
const paintTypeSchema = z.enum(["water_based", "lacquer", "enamel", "acrylic", "other"]);
const paintOpacitySchema = z.enum(["transparent", "semi_transparent", "high_coverage"]);
const paintTemperatureSchema = z.enum(["cool", "neutral", "warm"]);
const paintColorFamilySchema = z.enum(["red", "orange", "yellow", "green", "blue", "purple", "black", "white", "gray", "brown", "metallic", "transparent", "other"]);
const recipeUnitModeSchema = z.enum(["percent", "parts", "drops", "ml"]);
const roleSchema = z.enum(["main", "secondary", "accent", "detail", "other"]);
const projectStatusSchema = z.enum(["planned", "in_progress", "painting", "reviewing", "finished", "archived"]);
const imageStorageTypeSchema = z.enum(["dataUrl", "localFile", "remoteUrl"]);
const colorLabExperimentTypeSchema = z.enum(["color_harmony", "paint_mix"]);
const aiShadowLevelSchema = z.enum(["low", "medium", "high"]);
const aiHighlightLevelSchema = z.enum(["low", "medium", "high"]);
const aiContrastLevelSchema = z.enum(["natural", "high", "comic"]);
const aiVolumeLevelSchema = z.enum(["natural", "enhanced_body", "enhanced_mecha"]);
const aiEdgeHighlightSchema = z.enum(["none", "subtle", "strong"]);
const aiPreserveOriginalSchema = z.enum(["strict", "slight_beautify"]);
const comfyImageModeSchema = z.enum(["img2img", "reference_image", "control_workflow"]);
const modelSourceTypeSchema = z.enum(["temporary", "localFile", "remoteUrl"]);
const modelFileExtensionSchema = z.enum(["glb", "gltf", "stl", "obj", "other"]);

const modelPreviewSettingsSchema = z.object({
  background: z.enum(["dark", "light", "grid"]).optional(),
  autoRotate: z.boolean().optional(),
  showGrid: z.boolean().optional(),
  showAxes: z.boolean().optional(),
  cameraDistance: z.number().optional(),
}).optional();

const modelAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  projectId: z.string().optional(),
  physicalModelId: z.string().optional(),
  sourceType: modelSourceTypeSchema,
  fileName: z.string().min(1),
  fileExtension: modelFileExtensionSchema,
  fileSizeBytes: z.number().optional(),
  localRelativePath: z.string().optional(),
  remoteUrl: z.string().optional(),
  thumbnailImageId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  previewSettings: modelPreviewSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});


const stepTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  layerType: layerSchema,
  ratio: z.string(),
  thinner: z.string(),
  pressure: z.string(),
  technique: z.string(),
  notes: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const workbenchDataSchema = z.object({
  version: z.literal(1),
  modelAssets: z.array(modelAssetSchema).optional(),
  models: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    brand: z.string().optional(),
    series: z.string().optional(),
    scale: z.string().optional(),
    status: modelStatusSchema,
    tags: z.array(z.string()),
    imageUrl: z.string().optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
  paints: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    brand: z.string().optional(),
    code: z.string().optional(),
    hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "颜色必须是 #RRGGBB 格式"),
    finish: finishSchema.optional(),
    paintType: paintTypeSchema.optional(),
    opacity: paintOpacitySchema.optional(),
    temperature: paintTemperatureSchema.optional(),
    colorFamily: paintColorFamilySchema.optional(),
    stockAmount: z.string().optional(),
    bottleSize: z.string().optional(),
    purchaseDate: z.string().optional(),
    favorite: z.boolean().optional(),
    notes: z.string().optional(),
  })),
  colorSchemes: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    modelIds: z.array(z.string()),
    colors: z.array(z.object({
      paintId: z.string(),
      role: roleSchema,
      layerType: layerSchema.optional(),
      percentage: z.number().min(0).max(100).optional(),
      ratio: z.string().optional(),
      notes: z.string().optional(),
    })),
    tags: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
  sprayLogs: z.array(z.object({
    id: z.string().min(1),
    modelId: z.string(),
    title: z.string().min(1),
    date: z.string(),
    steps: z.array(z.object({
      id: z.string(),
      layerType: layerSchema,
      paintIds: z.array(z.string()),
      title: z.string().min(1),
      ratio: z.string().optional(),
      thinner: z.string().optional(),
      pressure: z.string().optional(),
      technique: z.string().optional(),
      notes: z.string().optional(),
    })),
    resultNotes: z.string().optional(),
    imageUrls: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
  projects: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    modelId: z.string().optional(),
    status: projectStatusSchema,
    goal: z.string().optional(),
    styleKeywords: z.array(z.string()),
    colorSchemeIds: z.array(z.string()),
    sprayLogIds: z.array(z.string()),
    imageIds: z.array(z.string()),
    startedAt: z.string().optional(),
    finishedAt: z.string().optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })).optional(),
  workshopImages: z.array(z.object({
    id: z.string().min(1),
    projectId: z.string().optional(),
    modelId: z.string().optional(),
    sprayLogId: z.string().optional(),
    stepId: z.string().optional(),
    title: z.string().optional(),
    notes: z.string().optional(),
    capturedAt: z.string().optional(),
    storageType: imageStorageTypeSchema.optional(),
    dataUrl: z.string().optional(),
    imageUrl: z.string().optional(),
    localRelativePath: z.string().optional(),
    mimeType: z.string(),
    width: z.number(),
    height: z.number(),
    originalSizeBytes: z.number().optional(),
    sizeBytes: z.number(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
  })).optional(),
  parameterTemplates: z.array(stepTemplateSchema).optional(),
  colorLabExperiments: z.array(z.object({
    id: z.string().min(1),
    type: colorLabExperimentTypeSchema,
    name: z.string().min(1),
    projectId: z.string().optional(),
    baseColorHex: z.string().optional(),
    resultColorHex: z.string().optional(),
    paintMixItems: z.array(z.object({
      paintId: z.string(),
      ratioPercent: z.number().min(0).max(100),
    })).optional(),
    generatedColors: z.array(z.object({
      role: z.string(),
      hex: z.string(),
      rgb: z.string(),
      hsl: z.string(),
      notes: z.string().optional(),
    })).optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })).optional(),
  aiRepaintConcepts: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    projectId: z.string().optional(),
    sourceImageId: z.string().optional(),
    resultImageIds: z.array(z.string()),
    modelType: z.string().optional(),
    stylePreset: z.string().optional(),
    mainColorHex: z.string().optional(),
    secondaryColorHex: z.string().optional(),
    accentColorHex: z.string().optional(),
    shadowColorHex: z.string().optional(),
    highlightColorHex: z.string().optional(),
    lightingDirection: z.string().optional(),
    shadowLevel: aiShadowLevelSchema.optional(),
    highlightLevel: aiHighlightLevelSchema.optional(),
    contrastLevel: aiContrastLevelSchema.optional(),
    volumeLevel: aiVolumeLevelSchema.optional(),
    edgeHighlight: aiEdgeHighlightSchema.optional(),
    preserveOriginal: aiPreserveOriginalSchema.optional(),
    comfyModelType: z.string().optional(),
    comfyImageMode: comfyImageModeSchema.optional(),
    denoiseStrength: z.string().optional(),
    cfgScale: z.string().optional(),
    steps: z.string().optional(),
    samplerNotes: z.string().optional(),
    seedNotes: z.string().optional(),
    loraNotes: z.string().optional(),
    controlNetNotes: z.string().optional(),
    positivePromptZh: z.string(),
    negativePromptZh: z.string(),
    positivePromptEn: z.string(),
    negativePromptEn: z.string(),
    comfyPromptEn: z.string(),
    promptZhDescription: z.string(),
    notes: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })).optional(),
  paintRecipes: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    projectId: z.string().optional(),
    modelId: z.string().optional(),
    resultColorHex: z.string().optional(),
    estimatedColorHex: z.string().optional(),
    targetColorHex: z.string().optional(),
    items: z.array(z.object({
      paintId: z.string(),
      amount: z.number(),
      computedPercent: z.number().optional(),
      computedMl: z.number().optional(),
      notes: z.string().optional(),
    })),
    unitMode: recipeUnitModeSchema,
    targetTotalMl: z.number().optional(),
    thinner: z.string().optional(),
    paintToThinnerRatio: z.string().optional(),
    airPressure: z.string().optional(),
    airbrushNozzle: z.string().optional(),
    primerColor: z.string().optional(),
    baseColor: z.string().optional(),
    coatCount: z.number().optional(),
    testImageIds: z.array(z.string()),
    resultNotes: z.string().optional(),
    adjustmentNotes: z.string().optional(),
    isFavorite: z.boolean().optional(),
    rgbEstimatedColorHex: z.string().optional(),
    pigmentEstimatedColorHex: z.string().optional(),
    deltaE: z.number().optional(),
    matchNotes: z.string().optional(),
    isFinalRecipe: z.boolean().optional(),
    correctionNotes: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })).optional(),
  updatedAt: z.string(),
});

export function parseWorkbenchData(value: unknown): WorkbenchData {
  return workbenchDataSchema.parse(value);
}
