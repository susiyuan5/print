import { useMemo, useState } from "react";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { PreviewShape } from "../types/workbench";
import { shapeLabels } from "../utils/colors";

function PreviewSvg({ shape, main, secondary, accent }: { shape: PreviewShape; main: string; secondary: string; accent: string }) {
  if (shape === "aircraft") {
    return (
      <svg viewBox="0 0 900 520" role="img" aria-label="飞行器预览">
        <rect className="preview-bg" width="900" height="520" rx="20" />
        <path d="M448 70 510 292 830 350 515 388 450 470 385 388 70 350 390 292Z" fill={main} stroke="#222" strokeWidth="8" />
        <path d="M410 210h80l45 140H365Z" fill={secondary} opacity="0.92" />
        <path d="M430 94h40v332h-40z" fill={accent} opacity="0.9" />
      </svg>
    );
  }
  if (shape === "robot") {
    return (
      <svg viewBox="0 0 900 520" role="img" aria-label="机器人预览">
        <rect className="preview-bg" width="900" height="520" rx="20" />
        <rect x="330" y="70" width="240" height="150" rx="26" fill={main} stroke="#222" strokeWidth="8" />
        <rect x="285" y="220" width="330" height="190" rx="36" fill={secondary} stroke="#222" strokeWidth="8" />
        <rect x="210" y="240" width="70" height="150" rx="22" fill={main} stroke="#222" strokeWidth="8" />
        <rect x="620" y="240" width="70" height="150" rx="22" fill={main} stroke="#222" strokeWidth="8" />
        <circle cx="405" cy="140" r="20" fill={accent} />
        <circle cx="495" cy="140" r="20" fill={accent} />
        <path d="M390 450h120" stroke={accent} strokeWidth="32" strokeLinecap="round" />
      </svg>
    );
  }
  if (shape === "part") {
    return (
      <svg viewBox="0 0 900 520" role="img" aria-label="零件预览">
        <rect className="preview-bg" width="900" height="520" rx="20" />
        <path d="M270 140h360l70 120-70 120H270l-70-120Z" fill={main} stroke="#222" strokeWidth="8" />
        <circle cx="350" cy="260" r="68" fill={secondary} stroke="#222" strokeWidth="8" />
        <circle cx="550" cy="260" r="68" fill={secondary} stroke="#222" strokeWidth="8" />
        <path d="M260 150 640 370" stroke={accent} strokeWidth="28" strokeLinecap="round" opacity="0.9" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 900 520" role="img" aria-label="车辆预览">
      <rect className="preview-bg" width="900" height="520" rx="20" />
      <path d="M170 300 235 205h320l90 95h70c30 0 55 25 55 55v35H130v-35c0-30 18-55 40-55Z" fill={main} stroke="#222" strokeWidth="8" />
      <path d="M285 225h230l58 75H238Z" fill={secondary} stroke="#222" strokeWidth="7" />
      <path d="M160 335h590" stroke={accent} strokeWidth="28" strokeLinecap="round" />
      <circle cx="285" cy="395" r="58" fill="#20242a" />
      <circle cx="610" cy="395" r="58" fill="#20242a" />
      <circle cx="285" cy="395" r="26" fill={accent} />
      <circle cx="610" cy="395" r="26" fill={accent} />
    </svg>
  );
}

export function ColorPreviewPage() {
  const { data } = useWorkbench();
  const [shape, setShape] = useState<PreviewShape>("car");
  const [mainPaintId, setMainPaintId] = useState(data.paints[0]?.id ?? "");
  const [secondaryPaintId, setSecondaryPaintId] = useState(data.paints[1]?.id ?? data.paints[0]?.id ?? "");
  const [accentPaintId, setAccentPaintId] = useState(data.paints[2]?.id ?? data.paints[0]?.id ?? "");
  const main = useMemo(() => data.paints.find((paint) => paint.id === mainPaintId), [data.paints, mainPaintId]);
  const secondary = useMemo(() => data.paints.find((paint) => paint.id === secondaryPaintId), [data.paints, secondaryPaintId]);
  const accent = useMemo(() => data.paints.find((paint) => paint.id === accentPaintId), [data.paints, accentPaintId]);

  return (
    <>
      <PageHeader title="颜色预览" description="选择轮廓和颜色，实时查看主色、辅色、点缀色组合。" />
      <section className="preview-layout">
        <div className="panel preview-controls">
          <h2>预览设置</h2>
          <Field label="模型轮廓">
            <select value={shape} onChange={(e) => setShape(e.target.value as PreviewShape)}>
              {Object.entries(shapeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="主色">
            <select value={mainPaintId} onChange={(e) => setMainPaintId(e.target.value)}>
              {data.paints.map((paint) => <option key={paint.id} value={paint.id}>{paint.name}</option>)}
            </select>
          </Field>
          <Field label="辅色">
            <select value={secondaryPaintId} onChange={(e) => setSecondaryPaintId(e.target.value)}>
              {data.paints.map((paint) => <option key={paint.id} value={paint.id}>{paint.name}</option>)}
            </select>
          </Field>
          <Field label="点缀色">
            <select value={accentPaintId} onChange={(e) => setAccentPaintId(e.target.value)}>
              {data.paints.map((paint) => <option key={paint.id} value={paint.id}>{paint.name}</option>)}
            </select>
          </Field>
          <div className="selected-colors">
            {[["主色", main], ["辅色", secondary], ["点缀色", accent]].map(([label, paint]) => (
              <div className="selected-color" key={label as string}>
                <span style={{ background: typeof paint === "object" && paint ? paint.hex : "#ccc" }} />
                <p>{label as string}：{typeof paint === "object" && paint ? `${paint.name} ${paint.hex}` : "未选择"}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="preview-stage">
          <PreviewSvg shape={shape} main={main?.hex ?? "#d8d8d8"} secondary={secondary?.hex ?? "#9aa4b2"} accent={accent?.hex ?? "#d83b32"} />
        </div>
      </section>
    </>
  );
}
