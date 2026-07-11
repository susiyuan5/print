import type { ReviewIssueTag, ReviewRecommendation } from "../types/workbench";

export function recommendReview(tags: ReviewIssueTag[], timestamp = new Date().toISOString()): ReviewRecommendation {
  const has = (tag: ReviewIssueTag) => tags.includes(tag);
  const color: string[] = [];
  const process: string[] = [];
  if (has("too_warm")) color.push("少量加入冷色或中性灰校正暖偏");
  if (has("too_cool")) color.push("少量加入暖色校正冷偏");
  if (has("too_light")) color.push("降低亮色比例，先做小样验证");
  if (has("too_dark")) color.push("提高亮色比例或减少深色漆");
  if (has("too_saturated")) color.push("以中性灰或互补色少量降饱和");
  if (has("too_muted")) color.push("小幅提高主色纯度，避免一次加太多");
  if (has("poor_coverage")) process.push("增加薄喷层数，确认底漆遮盖力");
  if (has("rough_surface")) process.push("适度提高稀释比例、降低单层出漆量并检查干燥距离");
  if (has("runs")) process.push("降低出漆量或气压，拉开层间闪干时间");
  return {
    summary: tags.length ? `已根据 ${tags.length} 项观察生成下一次试喷建议。` : "未选择问题标签；建议先记录目标与实际效果。",
    colorAdjustment: color.join("；") || "颜色方向稳定，先以原配方做小面积复测。",
    processAdjustment: process.join("；") || "保持现有工艺参数，并记录每层的干燥时间。",
    generatedAt: timestamp,
  };
}
