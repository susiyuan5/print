import { z } from "zod";
import type { WorkbenchData } from "../types/workbench";

const modelStatusSchema = z.enum(["planned", "in_progress", "painted", "finished", "archived"]);
const layerSchema = z.enum(["primer", "base", "shade", "highlight", "detail", "wash", "varnish", "other"]);
const finishSchema = z.enum(["matte", "satin", "gloss", "metallic", "transparent", "other"]);
const roleSchema = z.enum(["main", "secondary", "accent", "detail", "other"]);

export const workbenchDataSchema = z.object({
  version: z.literal(1),
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
  updatedAt: z.string(),
});

export function parseWorkbenchData(value: unknown): WorkbenchData {
  return workbenchDataSchema.parse(value);
}
