import { useMemo, useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { PaintColor, PaintColorFamily, PaintFinish, PaintOpacity, PaintTemperature, PaintType } from "../types/workbench";
import { colorFamilyLabels, finishLabels, inferColorFamily, inferTemperature, opacityLabels, paintTypeLabels, temperatureLabels } from "../utils/colors";
import { normalizeHex } from "../utils/colorMath";
import { sortColorsByDeltaE } from "../utils/perceptualColor";

const MIX_QUEUE_KEY = "spray-workbench:paint-mix-queue";
const emptyForm = {
  name: "",
  brand: "",
  code: "",
  hex: "#808080",
  finish: "matte" as PaintFinish,
  paintType: "other" as PaintType,
  opacity: "high_coverage" as PaintOpacity,
  temperature: "neutral" as PaintTemperature,
  colorFamily: "other" as PaintColorFamily,
  stockAmount: "",
  bottleSize: "",
  purchaseDate: "",
  favorite: false,
  notes: "",
};

export function ColorsPage() {
  const { data, dispatch, setNotice } = useWorkbench();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [viewMode, setViewMode] = useState<"card" | "compact">("card");
  const [filters, setFilters] = useState({ search: "", brand: "", paintType: "", finish: "", colorFamily: "", favorite: false });
  const [matchTargetHex, setMatchTargetHex] = useState("#808080");

  const brands = useMemo(() => Array.from(new Set(data.paints.map((paint) => paint.brand).filter(Boolean))) as string[], [data.paints]);
  const nearestPaints = useMemo(() => sortColorsByDeltaE(matchTargetHex, data.paints).slice(0, 5), [data.paints, matchTargetHex]);
  const filteredPaints = data.paints.filter((paint) => {
    const search = filters.search.trim().toLowerCase();
    const matchesSearch = !search || [paint.name, paint.brand, paint.code].filter(Boolean).some((value) => value!.toLowerCase().includes(search));
    return matchesSearch
      && (!filters.brand || paint.brand === filters.brand)
      && (!filters.paintType || (paint.paintType ?? "other") === filters.paintType)
      && (!filters.finish || (paint.finish ?? "other") === filters.finish)
      && (!filters.colorFamily || (paint.colorFamily ?? "other") === filters.colorFamily)
      && (!filters.favorite || paint.favorite);
  });

  function edit(paint: PaintColor) {
    setEditingId(paint.id);
    setForm({
      name: paint.name,
      brand: paint.brand ?? "",
      code: paint.code ?? "",
      hex: paint.hex,
      finish: paint.finish ?? "matte",
      paintType: paint.paintType ?? "other",
      opacity: paint.opacity ?? "high_coverage",
      temperature: paint.temperature ?? inferTemperature(paint.hex),
      colorFamily: paint.colorFamily ?? inferColorFamily(paint.hex, paint.finish),
      stockAmount: paint.stockAmount ?? "",
      bottleSize: paint.bottleSize ?? "",
      purchaseDate: paint.purchaseDate ?? "",
      favorite: paint.favorite ?? false,
      notes: paint.notes ?? "",
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return window.alert("请填写颜色名称。");
    dispatch({
      type: "upsertPaint",
      paint: {
        id: editingId ?? `paint_${Date.now().toString(36)}`,
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        code: form.code.trim() || undefined,
        hex: normalizeHex(form.hex),
        finish: form.finish,
        paintType: form.paintType,
        opacity: form.opacity,
        temperature: form.temperature,
        colorFamily: form.colorFamily,
        stockAmount: form.stockAmount.trim() || undefined,
        bottleSize: form.bottleSize.trim() || undefined,
        purchaseDate: form.purchaseDate || undefined,
        favorite: form.favorite,
        notes: form.notes.trim() || undefined,
      },
    });
    setEditingId(null);
    setForm(emptyForm);
  }

  function addToMix(paintId: string) {
    const current = JSON.parse(window.localStorage.getItem(MIX_QUEUE_KEY) || "[]") as string[];
    window.localStorage.setItem(MIX_QUEUE_KEY, JSON.stringify(Array.from(new Set([paintId, ...current]))));
    setNotice("已加入配漆候选，打开配色实验室的配漆工作流即可使用。");
  }

  return (
    <>
      <PageHeader title="颜色管理" description="维护现实喷涂使用的颜料颜色、品牌编号、漆种、漆面、色系和库存信息。" />
      <section className="editor-layout">
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{editingId ? "编辑颜色" : "新增颜色"}</h2>
          <div className="form-grid">
            <Field label="颜色名称"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="品牌"><input value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} /></Field>
            <Field label="编号"><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></Field>
            <Field label="色值"><input type="color" value={form.hex} onChange={(event) => setForm({ ...form, hex: event.target.value, colorFamily: inferColorFamily(event.target.value, form.finish), temperature: inferTemperature(event.target.value) })} /></Field>
            <Field label="漆面"><select value={form.finish} onChange={(event) => setForm({ ...form, finish: event.target.value as PaintFinish })}>{Object.entries(finishLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="漆种"><select value={form.paintType} onChange={(event) => setForm({ ...form, paintType: event.target.value as PaintType })}>{Object.entries(paintTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          </div>
          <details className="prompt-details">
            <summary>高级颜色信息</summary>
            <div className="form-grid">
              <Field label="遮盖力"><select value={form.opacity} onChange={(event) => setForm({ ...form, opacity: event.target.value as PaintOpacity })}>{Object.entries(opacityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="色温"><select value={form.temperature} onChange={(event) => setForm({ ...form, temperature: event.target.value as PaintTemperature })}>{Object.entries(temperatureLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="色系"><select value={form.colorFamily} onChange={(event) => setForm({ ...form, colorFamily: event.target.value as PaintColorFamily })}>{Object.entries(colorFamilyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="库存量"><input value={form.stockAmount} onChange={(event) => setForm({ ...form, stockAmount: event.target.value })} /></Field>
              <Field label="瓶容量"><input value={form.bottleSize} onChange={(event) => setForm({ ...form, bottleSize: event.target.value })} /></Field>
              <Field label="购买日期"><input type="date" value={form.purchaseDate} onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })} /></Field>
            </div>
            <label className="check-row"><input type="checkbox" checked={form.favorite} onChange={(event) => setForm({ ...form, favorite: event.target.checked })} /> 常用颜色</label>
          </details>
          <Field label="备注"><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
          <div className="button-row"><button className="button primary" type="submit">{editingId ? "保存颜色" : "新增颜色"}</button>{editingId && <button className="button ghost" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>取消编辑</button>}</div>
        </form>

        <section className="panel">
          <div className="card-top"><h2>颜色列表</h2><div className="button-row"><button className={`button ghost ${viewMode === "card" ? "active" : ""}`} onClick={() => setViewMode("card")}>大卡片</button><button className={`button ghost ${viewMode === "compact" ? "active" : ""}`} onClick={() => setViewMode("compact")}>紧凑列表</button></div></div>
          <div className="real-paint-warning">色差评分基于屏幕颜色数据，不代表喷涂后一定一致。相近色搜索只适合作为试色起点。</div>
          <div className="form-grid">
            <Field label="按目标色查找相近颜色"><input type="color" value={normalizeHex(matchTargetHex)} onChange={(event) => setMatchTargetHex(event.target.value)} /></Field>
          </div>
          <div className="recommendation-grid">
            {nearestPaints.map(({ paint, deltaE, match }) => (
              <article className="recommendation-card" key={paint.id}>
                <span className="large-swatch" style={{ background: paint.hex }} />
                <strong>{paint.name}</strong>
                <small>{paint.hex} · DeltaE {deltaE} · {match.label}</small>
                <button className="button ghost" type="button" onClick={() => addToMix(paint.id)}>加入配漆</button>
              </article>
            ))}
          </div>
          <div className="filter-grid">
            <input placeholder="搜索颜色名、品牌、色号" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
            <select value={filters.brand} onChange={(event) => setFilters({ ...filters, brand: event.target.value })}><option value="">全部品牌</option>{brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select>
            <select value={filters.paintType} onChange={(event) => setFilters({ ...filters, paintType: event.target.value })}><option value="">全部漆种</option>{Object.entries(paintTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select value={filters.finish} onChange={(event) => setFilters({ ...filters, finish: event.target.value })}><option value="">全部漆面</option>{Object.entries(finishLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select value={filters.colorFamily} onChange={(event) => setFilters({ ...filters, colorFamily: event.target.value })}><option value="">全部色系</option>{Object.entries(colorFamilyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <label className="check-row"><input type="checkbox" checked={filters.favorite} onChange={(event) => setFilters({ ...filters, favorite: event.target.checked })} /> 只看常用</label>
          </div>
          {filteredPaints.length === 0 ? <EmptyState title="没有匹配的颜色" description="调整筛选条件，或新增一个颜色。" /> : (
            <div className={viewMode === "card" ? "color-grid" : "compact-color-list"}>
              {filteredPaints.map((paint) => (
                <article className="color-card" key={paint.id}>
                  <div className="swatch" style={{ background: paint.hex }} />
                  <strong>{paint.favorite ? "★ " : ""}{paint.name}</strong>
                  <span>{[paint.brand, paint.code].filter(Boolean).join(" · ") || "未填写品牌编号"}</span>
                  <small>{paint.hex} · {paintTypeLabels[paint.paintType ?? "other"]} · {finishLabels[paint.finish ?? "other"]} · {colorFamilyLabels[paint.colorFamily ?? "other"]}</small>
                  <p>{paint.notes || "暂无备注"}</p>
                  <div className="button-row"><button className="button ghost" onClick={() => addToMix(paint.id)}>加入配漆</button><button className="button ghost" onClick={() => edit(paint)}>编辑</button><ConfirmDelete onConfirm={() => dispatch({ type: "deletePaint", id: paint.id })} /></div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </>
  );
}
