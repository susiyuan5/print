import { useMemo, useState } from "react";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { PreviewShape } from "../types/workbench";
import { shapeLabels } from "../utils/colors";

type CanvasBg = "dark" | "light" | "grid";

const zones: Record<PreviewShape, Array<{ id: string; label: string }>> = {
  car: [
    { id: "body", label: "车身" },
    { id: "window", label: "座舱" },
    { id: "stripe", label: "拉花" },
    { id: "wheel", label: "轮毂" },
  ],
  aircraft: [
    { id: "body", label: "机身" },
    { id: "wing", label: "机翼" },
    { id: "stripe", label: "识别条" },
    { id: "tail", label: "尾翼" },
  ],
  robot: [
    { id: "armor", label: "外甲" },
    { id: "torso", label: "躯干" },
    { id: "sensor", label: "传感器" },
    { id: "frame", label: "骨架" },
  ],
  part: [
    { id: "shell", label: "外壳" },
    { id: "joint", label: "连接孔" },
    { id: "mark", label: "标记线" },
    { id: "edge", label: "边缘" },
  ],
};

function ZoneSvg({ shape, colors }: { shape: PreviewShape; colors: Record<string, string> }) {
  const c = (id: string, fallback: string) => colors[id] || fallback;
  if (shape === "aircraft") {
    return (
      <svg viewBox="0 0 900 520" role="img" aria-label="飞行器分区预览">
        <path d="M448 70 510 292 830 350 515 388 450 470 385 388 70 350 390 292Z" fill={c("wing", "#d8d8d8")} stroke="#111827" strokeWidth="8" />
        <path d="M430 94h40v332h-40z" fill={c("body", "#9aa4b2")} />
        <path d="M410 210h80l45 140H365Z" fill={c("stripe", "#d83b32")} opacity="0.92" />
        <path d="M388 390 450 470 512 390Z" fill={c("tail", "#555b62")} />
      </svg>
    );
  }
  if (shape === "robot") {
    return (
      <svg viewBox="0 0 900 520" role="img" aria-label="机器人分区预览">
        <rect x="330" y="70" width="240" height="150" rx="26" fill={c("armor", "#d8d8d8")} stroke="#111827" strokeWidth="8" />
        <rect x="285" y="220" width="330" height="190" rx="36" fill={c("torso", "#9aa4b2")} stroke="#111827" strokeWidth="8" />
        <rect x="210" y="240" width="70" height="150" rx="22" fill={c("frame", "#555b62")} stroke="#111827" strokeWidth="8" />
        <rect x="620" y="240" width="70" height="150" rx="22" fill={c("frame", "#555b62")} stroke="#111827" strokeWidth="8" />
        <circle cx="405" cy="140" r="20" fill={c("sensor", "#d83b32")} />
        <circle cx="495" cy="140" r="20" fill={c("sensor", "#d83b32")} />
      </svg>
    );
  }
  if (shape === "part") {
    return (
      <svg viewBox="0 0 900 520" role="img" aria-label="零件分区预览">
        <path d="M270 140h360l70 120-70 120H270l-70-120Z" fill={c("shell", "#d8d8d8")} stroke="#111827" strokeWidth="8" />
        <circle cx="350" cy="260" r="68" fill={c("joint", "#9aa4b2")} stroke="#111827" strokeWidth="8" />
        <circle cx="550" cy="260" r="68" fill={c("joint", "#9aa4b2")} stroke="#111827" strokeWidth="8" />
        <path d="M260 150 640 370" stroke={c("mark", "#d83b32")} strokeWidth="28" strokeLinecap="round" opacity="0.9" />
        <path d="M270 140h360" stroke={c("edge", "#555b62")} strokeWidth="18" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 900 520" role="img" aria-label="车辆分区预览">
      <path d="M170 300 235 205h320l90 95h70c30 0 55 25 55 55v35H130v-35c0-30 18-55 40-55Z" fill={c("body", "#d8d8d8")} stroke="#111827" strokeWidth="8" />
      <path d="M285 225h230l58 75H238Z" fill={c("window", "#9aa4b2")} stroke="#111827" strokeWidth="7" />
      <path d="M160 335h590" stroke={c("stripe", "#d83b32")} strokeWidth="28" strokeLinecap="round" />
      <circle cx="285" cy="395" r="58" fill="#20242a" />
      <circle cx="610" cy="395" r="58" fill="#20242a" />
      <circle cx="285" cy="395" r="26" fill={c("wheel", "#e8b44f")} />
      <circle cx="610" cy="395" r="26" fill={c("wheel", "#e8b44f")} />
    </svg>
  );
}

export function ColorPreviewPage() {
  const { data } = useWorkbench();
  const [shape, setShape] = useState<PreviewShape>("car");
  const [background, setBackground] = useState<CanvasBg>("grid");
  const [focusMode, setFocusMode] = useState(false);
  const defaultPaint = data.paints[0]?.id ?? "";
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const currentZones = zones[shape];
  const zoneColors = useMemo(() => Object.fromEntries(currentZones.map((zone) => {
    const paintId = assignments[zone.id] || defaultPaint;
    const paint = data.paints.find((item) => item.id === paintId);
    return [zone.id, paint?.hex ?? "#d8d8d8"];
  })), [assignments, currentZones, data.paints, defaultPaint]);

  function applyScheme(schemeId: string) {
    const scheme = data.colorSchemes.find((item) => item.id === schemeId);
    if (!scheme) return;
    const next = { ...assignments };
    currentZones.forEach((zone, index) => {
      const color = scheme.colors[index] ?? scheme.colors[0];
      if (color) next[zone.id] = color.paintId;
    });
    setAssignments(next);
  }

  return (
    <>
      {!focusMode && <PageHeader title="预览画布" description="为不同模型轮廓的分区独立上色，并从配色方案快速套用。" />}
      <section className={`preview-layout ${focusMode ? "focus-preview" : ""}`}>
        {!focusMode && (
          <div className="panel preview-controls">
            <h2>画布设置</h2>
            <Field label="模型轮廓">
              <select value={shape} onChange={(e) => setShape(e.target.value as PreviewShape)}>
                {Object.entries(shapeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="画布背景">
              <select value={background} onChange={(e) => setBackground(e.target.value as CanvasBg)}>
                <option value="grid">网格背景</option>
                <option value="dark">深色背景</option>
                <option value="light">浅色背景</option>
              </select>
            </Field>
            <Field label="套用配色方案">
              <select value="" onChange={(e) => applyScheme(e.target.value)}>
                <option value="">选择方案</option>
                {data.colorSchemes.map((scheme) => <option key={scheme.id} value={scheme.id}>{scheme.name}</option>)}
              </select>
            </Field>
            <div className="zone-list">
              {currentZones.map((zone) => (
                <Field key={zone.id} label={zone.label}>
                  <select value={assignments[zone.id] || defaultPaint} onChange={(e) => setAssignments({ ...assignments, [zone.id]: e.target.value })}>
                    {data.paints.map((paint) => <option key={paint.id} value={paint.id}>{paint.name}</option>)}
                  </select>
                </Field>
              ))}
            </div>
          </div>
        )}
        <div className={`preview-stage canvas-${background}`}>
          <button className="button ghost screenshot-toggle" type="button" onClick={() => setFocusMode(!focusMode)}>{focusMode ? "退出截图模式" : "截图友好模式"}</button>
          <ZoneSvg shape={shape} colors={zoneColors} />
        </div>
      </section>
    </>
  );
}
