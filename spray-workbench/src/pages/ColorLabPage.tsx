import { useMemo, useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { Field } from "../components/ui/Field";
import { ImageUploader, type UploadedImagePayload } from "../components/ui/ImageUploader";
import { WorkshopImageView } from "../components/ui/ImageGallery";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type {
  AiContrastLevel,
  AiEdgeHighlight,
  AiHighlightLevel,
  AiPreserveOriginal,
  AiRepaintConcept,
  AiShadowLevel,
  AiVolumeLevel,
  ColorRole,
  ComfyImageMode,
  GeneratedColor,
  PaintFinish,
  PaintMixItem,
} from "../types/workbench";
import { finishLabels, roleLabels } from "../utils/colors";
import { formatDate, nowIso } from "../utils/dates";
import { createId } from "../utils/ids";
import { generateAiRepaintPrompt } from "../utils/aiRepaintPrompt";
import {
  formatHsl,
  formatRgb,
  generateHarmony,
  getHexError,
  hexToRgb,
  mixRgbWeighted,
  normalizeHex,
  rgbToHsl,
} from "../utils/colorMath";

type ColorLabTab = "wheel" | "mix" | "ai";

const roleOrder: ColorRole[] = ["main", "secondary", "accent", "detail", "other"];
const roleNameToRole: Record<string, ColorRole> = {
  主色: "main",
  辅色: "secondary",
  点缀色: "accent",
  高光色: "detail",
  阴影色: "detail",
  细节色: "detail",
};

const emptyMixNotes = {
  thinner: "",
  finish: "matte" as PaintFinish,
  sprayEffect: "",
  failureIssues: "",
  other: "",
};

const modelTypeOptions = ["手办", "高达 / 机甲", "汽车模型", "飞机模型", "军模", "零件", "其他"];
const stylePresetOptions = ["轻度重涂", "动漫风光影", "漫画重阴影", "高对比展示风", "收藏级细腻涂装", "展会摄影风", "旧化战损", "金属质感", "透明件 / 荧光效果"];
const lightingOptions = ["左上", "右上", "正面", "侧光", "背光"];
const shadowLevelLabels: Record<AiShadowLevel, string> = { low: "弱", medium: "中", high: "强" };
const highlightLevelLabels: Record<AiHighlightLevel, string> = { low: "弱", medium: "中", high: "强" };
const contrastLevelLabels: Record<AiContrastLevel, string> = { natural: "自然", high: "高对比", comic: "漫画感" };
const volumeLevelLabels: Record<AiVolumeLevel, string> = { natural: "自然", enhanced_body: "强化肌肉和褶皱", enhanced_mecha: "强化机械边缘" };
const edgeHighlightLabels: Record<AiEdgeHighlight, string> = { none: "无", subtle: "轻微", strong: "明显" };
const preserveOriginalLabels: Record<AiPreserveOriginal, string> = { strict: "必须保留", slight_beautify: "可轻微美化" };
const comfyImageModeLabels: Record<ComfyImageMode, string> = { img2img: "img2img", reference_image: "reference image", control_workflow: "control workflow" };

const emptyAiForm = {
  name: "",
  projectId: "",
  sourceImageId: "",
  modelType: "手办",
  stylePreset: "动漫风光影",
  mainColorHex: "#f1eee4",
  secondaryColorHex: "#1d5fa7",
  accentColorHex: "#d83b32",
  shadowColorHex: "#22252b",
  highlightColorHex: "#fff7e0",
  lightingDirection: "左上",
  shadowLevel: "medium" as AiShadowLevel,
  highlightLevel: "medium" as AiHighlightLevel,
  contrastLevel: "high" as AiContrastLevel,
  volumeLevel: "natural" as AiVolumeLevel,
  edgeHighlight: "subtle" as AiEdgeHighlight,
  preserveOriginal: "strict" as AiPreserveOriginal,
  comfyModelType: "SDXL / figure repaint",
  comfyImageMode: "img2img" as ComfyImageMode,
  denoiseStrength: "0.35 - 0.55",
  cfgScale: "5 - 7",
  steps: "25 - 35",
  samplerNotes: "DPM++ 2M Karras 或当前工作流常用采样器",
  seedNotes: "固定 seed 便于比较不同配色",
  loraNotes: "",
  controlNetNotes: "使用原图作为 reference / ControlNet 输入，优先保持轮廓、姿势和构图",
  notes: "",
};

function colorInfo(hex: string) {
  const safeHex = normalizeHex(hex);
  const rgb = hexToRgb(safeHex);
  const hsl = rgbToHsl(rgb);
  return { hex: safeHex, rgb: formatRgb(rgb), hsl: formatHsl(hsl) };
}

function timestampLabel() {
  return new Date().toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function noteFromMix(items: PaintMixItem[], paintNames: Record<string, string>, notes: typeof emptyMixNotes) {
  const ratios = items.map((item) => `${paintNames[item.paintId] ?? "未知颜色"} ${item.ratioPercent}%`).join("，");
  return [
    `混合比例：${ratios || "未填写"}`,
    notes.thinner ? `稀释剂：${notes.thinner}` : "",
    notes.finish ? `漆面：${finishLabels[notes.finish]}` : "",
    notes.sprayEffect ? `喷涂效果：${notes.sprayEffect}` : "",
    notes.failureIssues ? `失败问题：${notes.failureIssues}` : "",
    notes.other ? `其他说明：${notes.other}` : "",
  ].filter(Boolean).join("\n");
}

function generatedFromHex(role: string, hex: string, notes?: string): GeneratedColor {
  const info = colorInfo(hex);
  return { role, hex: info.hex, rgb: info.rgb, hsl: info.hsl, notes };
}

export function ColorLabPage() {
  const { data, dispatch, setNotice } = useWorkbench();
  const [activeTab, setActiveTab] = useState<ColorLabTab>("wheel");
  const [selectedPaintId, setSelectedPaintId] = useState(data.paints[0]?.id ?? "");
  const [manualHex, setManualHex] = useState(data.paints[0]?.hex ?? "#2F6F73");
  const [wheelProjectId, setWheelProjectId] = useState("");
  const [wheelNotes, setWheelNotes] = useState("");
  const [mixProjectId, setMixProjectId] = useState("");
  const [mixItems, setMixItems] = useState<PaintMixItem[]>(data.paints.slice(0, 2).map((paint, index) => ({ paintId: paint.id, ratioPercent: index === 0 ? 60 : 40 })));
  const [mixNotes, setMixNotes] = useState(emptyMixNotes);
  const [aiForm, setAiForm] = useState(emptyAiForm);
  const [copyStatus, setCopyStatus] = useState("");

  const selectedPaint = data.paints.find((paint) => paint.id === selectedPaintId);
  const baseHex = normalizeHex(manualHex || selectedPaint?.hex || "#2F6F73");
  const baseInfo = colorInfo(baseHex);
  const hexError = getHexError(manualHex);
  const harmonyGroups = useMemo(() => generateHarmony(baseHex), [baseHex]);
  const paintNames = useMemo(() => Object.fromEntries(data.paints.map((paint) => [paint.id, paint.name])), [data.paints]);
  const mixTotal = mixItems.reduce((sum, item) => sum + (Number(item.ratioPercent) || 0), 0);
  const mixStatus = Math.abs(mixTotal - 100) <= 2 ? "比例接近 100%，适合保存记录。" : "比例总和建议接近 100%，当前仅作为预估颜色参考。";
  const resultColorHex = mixRgbWeighted(mixItems.map((item) => ({
    hex: data.paints.find((paint) => paint.id === item.paintId)?.hex ?? "#808080",
    weight: Number(item.ratioPercent) || 0,
  })));
  const resultInfo = colorInfo(resultColorHex);
  const recentExperiments = [...(data.colorLabExperiments ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);
  const aiPrompts = useMemo(() => generateAiRepaintPrompt(aiForm), [aiForm]);
  const recentAiConcepts = [...(data.aiRepaintConcepts ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);
  const selectedSourceImage = (data.workshopImages ?? []).find((image) => image.id === aiForm.sourceImageId);
  const experimentColorOptions = (data.colorLabExperiments ?? []).flatMap((experiment) => [
    ...(experiment.resultColorHex ? [{ label: `${experiment.name} · 结果色`, hex: experiment.resultColorHex }] : []),
    ...(experiment.generatedColors ?? []).map((color) => ({ label: `${experiment.name} · ${color.role}`, hex: color.hex })),
  ]);

  function updateSelectedPaint(paintId: string) {
    setSelectedPaintId(paintId);
    const paint = data.paints.find((item) => item.id === paintId);
    if (paint) setManualHex(paint.hex);
  }

  function saveGeneratedPaint(color: GeneratedColor, source: string) {
    const timestamp = nowIso();
    dispatch({
      type: "upsertPaint",
      paint: {
        id: createId("paint"),
        name: `配色实验色 ${timestampLabel()}`,
        hex: color.hex,
        finish: "other",
        notes: `来源：配色实验室 / ${source}\n用途：${color.role}\n${color.notes ?? ""}`,
      },
    });
    setNotice("已保存推荐色到颜色库。");
  }

  function saveHarmonyExperiment(groupName?: string, colors?: GeneratedColor[]) {
    const timestamp = nowIso();
    const generatedColors = colors ?? harmonyGroups.flatMap((group) => group.colors);
    dispatch({
      type: "addColorLabExperiment",
      experiment: {
        id: createId("experiment"),
        type: "color_harmony",
        name: groupName ? `色轮实验：${groupName}` : `色轮实验 ${timestampLabel()}`,
        projectId: wheelProjectId || undefined,
        baseColorHex: baseHex,
        generatedColors: [generatedFromHex("主色", baseHex, "当前主色"), ...generatedColors],
        notes: wheelNotes.trim() || undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });
    setNotice("已保存色轮实验记录。");
  }

  function saveHarmonyScheme(groupName: string, colors: GeneratedColor[]) {
    const timestamp = nowIso();
    const basePaintId = selectedPaint?.hex.toUpperCase() === baseHex ? selectedPaint.id : createId("paint");
    if (basePaintId !== selectedPaint?.id) {
      dispatch({
        type: "upsertPaint",
        paint: {
          id: basePaintId,
          name: `配色主色 ${timestampLabel()}`,
          hex: baseHex,
          finish: "other",
          notes: "来源：配色实验室手动 HEX 主色。",
        },
      });
    }

    const generatedPaintIds = colors.map((color) => {
      const id = createId("paint");
      dispatch({
        type: "upsertPaint",
        paint: {
          id,
          name: `${groupName} ${color.role}`,
          hex: color.hex,
          finish: "other",
          notes: `来源：配色实验室 / ${groupName}\n${color.rgb} · ${color.hsl}`,
        },
      });
      return { id, color };
    });

    const schemeId = createId("scheme");
    dispatch({
      type: "upsertScheme",
      scheme: {
        id: schemeId,
        name: `配色实验方案：${groupName}`,
        description: `由配色实验室基于 ${baseHex} 自动生成。`,
        modelIds: [],
        colors: [
          { paintId: basePaintId, role: "main", layerType: "base", percentage: 60, notes: "主色" },
          ...generatedPaintIds.map(({ id, color }, index) => ({
            paintId: id,
            role: roleNameToRole[color.role] ?? roleOrder[index + 1] ?? "other",
            layerType: "base" as const,
            percentage: Math.max(5, Math.round(40 / Math.max(1, generatedPaintIds.length))),
            notes: color.notes,
          })),
        ],
        tags: ["配色实验室", groupName],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });
    const linkedProject = (data.projects ?? []).find((project) => project.id === wheelProjectId);
    if (linkedProject) {
      dispatch({
        type: "upsertProject",
        project: { ...linkedProject, colorSchemeIds: Array.from(new Set([...linkedProject.colorSchemeIds, schemeId])), updatedAt: timestamp },
      });
    }
    saveHarmonyExperiment(groupName, colors);
    setNotice("已保存为配色方案，并同步保存实验记录。");
  }

  function addMixItem() {
    const nextPaint = data.paints.find((paint) => !mixItems.some((item) => item.paintId === paint.id));
    if (!nextPaint) return window.alert("颜色库里没有更多可添加的颜色。");
    setMixItems([...mixItems, { paintId: nextPaint.id, ratioPercent: 0 }]);
  }

  function updateMixItem(index: number, patch: Partial<PaintMixItem>) {
    setMixItems(mixItems.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function deleteMixItem(index: number) {
    if (mixItems.length <= 1) return window.alert("至少保留一种颜料。");
    setMixItems(mixItems.filter((_, itemIndex) => itemIndex !== index));
  }

  function saveMixExperiment() {
    const timestamp = nowIso();
    dispatch({
      type: "addColorLabExperiment",
      experiment: {
        id: createId("experiment"),
        type: "paint_mix",
        name: `混色实验 ${timestampLabel()}`,
        projectId: mixProjectId || undefined,
        resultColorHex,
        paintMixItems: mixItems,
        generatedColors: [generatedFromHex("预估颜色", resultColorHex, "RGB 加权平均预估")],
        notes: noteFromMix(mixItems, paintNames, mixNotes),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });
    setNotice("已保存混色实验记录。");
  }

  function saveMixAsPaint() {
    dispatch({
      type: "upsertPaint",
      paint: {
        id: createId("paint"),
        name: `混色预估 ${timestampLabel()}`,
        hex: resultColorHex,
        finish: mixNotes.finish,
        notes: `来源：颜料混色实验室\n${noteFromMix(mixItems, paintNames, mixNotes)}`,
      },
    });
    saveMixExperiment();
    setNotice("已保存混色预估为新颜色，并同步保存实验记录。");
  }

  function saveMixAsScheme() {
    const timestamp = nowIso();
    const paintIds = mixItems.map((item, index) => {
      const sourcePaint = data.paints.find((paint) => paint.id === item.paintId);
      return { sourcePaint, item, role: roleOrder[index] ?? "other" };
    }).filter((item) => item.sourcePaint);
    const resultPaintId = createId("paint");
    dispatch({
      type: "upsertPaint",
      paint: {
        id: resultPaintId,
        name: `混色预估 ${timestampLabel()}`,
        hex: resultColorHex,
        finish: mixNotes.finish,
        notes: `来源：颜料混色实验室\n${noteFromMix(mixItems, paintNames, mixNotes)}`,
      },
    });
    const schemeId = createId("scheme");
    dispatch({
      type: "upsertScheme",
      scheme: {
        id: schemeId,
        name: `混色实验方案 ${timestampLabel()}`,
        description: "由颜料混色实验室保存，结果为预估颜色。",
        modelIds: [],
        colors: [
          ...paintIds.map(({ sourcePaint, item, role }) => ({
            paintId: sourcePaint!.id,
            role,
            layerType: "base" as const,
            percentage: item.ratioPercent,
            notes: "参与混色的原始颜料",
          })),
          { paintId: resultPaintId, role: "other" as const, layerType: "base" as const, percentage: 0, notes: "混色预估结果" },
        ],
        tags: ["混色实验室", "预估颜色"],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });
    const linkedProject = (data.projects ?? []).find((project) => project.id === mixProjectId);
    if (linkedProject) {
      dispatch({
        type: "upsertProject",
        project: { ...linkedProject, colorSchemeIds: Array.from(new Set([...linkedProject.colorSchemeIds, schemeId])), updatedAt: timestamp },
      });
    }
    saveMixExperiment();
    setNotice("已保存混色结果为配色方案，并同步保存实验记录。");
  }

  function applySchemeColors(schemeId: string) {
    const scheme = data.colorSchemes.find((item) => item.id === schemeId);
    if (!scheme) return;
    const findHex = (role: ColorRole) => {
      const color = scheme.colors.find((item) => item.role === role);
      return color ? data.paints.find((paint) => paint.id === color.paintId)?.hex : undefined;
    };
    setAiForm({
      ...aiForm,
      mainColorHex: findHex("main") ?? aiForm.mainColorHex,
      secondaryColorHex: findHex("secondary") ?? aiForm.secondaryColorHex,
      accentColorHex: findHex("accent") ?? aiForm.accentColorHex,
    });
  }

  async function copyPrompt(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`已复制${label}。`);
    } catch {
      setCopyStatus("复制失败，请手动选择文本复制。");
    }
  }

  function buildAiConcept(existing?: AiRepaintConcept, resultImageIds = existing?.resultImageIds ?? []): AiRepaintConcept {
    const timestamp = nowIso();
    return {
      id: existing?.id ?? createId("ai-repaint"),
      name: aiForm.name.trim() || `AI 重涂参考 ${timestampLabel()}`,
      projectId: aiForm.projectId || undefined,
      sourceImageId: aiForm.sourceImageId || undefined,
      resultImageIds,
      modelType: aiForm.modelType,
      stylePreset: aiForm.stylePreset,
      mainColorHex: normalizeHex(aiForm.mainColorHex),
      secondaryColorHex: normalizeHex(aiForm.secondaryColorHex),
      accentColorHex: normalizeHex(aiForm.accentColorHex),
      shadowColorHex: normalizeHex(aiForm.shadowColorHex),
      highlightColorHex: normalizeHex(aiForm.highlightColorHex),
      lightingDirection: aiForm.lightingDirection,
      shadowLevel: aiForm.shadowLevel,
      highlightLevel: aiForm.highlightLevel,
      contrastLevel: aiForm.contrastLevel,
      volumeLevel: aiForm.volumeLevel,
      edgeHighlight: aiForm.edgeHighlight,
      preserveOriginal: aiForm.preserveOriginal,
      comfyModelType: aiForm.comfyModelType,
      comfyImageMode: aiForm.comfyImageMode,
      denoiseStrength: aiForm.denoiseStrength,
      cfgScale: aiForm.cfgScale,
      steps: aiForm.steps,
      samplerNotes: aiForm.samplerNotes,
      seedNotes: aiForm.seedNotes,
      loraNotes: aiForm.loraNotes,
      controlNetNotes: aiForm.controlNetNotes,
      positivePromptZh: aiPrompts.positivePromptZh,
      negativePromptZh: aiPrompts.negativePromptZh,
      positivePromptEn: aiPrompts.positivePromptEn,
      negativePromptEn: aiPrompts.negativePromptEn,
      comfyPromptEn: aiPrompts.comfyPromptEn,
      promptZhDescription: aiPrompts.promptZhDescription,
      notes: aiForm.notes.trim() || undefined,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
  }

  function saveAiConcept() {
    const concept = buildAiConcept();
    dispatch({ type: "addAiRepaintConcept", concept });
    setNotice("已保存 AI 重涂方案。");
  }

  function attachAiSourceImages(uploaded: UploadedImagePayload[]) {
    const timestamp = nowIso();
    const firstId = createId("image");
    uploaded.forEach((image, index) => {
      const id = index === 0 ? firstId : createId("image");
      dispatch({
        type: "addWorkshopImage",
        image: {
          id,
          projectId: aiForm.projectId || undefined,
          title: image.title || "AI 重涂原始图",
          notes: "来源：AI 重涂参考原始图片",
          capturedAt: "",
          ...image,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });
    });
    setAiForm({ ...aiForm, sourceImageId: firstId });
    setNotice("已上传原始图片，并选为 AI 重涂参考原图。");
  }

  function attachAiResultImages(concept: AiRepaintConcept, uploaded: UploadedImagePayload[]) {
    const timestamp = nowIso();
    const ids = uploaded.map(() => createId("image"));
    uploaded.forEach((image, index) => {
      dispatch({
        type: "addWorkshopImage",
        image: {
          id: ids[index],
          projectId: concept.projectId,
          title: image.title || "AI 重涂结果图",
          notes: `来源：AI 重涂参考方案 ${concept.name}`,
          capturedAt: "",
          ...image,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });
    });
    dispatch({
      type: "updateAiRepaintConcept",
      concept: { ...concept, resultImageIds: [...ids, ...concept.resultImageIds], updatedAt: timestamp },
    });
    setNotice("已上传 AI 结果图并关联到方案。");
  }

  return (
    <>
      <PageHeader title="配色实验室" description="用色轮生成配色建议，用颜料比例记录预估混色结果。" />
      <section className="panel">
        <div className="tab-row">
          <button className={`tab-button ${activeTab === "wheel" ? "active" : ""}`} type="button" onClick={() => setActiveTab("wheel")}>色轮</button>
          <button className={`tab-button ${activeTab === "mix" ? "active" : ""}`} type="button" onClick={() => setActiveTab("mix")}>颜料混色</button>
          <button className={`tab-button ${activeTab === "ai" ? "active" : ""}`} type="button" onClick={() => setActiveTab("ai")}>AI 重涂参考</button>
        </div>
      </section>

      {activeTab === "wheel" ? (
        <section className="color-lab-layout">
          <div className="panel form-panel">
            <h2>色轮设置</h2>
            <Field label="从颜色库选择主色">
              <select value={selectedPaintId} onChange={(event) => updateSelectedPaint(event.target.value)}>
                {data.paints.map((paint) => <option key={paint.id} value={paint.id}>{paint.name} · {paint.hex}</option>)}
              </select>
            </Field>
            <Field label="手动 HEX">
              <input value={manualHex} onChange={(event) => setManualHex(event.target.value)} placeholder="#2F6F73" />
            </Field>
            {hexError && <p className="error-text">{hexError} 当前使用安全兜底色 {baseHex}。</p>}
            <Field label="关联项目">
              <select value={wheelProjectId} onChange={(event) => setWheelProjectId(event.target.value)}>
                <option value="">不关联项目</option>
                {(data.projects ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </Field>
            <Field label="实验备注"><textarea value={wheelNotes} onChange={(event) => setWheelNotes(event.target.value)} /></Field>
            <div className="color-wheel-preview" style={{ ["--base-color" as string]: baseHex }}>
              <div className="wheel-disc" />
              <div className="base-color-card">
                <span style={{ background: baseHex }} />
                <strong>当前主色</strong>
                <small>{baseInfo.hex}</small>
                <small>{baseInfo.rgb}</small>
                <small>{baseInfo.hsl}</small>
              </div>
            </div>
            <button className="button primary" type="button" onClick={() => saveHarmonyExperiment()}>保存色轮实验</button>
          </div>
          <div className="panel">
            <h2>配色建议</h2>
            <div className="harmony-grid">
              {harmonyGroups.map((group) => (
                <article className="harmony-card" key={group.id}>
                  <div className="card-top">
                    <div>
                      <strong>{group.name}</strong>
                      <p>{group.description}</p>
                    </div>
                    <button className="button ghost" type="button" onClick={() => saveHarmonyScheme(group.name, group.colors)}>保存为配色方案</button>
                  </div>
                  <div className="generated-color-list">
                    {group.colors.map((color) => (
                      <div className="generated-color-row" key={`${group.id}-${color.hex}`}>
                        <span className="large-swatch" style={{ background: color.hex }} />
                        <div>
                          <strong>{color.role}</strong>
                          <small>{color.hex} · {color.rgb} · {color.hsl}</small>
                          <small>推荐用途：{color.role}，{color.notes}</small>
                        </div>
                        <button className="button ghost" type="button" onClick={() => saveGeneratedPaint(color, group.name)}>保存到颜色库</button>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : activeTab === "mix" ? (
        <section className="color-lab-layout">
          <div className="panel form-panel">
            <h2>颜料混色实验</h2>
            <p className="muted">这里显示的是预估颜色，不是准确颜色。真实颜料受遮盖力、透明度、底色、稀释和喷涂厚度影响。</p>
            <Field label="关联项目">
              <select value={mixProjectId} onChange={(event) => setMixProjectId(event.target.value)}>
                <option value="">不关联项目</option>
                {(data.projects ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </Field>
            <div className="mix-item-list">
              {mixItems.map((item, index) => {
                const paint = data.paints.find((paintItem) => paintItem.id === item.paintId);
                return (
                  <div className="mix-item-row" key={`${item.paintId}-${index}`}>
                    <span className="mini-color" style={{ background: paint?.hex ?? "#808080" }} />
                    <select value={item.paintId} onChange={(event) => updateMixItem(index, { paintId: event.target.value })}>
                      {data.paints.map((paintOption) => <option key={paintOption.id} value={paintOption.id}>{paintOption.name}</option>)}
                    </select>
                    <input type="number" min="0" max="100" value={item.ratioPercent} onChange={(event) => updateMixItem(index, { ratioPercent: Number(event.target.value) })} />
                    <span>%</span>
                    <button className="button ghost danger" type="button" onClick={() => deleteMixItem(index)}>删除</button>
                  </div>
                );
              })}
            </div>
            <button className="button ghost" type="button" onClick={addMixItem}>新增颜料</button>
            <div className="form-grid">
              <Field label="稀释剂"><input value={mixNotes.thinner} onChange={(event) => setMixNotes({ ...mixNotes, thinner: event.target.value })} /></Field>
              <Field label="漆面">
                <select value={mixNotes.finish} onChange={(event) => setMixNotes({ ...mixNotes, finish: event.target.value as PaintFinish })}>
                  {Object.entries(finishLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="喷涂效果"><textarea value={mixNotes.sprayEffect} onChange={(event) => setMixNotes({ ...mixNotes, sprayEffect: event.target.value })} /></Field>
            <Field label="失败问题"><textarea value={mixNotes.failureIssues} onChange={(event) => setMixNotes({ ...mixNotes, failureIssues: event.target.value })} /></Field>
            <Field label="其他说明"><textarea value={mixNotes.other} onChange={(event) => setMixNotes({ ...mixNotes, other: event.target.value })} /></Field>
          </div>
          <div className="panel">
            <h2>预估颜色</h2>
            <div className="mix-result-card">
              <div className="mix-result-swatch" style={{ background: resultColorHex }} />
              <div>
                <strong>{resultInfo.hex}</strong>
                <span>{resultInfo.rgb}</span>
                <span>{resultInfo.hsl}</span>
                <p className={Math.abs(mixTotal - 100) <= 2 ? "muted" : "error-text"}>总比例：{mixTotal}% · {mixStatus}</p>
              </div>
            </div>
            <div className="ratio-bar" aria-label="颜色比例条">
              {mixItems.map((item, index) => {
                const paint = data.paints.find((paintItem) => paintItem.id === item.paintId);
                return <span key={`${item.paintId}-${index}`} style={{ width: `${Math.max(0, item.ratioPercent)}%`, background: paint?.hex ?? "#808080" }} title={`${paint?.name ?? "未知颜色"} ${item.ratioPercent}%`} />;
              })}
            </div>
            <div className="item-list">
              {mixItems.map((item, index) => {
                const paint = data.paints.find((paintItem) => paintItem.id === item.paintId);
                return (
                  <article className="list-card" key={`${item.paintId}-summary-${index}`}>
                    <strong>{paint?.name ?? "颜色已删除"} · {item.ratioPercent}%</strong>
                    <span>{[paint?.brand, paint?.code].filter(Boolean).join(" · ") || "未填写品牌色号"}</span>
                    <small>{paint?.hex ?? "#808080"}</small>
                  </article>
                );
              })}
            </div>
            <div className="button-row">
              <button className="button primary" type="button" onClick={saveMixExperiment}>保存混色实验</button>
              <button className="button ghost" type="button" onClick={saveMixAsPaint}>保存为新颜色</button>
              <button className="button ghost" type="button" onClick={saveMixAsScheme}>保存为配色方案</button>
            </div>
          </div>
        </section>
      ) : (
        <section className="ai-repaint-stack">
          <div className="panel ai-info-panel">
            <h2>AI 重涂参考</h2>
            <p>推荐使用 ComfyUI 作为重涂参考图生成工具。Stable Diffusion / SDXL / 其他模型作为 ComfyUI 内部模型使用。本网站不直接生图，只负责生成提示词、保存参数和归档结果图。</p>
            <p className="error-text">当前网站部署在 GitHub Pages，是纯静态前端。请不要把任何 AI API Key 写入前端代码。如需真正内置 AI 生图，未来需要后端代理、本地模型，或继续使用外部 AI 工具手动生成。</p>
          </div>

          <section className="color-lab-layout">
            <div className="panel form-panel">
              <h2>原始图片与项目</h2>
              <Field label="方案名称"><input value={aiForm.name} onChange={(event) => setAiForm({ ...aiForm, name: event.target.value })} placeholder="例如 RX-78 动漫风重涂参考" /></Field>
              <Field label="关联项目">
                <select value={aiForm.projectId} onChange={(event) => setAiForm({ ...aiForm, projectId: event.target.value })}>
                  <option value="">不关联项目</option>
                  {(data.projects ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </Field>
              <Field label="原始图片">
                <select value={aiForm.sourceImageId} onChange={(event) => setAiForm({ ...aiForm, sourceImageId: event.target.value })}>
                  <option value="">请选择图片档案</option>
                  {(data.workshopImages ?? []).map((image) => <option key={image.id} value={image.id}>{image.title || "未命名图片"} · {image.storageType ?? "dataUrl"}</option>)}
                </select>
              </Field>
              {selectedSourceImage ? (
                <div className="ai-image-card">
                  <WorkshopImageView image={selectedSourceImage} alt={selectedSourceImage.title || "AI 重涂原始图"} />
                  <span>{selectedSourceImage.title || "原始图片"}</span>
                </div>
              ) : <p className="muted">请选择或上传一张原始模型图片。</p>}
              <ImageUploader label="上传新原始图片" fileNamePrefix="ai-source" onUpload={attachAiSourceImages} />

              <h2>重涂方向</h2>
              <div className="form-grid">
                <Field label="模型类型">
                  <select value={aiForm.modelType} onChange={(event) => setAiForm({ ...aiForm, modelType: event.target.value })}>
                    {modelTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
                <Field label="目标风格">
                  <select value={aiForm.stylePreset} onChange={(event) => setAiForm({ ...aiForm, stylePreset: event.target.value })}>
                    {stylePresetOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="从配色方案快速套用">
                <select value="" onChange={(event) => applySchemeColors(event.target.value)}>
                  <option value="">选择配色方案</option>
                  {data.colorSchemes.map((scheme) => <option key={scheme.id} value={scheme.id}>{scheme.name}</option>)}
                </select>
              </Field>
              <div className="form-grid">
                {[
                  ["主色", "mainColorHex"],
                  ["辅色", "secondaryColorHex"],
                  ["点缀色", "accentColorHex"],
                  ["阴影色", "shadowColorHex"],
                  ["高光色", "highlightColorHex"],
                ].map(([label, key]) => (
                  <Field key={key} label={label}>
                    <input type="color" value={normalizeHex(String(aiForm[key as keyof typeof aiForm] ?? "#808080"))} onChange={(event) => setAiForm({ ...aiForm, [key]: event.target.value })} />
                    <input value={String(aiForm[key as keyof typeof aiForm] ?? "")} onChange={(event) => setAiForm({ ...aiForm, [key]: event.target.value })} />
                  </Field>
                ))}
              </div>
              <Field label="从颜色库 / 实验结果选择候选色">
                <select value="" onChange={(event) => event.target.value && setAiForm({ ...aiForm, accentColorHex: event.target.value })}>
                  <option value="">选择后填入点缀色</option>
                  {data.paints.map((paint) => <option key={paint.id} value={paint.hex}>{paint.name} · {paint.hex}</option>)}
                  {experimentColorOptions.map((item, index) => <option key={`${item.hex}-${index}`} value={item.hex}>{item.label} · {item.hex}</option>)}
                </select>
              </Field>

              <h2>光影方向</h2>
              <div className="form-grid">
                <Field label="光源方向">
                  <select value={aiForm.lightingDirection} onChange={(event) => setAiForm({ ...aiForm, lightingDirection: event.target.value })}>
                    {lightingOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
                <Field label="阴影强度">
                  <select value={aiForm.shadowLevel} onChange={(event) => setAiForm({ ...aiForm, shadowLevel: event.target.value as AiShadowLevel })}>
                    {Object.entries(shadowLevelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="高光强度">
                  <select value={aiForm.highlightLevel} onChange={(event) => setAiForm({ ...aiForm, highlightLevel: event.target.value as AiHighlightLevel })}>
                    {Object.entries(highlightLevelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="对比度">
                  <select value={aiForm.contrastLevel} onChange={(event) => setAiForm({ ...aiForm, contrastLevel: event.target.value as AiContrastLevel })}>
                    {Object.entries(contrastLevelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="体积感">
                  <select value={aiForm.volumeLevel} onChange={(event) => setAiForm({ ...aiForm, volumeLevel: event.target.value as AiVolumeLevel })}>
                    {Object.entries(volumeLevelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="边缘高光">
                  <select value={aiForm.edgeHighlight} onChange={(event) => setAiForm({ ...aiForm, edgeHighlight: event.target.value as AiEdgeHighlight })}>
                    {Object.entries(edgeHighlightLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="保留原造型">
                  <select value={aiForm.preserveOriginal} onChange={(event) => setAiForm({ ...aiForm, preserveOriginal: event.target.value as AiPreserveOriginal })}>
                    {Object.entries(preserveOriginalLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
              </div>

              <h2>ComfyUI 参数</h2>
              <div className="form-grid">
                <Field label="推荐模型类型"><input value={aiForm.comfyModelType} onChange={(event) => setAiForm({ ...aiForm, comfyModelType: event.target.value })} /></Field>
                <Field label="图像模式">
                  <select value={aiForm.comfyImageMode} onChange={(event) => setAiForm({ ...aiForm, comfyImageMode: event.target.value as ComfyImageMode })}>
                    {Object.entries(comfyImageModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="denoise strength"><input value={aiForm.denoiseStrength} onChange={(event) => setAiForm({ ...aiForm, denoiseStrength: event.target.value })} /></Field>
                <Field label="CFG scale"><input value={aiForm.cfgScale} onChange={(event) => setAiForm({ ...aiForm, cfgScale: event.target.value })} /></Field>
                <Field label="steps"><input value={aiForm.steps} onChange={(event) => setAiForm({ ...aiForm, steps: event.target.value })} /></Field>
                <Field label="sampler 备注"><input value={aiForm.samplerNotes} onChange={(event) => setAiForm({ ...aiForm, samplerNotes: event.target.value })} /></Field>
              </div>
              <Field label="seed 备注"><input value={aiForm.seedNotes} onChange={(event) => setAiForm({ ...aiForm, seedNotes: event.target.value })} /></Field>
              <Field label="LoRA 备注"><input value={aiForm.loraNotes} onChange={(event) => setAiForm({ ...aiForm, loraNotes: event.target.value })} /></Field>
              <Field label="ControlNet / reference 备注"><textarea value={aiForm.controlNetNotes} onChange={(event) => setAiForm({ ...aiForm, controlNetNotes: event.target.value })} /></Field>
              <Field label="补充备注"><textarea value={aiForm.notes} onChange={(event) => setAiForm({ ...aiForm, notes: event.target.value })} /></Field>
              <button className="button primary" type="button" onClick={saveAiConcept}>保存当前 AI 重涂方案</button>
            </div>

            <div className="panel">
              <h2>提示词输出</h2>
              {copyStatus && <p className="muted">{copyStatus}</p>}
              <div className="prompt-panel-list">
                {[
                  ["通用英文提示词", aiPrompts.positivePromptEn, "通用英文提示词"],
                  ["ComfyUI 推荐提示词", aiPrompts.comfyPromptEn, "ComfyUI 推荐提示词"],
                  ["中文说明", aiPrompts.promptZhDescription, "中文说明"],
                  ["负向提示词", `${aiPrompts.negativePromptZh}\n\n${aiPrompts.negativePromptEn}`, "负向提示词"],
                ].map(([title, text, label]) => (
                  <article className="prompt-panel" key={title}>
                    <div className="card-top">
                      <strong>{title}</strong>
                      <button className="button ghost" type="button" onClick={() => copyPrompt(label, text)}>复制</button>
                    </div>
                    <pre>{text}</pre>
                  </article>
                ))}
              </div>
              <details className="prompt-details">
                <summary>展开中文正向 / 英文正向 / 中英文负向提示词</summary>
                <div className="prompt-panel-list">
                  {[
                    ["中文正向提示词", aiPrompts.positivePromptZh, "中文正向提示词"],
                    ["英文正向提示词", aiPrompts.positivePromptEn, "英文正向提示词"],
                    ["中文负向提示词", aiPrompts.negativePromptZh, "中文负向提示词"],
                    ["英文负向提示词", aiPrompts.negativePromptEn, "英文负向提示词"],
                  ].map(([title, text, label]) => (
                    <article className="prompt-panel" key={title}>
                      <div className="card-top">
                        <strong>{title}</strong>
                        <button className="button ghost" type="button" onClick={() => copyPrompt(label, text)}>复制</button>
                      </div>
                      <pre>{text}</pre>
                    </article>
                  ))}
                </div>
              </details>
            </div>
          </section>

          <section className="panel">
            <h2>最近 AI 重涂方案</h2>
            {recentAiConcepts.length === 0 ? <EmptyState title="还没有 AI 重涂方案" description="保存方案后，可以上传 ComfyUI 或其他 AI 工具生成的结果图。" /> : (
              <div className="item-list">
                {recentAiConcepts.map((concept) => {
                  const project = (data.projects ?? []).find((item) => item.id === concept.projectId);
                  const sourceImage = (data.workshopImages ?? []).find((image) => image.id === concept.sourceImageId);
                  const resultImages = (data.workshopImages ?? []).filter((image) => concept.resultImageIds.includes(image.id));
                  return (
                    <article className="list-card ai-concept-card" key={concept.id}>
                      <div className="card-top">
                        <strong>{concept.name}</strong>
                        <span className="badge">{concept.comfyImageMode ?? "img2img"}</span>
                      </div>
                      <span>关联项目：{project?.name ?? "未关联"} · 目标风格：{concept.stylePreset ?? "未填写"}</span>
                      <small>创建时间：{formatDate(concept.createdAt)}</small>
                      <div className="ai-compare-grid">
                        <div>
                          <strong>原图</strong>
                          {sourceImage ? <WorkshopImageView image={sourceImage} alt={`${concept.name} 原图`} /> : <p className="muted">未选择原图</p>}
                        </div>
                        <div>
                          <strong>AI 结果图</strong>
                          {resultImages.length > 0 ? <div className="ai-result-grid">{resultImages.map((image) => <WorkshopImageView key={image.id} image={image} alt={image.title || "AI 结果图"} />)}</div> : <p className="muted">暂无结果图</p>}
                        </div>
                      </div>
                      <details className="prompt-details">
                        <summary>查看提示词、ComfyUI 参数和备注</summary>
                        <pre className="compact-pre">{concept.comfyPromptEn}</pre>
                        <p className="muted">模型：{concept.comfyModelType || "未填写"} · denoise：{concept.denoiseStrength || "未填写"} · CFG：{concept.cfgScale || "未填写"} · steps：{concept.steps || "未填写"}</p>
                        <p>{concept.notes || "暂无备注"}</p>
                      </details>
                      <ImageUploader label="上传 AI 结果图" fileNamePrefix={`ai-result-${concept.id}`} onUpload={(uploaded) => attachAiResultImages(concept, uploaded)} />
                      <ConfirmDelete onConfirm={() => dispatch({ type: "deleteAiRepaintConcept", id: concept.id })} />
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      )}

      <section className="panel">
        <h2>最近实验</h2>
        {recentExperiments.length === 0 ? <EmptyState title="还没有配色实验" description="保存色轮或混色实验后，这里会显示最近记录。" /> : (
          <div className="item-list">
            {recentExperiments.map((experiment) => {
              const project = (data.projects ?? []).find((item) => item.id === experiment.projectId);
              return (
                <article className="list-card" key={experiment.id}>
                  <div className="card-top">
                    <strong>{experiment.name}</strong>
                    <span className="badge">{experiment.type === "color_harmony" ? "色轮实验" : "混色实验"}</span>
                  </div>
                  <span>关联项目：{project?.name ?? "未关联"}</span>
                  <div className="mini-swatches">
                    {experiment.baseColorHex && <span style={{ background: experiment.baseColorHex }} title="主色" />}
                    {experiment.resultColorHex && <span className="mixed-dot" style={{ background: experiment.resultColorHex }} title="结果色" />}
                    {(experiment.generatedColors ?? []).slice(0, 5).map((color) => <span key={`${experiment.id}-${color.hex}-${color.role}`} style={{ background: color.hex }} title={`${color.role} ${color.hex}`} />)}
                  </div>
                  <small>创建时间：{formatDate(experiment.createdAt)}</small>
                  <p>{experiment.notes?.slice(0, 120) || "暂无备注"}</p>
                  <ConfirmDelete onConfirm={() => dispatch({ type: "deleteColorLabExperiment", id: experiment.id })} />
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
