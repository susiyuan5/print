import { useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { PaintColor, PaintFinish } from "../types/workbench";
import { finishLabels } from "../utils/colors";

const emptyForm = { name: "", brand: "", code: "", hex: "#808080", finish: "matte" as PaintFinish, notes: "" };

export function ColorsPage() {
  const { data, dispatch } = useWorkbench();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function edit(paint: PaintColor) {
    setEditingId(paint.id);
    setForm({ name: paint.name, brand: paint.brand ?? "", code: paint.code ?? "", hex: paint.hex, finish: paint.finish ?? "matte", notes: paint.notes ?? "" });
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
        notes: form.notes.trim() || undefined,
      },
    });
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <>
      <PageHeader title="颜色管理" description="维护涂料颜色、品牌编号、色值和漆面质感。" />
      <section className="editor-layout">
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{editingId ? "编辑颜色" : "新增颜色"}</h2>
          <div className="form-grid">
            <Field label="颜色名称"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="品牌"><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
            <Field label="编号"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="色值"><input type="color" value={form.hex} onChange={(e) => setForm({ ...form, hex: e.target.value })} /></Field>
            <Field label="漆面">
              <select value={form.finish} onChange={(e) => setForm({ ...form, finish: e.target.value as PaintFinish })}>
                {Object.entries(finishLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="备注"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="button-row">
            <button className="button primary" type="submit">{editingId ? "保存颜色" : "新增颜色"}</button>
            {editingId && <button className="button ghost" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>取消编辑</button>}
          </div>
        </form>
        <section className="panel">
          <h2>颜色列表</h2>
          {data.paints.length === 0 ? <EmptyState title="还没有颜色" description="新增颜色后，可用于配色方案、喷涂记录和预览画布。" /> : (
            <div className="color-grid">
              {data.paints.map((paint) => (
                <article className="color-card" key={paint.id}>
                  <div className="swatch" style={{ background: paint.hex }} />
                  <strong>{paint.name}</strong>
                  <span>{[paint.brand, paint.code].filter(Boolean).join(" · ") || "未填写品牌编号"}</span>
                  <small>{paint.hex} · {finishLabels[paint.finish ?? "other"]}</small>
                  <p>{paint.notes || "暂无备注"}</p>
                  <div className="button-row"><button className="button ghost" onClick={() => edit(paint)}>编辑</button><ConfirmDelete onConfirm={() => dispatch({ type: "deletePaint", id: paint.id })} /></div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </>
  );
}
