import type {
  AiRepaintConcept,
  ColorScheme,
  ColorLabExperiment,
  ModelAsset,
  PaintRecipe,
  ProductOpportunity,
  MarketSource,
  LicenseRecord,
  ProductTestRecord,
  PaintColor,
  ScaleModel,
  SprayLog,
  SprayProject,
  SprayStepTemplate,
  SprayReview,
  WorkbenchData,
  WorkshopImage,
} from "../types/workbench";
import { nowIso } from "../utils/dates";

export type WorkbenchAction =
  | { type: "replace"; data: WorkbenchData }
  | { type: "upsertModel"; model: ScaleModel }
  | { type: "deleteModel"; id: string }
  | { type: "upsertModelAsset"; asset: ModelAsset }
  | { type: "deleteModelAsset"; id: string }
  | { type: "upsertPaint"; paint: PaintColor }
  | { type: "deletePaint"; id: string }
  | { type: "upsertScheme"; scheme: ColorScheme }
  | { type: "deleteScheme"; id: string }
  | { type: "upsertLog"; log: SprayLog }
  | { type: "deleteLog"; id: string }
  | { type: "upsertProject"; project: SprayProject }
  | { type: "deleteProject"; id: string }
  | { type: "addWorkshopImage"; image: WorkshopImage }
  | { type: "updateWorkshopImage"; image: WorkshopImage }
  | { type: "deleteWorkshopImage"; id: string }
  | { type: "upsertTemplate"; template: SprayStepTemplate }
  | { type: "deleteTemplate"; id: string }
  | { type: "addColorLabExperiment"; experiment: ColorLabExperiment }
  | { type: "deleteColorLabExperiment"; id: string }
  | { type: "addAiRepaintConcept"; concept: AiRepaintConcept }
  | { type: "updateAiRepaintConcept"; concept: AiRepaintConcept }
  | { type: "deleteAiRepaintConcept"; id: string }
  | { type: "addPaintRecipe"; recipe: PaintRecipe }
  | { type: "updatePaintRecipe"; recipe: PaintRecipe }
  | { type: "deletePaintRecipe"; id: string }
  | { type: "upsertSprayReview"; review: SprayReview }
  | { type: "deleteSprayReview"; id: string }
  | { type: "upsertProductOpportunity"; product: ProductOpportunity }
  | { type: "deleteProductOpportunity"; id: string }
  | { type: "upsertMarketSource"; source: MarketSource }
  | { type: "deleteMarketSource"; id: string }
  | { type: "upsertLicenseRecord"; record: LicenseRecord }
  | { type: "upsertProductTestRecord"; record: ProductTestRecord };

function touch(data: WorkbenchData): WorkbenchData {
  return { ...data, updatedAt: nowIso() };
}

export function workbenchReducer(data: WorkbenchData, action: WorkbenchAction): WorkbenchData {
  switch (action.type) {
    case "replace":
      return touch(action.data);
    case "upsertModel":
      return touch({
        ...data,
        models: data.models.some((item) => item.id === action.model.id)
          ? data.models.map((item) => (item.id === action.model.id ? action.model : item))
          : [action.model, ...data.models],
      });
    case "deleteModel":
      return touch({
        ...data,
        models: data.models.filter((item) => item.id !== action.id),
        modelAssets: (data.modelAssets ?? []).map((asset) => asset.physicalModelId === action.id ? { ...asset, physicalModelId: undefined } : asset),
        sprayLogs: data.sprayLogs.filter((item) => item.modelId !== action.id),
        colorSchemes: data.colorSchemes.map((scheme) => ({
          ...scheme,
          modelIds: scheme.modelIds.filter((modelId) => modelId !== action.id),
        })),
        projects: (data.projects ?? []).map((project) => project.modelId === action.id ? { ...project, modelId: undefined } : project),
        workshopImages: (data.workshopImages ?? []).map((image) => image.modelId === action.id ? { ...image, modelId: undefined } : image),
        paintRecipes: (data.paintRecipes ?? []).map((recipe) => recipe.modelId === action.id ? { ...recipe, modelId: undefined } : recipe),
      });
    case "upsertPaint":
      return touch({
        ...data,
        paints: data.paints.some((item) => item.id === action.paint.id)
          ? data.paints.map((item) => (item.id === action.paint.id ? action.paint : item))
          : [action.paint, ...data.paints],
      });
    case "deletePaint":
      return touch({
        ...data,
        paints: data.paints.filter((item) => item.id !== action.id),
        colorSchemes: data.colorSchemes.map((scheme) => ({
          ...scheme,
          colors: scheme.colors.filter((color) => color.paintId !== action.id),
        })),
        sprayLogs: data.sprayLogs.map((log) => ({
          ...log,
          steps: log.steps.map((step) => ({
            ...step,
            paintIds: step.paintIds.filter((paintId) => paintId !== action.id),
          })),
        })),
        colorLabExperiments: (data.colorLabExperiments ?? []).map((experiment) => ({
          ...experiment,
          paintMixItems: experiment.paintMixItems?.filter((item) => item.paintId !== action.id),
        })),
      });
    case "upsertScheme":
      return touch({
        ...data,
        colorSchemes: data.colorSchemes.some((item) => item.id === action.scheme.id)
          ? data.colorSchemes.map((item) => (item.id === action.scheme.id ? action.scheme : item))
          : [action.scheme, ...data.colorSchemes],
      });
    case "deleteScheme":
      return touch({
        ...data,
        colorSchemes: data.colorSchemes.filter((item) => item.id !== action.id),
        projects: (data.projects ?? []).map((project) => ({
          ...project,
          colorSchemeIds: project.colorSchemeIds.filter((id) => id !== action.id),
        })),
      });
    case "upsertLog":
      return touch({
        ...data,
        sprayLogs: data.sprayLogs.some((item) => item.id === action.log.id)
          ? data.sprayLogs.map((item) => (item.id === action.log.id ? action.log : item))
          : [action.log, ...data.sprayLogs],
      });
    case "deleteLog":
      return touch({
        ...data,
        sprayLogs: data.sprayLogs.filter((item) => item.id !== action.id),
        projects: (data.projects ?? []).map((project) => ({
          ...project,
          sprayLogIds: project.sprayLogIds.filter((id) => id !== action.id),
        })),
        workshopImages: (data.workshopImages ?? []).map((image) => image.sprayLogId === action.id ? { ...image, sprayLogId: undefined } : image),
        sprayReviews: (data.sprayReviews ?? []).map((review) => review.sprayLogId === action.id ? { ...review, sprayLogId: undefined } : review),
      });
    case "upsertProject":
      return touch({
        ...data,
        projects: (data.projects ?? []).some((item) => item.id === action.project.id)
          ? (data.projects ?? []).map((item) => (item.id === action.project.id ? action.project : item))
          : [action.project, ...(data.projects ?? [])],
      });
    case "deleteProject":
      return touch({
        ...data,
        projects: (data.projects ?? []).filter((item) => item.id !== action.id),
        modelAssets: (data.modelAssets ?? []).map((asset) => asset.projectId === action.id ? { ...asset, projectId: undefined } : asset),
        workshopImages: (data.workshopImages ?? []).map((image) => image.projectId === action.id ? { ...image, projectId: undefined } : image),
        colorLabExperiments: (data.colorLabExperiments ?? []).map((experiment) => experiment.projectId === action.id ? { ...experiment, projectId: undefined } : experiment),
        aiRepaintConcepts: (data.aiRepaintConcepts ?? []).map((concept) => concept.projectId === action.id ? { ...concept, projectId: undefined } : concept),
        paintRecipes: (data.paintRecipes ?? []).map((recipe) => recipe.projectId === action.id ? { ...recipe, projectId: undefined } : recipe),
        sprayReviews: (data.sprayReviews ?? []).map((review) => review.projectId === action.id ? { ...review, projectId: undefined } : review),
      });
    case "addWorkshopImage":
      return touch({ ...data, workshopImages: [action.image, ...(data.workshopImages ?? [])] });
    case "updateWorkshopImage":
      return touch({
        ...data,
        workshopImages: (data.workshopImages ?? []).map((item) => item.id === action.image.id ? action.image : item),
      });
    case "deleteWorkshopImage":
      return touch({
        ...data,
        workshopImages: (data.workshopImages ?? []).filter((item) => item.id !== action.id),
        projects: (data.projects ?? []).map((project) => ({
          ...project,
          imageIds: project.imageIds.filter((id) => id !== action.id),
        })),
        aiRepaintConcepts: (data.aiRepaintConcepts ?? []).map((concept) => ({
          ...concept,
          sourceImageId: concept.sourceImageId === action.id ? undefined : concept.sourceImageId,
          resultImageIds: concept.resultImageIds.filter((id) => id !== action.id),
        })),
        paintRecipes: (data.paintRecipes ?? []).map((recipe) => ({
          ...recipe,
          testImageIds: recipe.testImageIds.filter((id) => id !== action.id),
        })),
        sprayReviews: (data.sprayReviews ?? []).map((review) => ({ ...review, imageIds: review.imageIds.filter((id) => id !== action.id) })),
      });
    case "upsertTemplate":
      return touch({
        ...data,
        parameterTemplates: (data.parameterTemplates ?? []).some((item) => item.id === action.template.id)
          ? (data.parameterTemplates ?? []).map((item) => (item.id === action.template.id ? action.template : item))
          : [action.template, ...(data.parameterTemplates ?? [])],
      });
    case "deleteTemplate":
      return touch({ ...data, parameterTemplates: (data.parameterTemplates ?? []).filter((item) => item.id !== action.id) });
    case "addColorLabExperiment":
      return touch({ ...data, colorLabExperiments: [action.experiment, ...(data.colorLabExperiments ?? [])] });
    case "deleteColorLabExperiment":
      return touch({ ...data, colorLabExperiments: (data.colorLabExperiments ?? []).filter((item) => item.id !== action.id) });
    case "addAiRepaintConcept":
      return touch({ ...data, aiRepaintConcepts: [action.concept, ...(data.aiRepaintConcepts ?? [])] });
    case "updateAiRepaintConcept":
      return touch({
        ...data,
        aiRepaintConcepts: (data.aiRepaintConcepts ?? []).map((item) => item.id === action.concept.id ? action.concept : item),
      });
    case "deleteAiRepaintConcept":
      return touch({ ...data, aiRepaintConcepts: (data.aiRepaintConcepts ?? []).filter((item) => item.id !== action.id) });
    case "addPaintRecipe":
      return touch({ ...data, paintRecipes: [action.recipe, ...(data.paintRecipes ?? [])] });
    case "updatePaintRecipe":
      return touch({ ...data, paintRecipes: (data.paintRecipes ?? []).map((item) => item.id === action.recipe.id ? action.recipe : item) });
    case "deletePaintRecipe":
      return touch({ ...data, paintRecipes: (data.paintRecipes ?? []).filter((item) => item.id !== action.id), sprayReviews: (data.sprayReviews ?? []).map((review) => review.recipeId === action.id ? { ...review, recipeId: undefined } : review) });
    case "upsertSprayReview":
      return touch({ ...data, sprayReviews: (data.sprayReviews ?? []).some((item) => item.id === action.review.id) ? (data.sprayReviews ?? []).map((item) => item.id === action.review.id ? action.review : item) : [action.review, ...(data.sprayReviews ?? [])] });
    case "deleteSprayReview":
      return touch({ ...data, sprayReviews: (data.sprayReviews ?? []).filter((item) => item.id !== action.id) });
    case "upsertProductOpportunity":
      return touch({ ...data, productOpportunities: (data.productOpportunities ?? []).some((item) => item.id === action.product.id) ? (data.productOpportunities ?? []).map((item) => item.id === action.product.id ? action.product : item) : [action.product, ...(data.productOpportunities ?? [])] });
    case "deleteProductOpportunity":
      return touch({ ...data, productOpportunities: (data.productOpportunities ?? []).filter((item) => item.id !== action.id), licenseRecords: (data.licenseRecords ?? []).filter((item) => item.productId !== action.id), productTestRecords: (data.productTestRecords ?? []).filter((item) => item.productId !== action.id) });
    case "upsertMarketSource":
      return touch({ ...data, marketSources: (data.marketSources ?? []).some((item) => item.id === action.source.id) ? (data.marketSources ?? []).map((item) => item.id === action.source.id ? action.source : item) : [action.source, ...(data.marketSources ?? [])] });
    case "deleteMarketSource":
      return touch({ ...data, marketSources: (data.marketSources ?? []).filter((item) => item.id !== action.id) });
    case "upsertLicenseRecord":
      return touch({ ...data, licenseRecords: (data.licenseRecords ?? []).some((item) => item.id === action.record.id) ? (data.licenseRecords ?? []).map((item) => item.id === action.record.id ? action.record : item) : [action.record, ...(data.licenseRecords ?? [])] });
    case "upsertProductTestRecord":
      return touch({ ...data, productTestRecords: (data.productTestRecords ?? []).some((item) => item.id === action.record.id) ? (data.productTestRecords ?? []).map((item) => item.id === action.record.id ? action.record : item) : [action.record, ...(data.productTestRecords ?? [])] });
    case "upsertModelAsset":
      return touch({
        ...data,
        modelAssets: (data.modelAssets ?? []).some((item) => item.id === action.asset.id)
          ? (data.modelAssets ?? []).map((item) => (item.id === action.asset.id ? action.asset : item))
          : [action.asset, ...(data.modelAssets ?? [])],
      });
    case "deleteModelAsset":
      return touch({ ...data, modelAssets: (data.modelAssets ?? []).filter((item) => item.id !== action.id) });
    default:
      return data;
  }
}
