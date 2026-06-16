import type {
  AiContrastLevel,
  AiEdgeHighlight,
  AiHighlightLevel,
  AiPreserveOriginal,
  AiShadowLevel,
  AiVolumeLevel,
  ComfyImageMode,
} from "../types/workbench";

export interface AiRepaintPromptInput {
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
  notes?: string;
}

export interface AiRepaintPromptOutput {
  positivePromptZh: string;
  negativePromptZh: string;
  positivePromptEn: string;
  negativePromptEn: string;
  comfyPromptEn: string;
  promptZhDescription: string;
}

const shadowLabels: Record<AiShadowLevel, string> = { low: "弱", medium: "中", high: "强" };
const highlightLabels: Record<AiHighlightLevel, string> = { low: "弱", medium: "中", high: "强" };
const contrastLabels: Record<AiContrastLevel, string> = { natural: "自然", high: "高对比", comic: "漫画感" };
const volumeLabels: Record<AiVolumeLevel, string> = {
  natural: "自然",
  enhanced_body: "强化肌肉和褶皱",
  enhanced_mecha: "强化机械边缘",
};
const edgeLabels: Record<AiEdgeHighlight, string> = { none: "无", subtle: "轻微", strong: "明显" };
const preserveLabels: Record<AiPreserveOriginal, string> = { strict: "必须保留", slight_beautify: "可轻微美化" };
const imageModeLabels: Record<ComfyImageMode, string> = {
  img2img: "img2img",
  reference_image: "reference image",
  control_workflow: "control workflow",
};
const modelTypeEn: Record<string, string> = {
  "手办": "collectible figure",
  "高达 / 机甲": "Gundam mecha model kit",
  "汽车模型": "car scale model",
  "飞机模型": "aircraft scale model",
  "军模": "military scale model",
  "零件": "model kit part",
  "其他": "painted model object",
};
const stylePresetEn: Record<string, string> = {
  "轻度重涂": "subtle repaint",
  "动漫风光影": "anime-style lighting",
  "漫画重阴影": "comic-style heavy shadow",
  "高对比展示风": "high-contrast showcase photography",
  "收藏级细腻涂装": "premium collectible figure paintwork",
  "展会摄影风": "exhibition photography look",
  "旧化战损": "weathered battle-damaged finish",
  "金属质感": "metallic paint finish",
  "透明件 / 荧光效果": "translucent parts and fluorescent effect",
};
const lightingEn: Record<string, string> = { "左上": "upper-left", "右上": "upper-right", "正面": "front", "侧光": "side", "背光": "backlight" };
const shadowLabelsEn: Record<AiShadowLevel, string> = { low: "low", medium: "medium", high: "strong" };
const highlightLabelsEn: Record<AiHighlightLevel, string> = { low: "low", medium: "medium", high: "strong" };
const contrastLabelsEn: Record<AiContrastLevel, string> = { natural: "natural", high: "high-contrast", comic: "comic-style" };
const volumeLabelsEn: Record<AiVolumeLevel, string> = { natural: "natural", enhanced_body: "enhanced body folds and muscle volume", enhanced_mecha: "enhanced mechanical edges and panel volume" };
const edgeLabelsEn: Record<AiEdgeHighlight, string> = { none: "no", subtle: "subtle", strong: "strong" };

function clean(items: Array<string | undefined | false>) {
  return items.filter(Boolean).join("，");
}

function cleanEn(items: Array<string | undefined | false>) {
  return items.filter(Boolean).join(", ");
}

function colorLine(input: AiRepaintPromptInput) {
  return clean([
    input.mainColorHex && `主色 ${input.mainColorHex}`,
    input.secondaryColorHex && `辅色 ${input.secondaryColorHex}`,
    input.accentColorHex && `点缀色 ${input.accentColorHex}`,
    input.shadowColorHex && `阴影色 ${input.shadowColorHex}`,
    input.highlightColorHex && `高光色 ${input.highlightColorHex}`,
  ]);
}

function colorLineEn(input: AiRepaintPromptInput) {
  return cleanEn([
    input.mainColorHex && `main color ${input.mainColorHex}`,
    input.secondaryColorHex && `secondary color ${input.secondaryColorHex}`,
    input.accentColorHex && `accent color ${input.accentColorHex}`,
    input.shadowColorHex && `shadow color ${input.shadowColorHex}`,
    input.highlightColorHex && `highlight color ${input.highlightColorHex}`,
  ]);
}

export function generateAiRepaintPrompt(input: AiRepaintPromptInput): AiRepaintPromptOutput {
  const modelType = input.modelType || "手办";
  const stylePreset = input.stylePreset || "动漫风光影";
  const modelTypeEnglish = modelTypeEn[modelType] ?? modelType;
  const stylePresetEnglish = stylePresetEn[stylePreset] ?? stylePreset;
  const colorText = colorLine(input) || "按当前配色方向重新设计颜色";
  const colorTextEn = colorLineEn(input) || "repaint with the selected color direction";
  const lighting = input.lightingDirection || "左上";
  const lightingEnglish = lightingEn[lighting] ?? lighting;
  const shadow = shadowLabels[input.shadowLevel ?? "medium"];
  const shadowEnglish = shadowLabelsEn[input.shadowLevel ?? "medium"];
  const highlight = highlightLabels[input.highlightLevel ?? "medium"];
  const highlightEnglish = highlightLabelsEn[input.highlightLevel ?? "medium"];
  const contrast = contrastLabels[input.contrastLevel ?? "high"];
  const contrastEnglish = contrastLabelsEn[input.contrastLevel ?? "high"];
  const volume = volumeLabels[input.volumeLevel ?? "natural"];
  const volumeEnglish = volumeLabelsEn[input.volumeLevel ?? "natural"];
  const edge = edgeLabels[input.edgeHighlight ?? "subtle"];
  const edgeEnglish = edgeLabelsEn[input.edgeHighlight ?? "subtle"];
  const preserve = preserveLabels[input.preserveOriginal ?? "strict"];
  const imageMode = imageModeLabels[input.comfyImageMode ?? "img2img"];

  const positivePromptZh = clean([
    `${modelType}重涂参考图`,
    `目标风格：${stylePreset}`,
    colorText,
    `光源方向：${lighting}`,
    `阴影强度：${shadow}`,
    `高光强度：${highlight}`,
    `对比度：${contrast}`,
    `体积感：${volume}`,
    `边缘高光：${edge}`,
    `${preserve}原始模型造型、姿势、比例和构图`,
    "强化阴影、高光、边缘层次和手涂模型质感",
    "让重涂后的光影更合理、体积感更强、像完成后的收藏级手办涂装",
    input.notes && `补充说明：${input.notes}`,
  ]);

  const positivePromptEn = cleanEn([
    "repaint reference",
    "figure repaint",
    "img2img repaint concept",
    `${modelTypeEnglish} repaint concept`,
    `${stylePresetEnglish} style`,
    colorTextEn,
    `lighting from ${lightingEnglish}`,
    `${shadowEnglish} shadow strength`,
    `${highlightEnglish} highlight strength`,
    `${contrastEnglish} contrast`,
    `${volumeEnglish} rendering`,
    `${edgeEnglish} edge highlights`,
    "preserve original sculpture",
    "preserve pose and proportions",
    "same object, same pose, same composition",
    "improved cel-shading",
    "enhanced cel-shading",
    "stronger shadows and highlights",
    "anime-style lighting",
    "hand-painted model kit finish",
    "realistic collectible figure paintwork",
    "collectible figure repaint",
    "enhanced volume and edge highlights",
    "volumetric lighting for painted figure",
    input.notes && `additional notes: ${input.notes}`,
  ]);

  const negativePromptZh = clean([
    "不改变模型造型",
    "不改变姿势",
    "不改变比例",
    "不改变脸部结构",
    "不增加多余零件",
    "不改变原构图",
    "不要变成真人",
    "不要变成插画，除非用户明确选择插画风",
    "不要过度磨皮",
    "不要失去手办质感",
    "不要改变背景，除非用户选择",
    "不要让边缘融化",
    "不要产生多余手指、肢体或机械部件",
  ]);

  const negativePromptEn = cleanEn([
    "do not change the original model shape",
    "do not change the pose",
    "do not change proportions",
    "do not change facial structure",
    "do not add extra parts",
    "do not change the original composition",
    "do not turn into a real person",
    "do not turn into a flat illustration unless illustration style is requested",
    "no over-smoothed skin",
    "do not lose collectible figure texture",
    "do not change the background unless requested",
    "no melted edges",
    "no extra limbs, fingers, armor parts, weapons, or mechanical parts",
  ]);

  const comfyPromptEn = [
    positivePromptEn,
    cleanEn([
      `ComfyUI workflow: ${imageMode}`,
      `recommended model type: ${input.comfyModelType || "SDXL / figure repaint"}`,
      `denoise strength: ${input.denoiseStrength || "0.35 - 0.55"}`,
      `CFG scale: ${input.cfgScale || "5 - 7"}`,
      `steps: ${input.steps || "25 - 35"}`,
      input.samplerNotes && `sampler notes: ${input.samplerNotes}`,
      input.seedNotes && `seed notes: ${input.seedNotes}`,
      input.loraNotes && `LoRA notes: ${input.loraNotes}`,
      input.controlNetNotes && `ControlNet / reference notes: ${input.controlNetNotes}`,
      "use the original image as reference input, keep silhouette, pose, composition, and sculpt details",
    ]),
  ].join("\n");

  const promptZhDescription = [
    "推荐使用 ComfyUI 作为重涂参考图生成工具。Stable Diffusion / SDXL / 其他模型作为 ComfyUI 内部模型使用。",
    "建议把原图作为 img2img、reference image 或 ControlNet/reference 输入，优先保持轮廓、姿势和构图。",
    `当前建议参数：模型类型 ${input.comfyModelType || "SDXL / figure repaint"}，图像模式 ${imageMode}，denoise ${input.denoiseStrength || "0.35 - 0.55"}，CFG ${input.cfgScale || "5 - 7"}，steps ${input.steps || "25 - 35"}。`,
    "本网站不直接生图，只负责生成提示词、保存参数和归档结果图。",
  ].join("\n");

  return {
    positivePromptZh,
    negativePromptZh,
    positivePromptEn,
    negativePromptEn,
    comfyPromptEn,
    promptZhDescription,
  };
}
