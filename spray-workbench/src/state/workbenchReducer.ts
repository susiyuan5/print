import type {
  ColorScheme,
  PaintColor,
  ScaleModel,
  SprayLog,
  SprayProject,
  SprayStepTemplate,
  WorkbenchData,
  WorkshopImage,
} from "../types/workbench";
import { nowIso } from "../utils/dates";

export type WorkbenchAction =
  | { type: "replace"; data: WorkbenchData }
  | { type: "upsertModel"; model: ScaleModel }
  | { type: "deleteModel"; id: string }
  | { type: "upsertPaint"; paint: PaintColor }
  | { type: "deletePaint"; id: string }
  | { type: "upsertScheme"; scheme: ColorScheme }
  | { type: "deleteScheme"; id: string }
  | { type: "upsertLog"; log: SprayLog }
  | { type: "deleteLog"; id: string }
  | { type: "upsertProject"; project: SprayProject }
  | { type: "deleteProject"; id: string }
  | { type: "addWorkshopImage"; image: WorkshopImage }
  | { type: "deleteWorkshopImage"; id: string }
  | { type: "upsertTemplate"; template: SprayStepTemplate }
  | { type: "deleteTemplate"; id: string };

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
        sprayLogs: data.sprayLogs.filter((item) => item.modelId !== action.id),
        colorSchemes: data.colorSchemes.map((scheme) => ({
          ...scheme,
          modelIds: scheme.modelIds.filter((modelId) => modelId !== action.id),
        })),
        projects: (data.projects ?? []).map((project) => project.modelId === action.id ? { ...project, modelId: undefined } : project),
        workshopImages: (data.workshopImages ?? []).map((image) => image.modelId === action.id ? { ...image, modelId: undefined } : image),
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
        workshopImages: (data.workshopImages ?? []).map((image) => image.projectId === action.id ? { ...image, projectId: undefined } : image),
      });
    case "addWorkshopImage":
      return touch({ ...data, workshopImages: [action.image, ...(data.workshopImages ?? [])] });
    case "deleteWorkshopImage":
      return touch({
        ...data,
        workshopImages: (data.workshopImages ?? []).filter((item) => item.id !== action.id),
        projects: (data.projects ?? []).map((project) => ({
          ...project,
          imageIds: project.imageIds.filter((id) => id !== action.id),
        })),
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
    default:
      return data;
  }
}
