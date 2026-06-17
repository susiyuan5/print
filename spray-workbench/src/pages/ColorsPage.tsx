import { useMemo, useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { PaintColor, PaintColorFamily, PaintFinish, PaintOpacity, PaintTemperature, PaintType } from "../types/workbench";
import { colorFamilyLabels, finishLabels, inferColorFamily, inferTemperature, opacityLabels, paintTypeLabels, temperatureLabels } from "../utils/colors";

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

  const brands = useMemo(() => Array.from(new Set(data.paints.map((paint) => paint.brand).filter(Boolean))) as string[], [data.paints]);
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
        hex: form.hex,
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
      <PageHeader title="颜色管理" description="维护涂料颜色、品牌编号、漆种、漆面、色系和库存信息。" />
      <section className="editor-layout">
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{editingId ? "编辑颜色" : "新增颜色"}</h2>
          <div className="form-grid">
            <Field label="颜色名称"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="品牌"><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
            <Field label="编号"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="色值"><input type="color" value={form.hex} onChange={(e) => setForm({ ...form, hex: e.target.value, colorFamily: inferColorFamily(e.target.value, form.finish), temperature: inferTemperature(e.target.value) })} /></Field>
            <Field label="漆面"><select value={form.finish} onChange={(e) => setForm({ ...form, finish: e.target.value as PaintFinish })}>{Object.entries(finishLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="漆种"><select value={form.paintType} onChange={(e) => setForm({ ...form, paintType: e.target.value as PaintType })}>{Object.entries(paintTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          </div>
          <details className="prompt-details">
            <summary>高级颜色信息</summary>
            <div className="form-grid">
              <Field label="遮盖力"><select value={form.opacity} onChange={(e) => setForm({ ...form, opacity: e.target.value as PaintOpacity })}>{Object.entries(opacityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="色温"><select value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value as PaintTemperature })}>{Object.entries(temperatureLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="色系"><select value={form.colorFamily} onChange={(e) => setForm({ ...form, colorFamily: e.target.value as PaintColorFamily })}>{Object.entries(colorFamilyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="库存量"><input value={form.stockAmount} onChange={(e) => setForm({ ...form, stockAmount: e.target.value })} /></Field>
              <Field label="瓶容量"><input value={form.bottleSize} onChange={(e) => setForm({ ...form, bottleSize: e.target.value })} /></Field>
              <Field label="购买日期"><input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field>
            </div>
            <label className="check-row"><input type="checkbox" checked={form.favorite} onChange={(e) => setForm({ ...form, favorite: e.target.checked })} /> 常用颜色</label>
          </details>
          <Field label="备注"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="button-row"><button className="button primary" type="submit">{editingId ? "保存颜色" : "新增颜色"}</button>{editingId && <button className="button ghost" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>取消编辑</button>}</div>
        </form>
        <section className="panel">
          <div className="card-top"><h2>颜色列表</h2><div className="button-row"><button className={`button ghost ${viewMode === "card" ? "active" : ""}`} onClick={() => setViewMode("card")}>大卡片</button><button className={`button ghost ${viewMode === "compact" ? "active" : ""}`} onClick={() => setViewMode("compact")}>紧凑列表</button></div></div>
          <div className="filter-grid">
            <input placeholder="搜索颜色名、品牌、色号" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            <select value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })}><option value="">全部品牌</option>{brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select>
            <select value={filters.paintType} onChange={(e) => setFilters({ ...filters, paintType: e.target.value })}><option value="">全部漆种</option>{Object.entries(paintTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select value={filters.finish} onChange={(e) => setFilters({ ...filters, finish: e.target.value })}><option value="">全部漆面</option>{Object.entries(finishLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select value={filters.colorFamily} onChange={(e) => setFilters({ ...filters, colorFamily: e.target.value })}><option value="">全部色系</option>{Object.entries(colorFamilyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <label className="check-row"><input type="checkbox" checked={filters.favorite} onChange={(e) => setFilters({ ...filters, favorite: e.target.checked })} /> 只看常用</label>
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
