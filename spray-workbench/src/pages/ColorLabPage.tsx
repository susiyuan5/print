import { useMemo, useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { ColorRole, GeneratedColor, PaintFinish, PaintMixItem } from "../types/workbench";
import { finishLabels, roleLabels } from "../utils/colors";
import { formatDate, nowIso } from "../utils/dates";
import { createId } from "../utils/ids";
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

type ColorLabTab = "wheel" | "mix";

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

  return (
    <>
      <PageHeader title="配色实验室" description="用色轮生成配色建议，用颜料比例记录预估混色结果。" />
      <section className="panel">
        <div className="tab-row">
          <button className={`tab-button ${activeTab === "wheel" ? "active" : ""}`} type="button" onClick={() => setActiveTab("wheel")}>色轮</button>
          <button className={`tab-button ${activeTab === "mix" ? "active" : ""}`} type="button" onClick={() => setActiveTab("mix")}>颜料混色</button>
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
      ) : (
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
