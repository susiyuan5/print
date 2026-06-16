import { useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { ColorRole, ColorScheme, PaintLayerType } from "../types/workbench";
import { joinTags, layerLabels, roleLabels, splitTags } from "../utils/colors";
import { nowIso } from "../utils/dates";
import { createId } from "../utils/ids";

const roleOrder: ColorRole[] = ["main", "secondary", "accent", "detail"];
const emptyForm = { name: "", description: "", modelIds: [] as string[], paintIds: [] as string[], layerType: "base" as PaintLayerType, ratio: "", colorNotes: "", tags: "" };

export function ColorSchemesPage() {
  const { data, dispatch } = useWorkbench();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function edit(scheme: ColorScheme) {
    const first = scheme.colors[0];
    setEditingId(scheme.id);
    setForm({
      name: scheme.name,
      description: scheme.description ?? "",
      modelIds: scheme.modelIds,
      paintIds: scheme.colors.map((color) => color.paintId),
      layerType: first?.layerType ?? "base",
      ratio: first?.ratio ?? "",
      colorNotes: first?.notes ?? "",
      tags: joinTags(scheme.tags),
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return window.alert("请填写配色方案名称。");
    if (form.paintIds.length === 0) return window.alert("请至少选择一个颜色。");
    const old = data.colorSchemes.find((item) => item.id === editingId);
    const timestamp = nowIso();
    dispatch({
      type: "upsertScheme",
      scheme: {
        id: editingId ?? createId("scheme"),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        modelIds: form.modelIds,
        colors: form.paintIds.map((paintId, index) => ({
          paintId,
          role: roleOrder[index] ?? "other",
          layerType: form.layerType,
          ratio: form.ratio.trim() || undefined,
          notes: form.colorNotes.trim() || undefined,
        })),
        tags: splitTags(form.tags),
        createdAt: old?.createdAt ?? timestamp,
        updatedAt: timestamp,
      },
    });
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <>
      <PageHeader title="配色方案" description="把常用颜色组合沉淀为可复用方案。" />
      <section className="editor-layout">
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{editingId ? "编辑配色方案" : "新增配色方案"}</h2>
          <Field label="方案名称"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="方案描述"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="关联模型">
            <select multiple value={form.modelIds} onChange={(e) => setForm({ ...form, modelIds: Array.from(e.target.selectedOptions, (option) => option.value) })}>
              {data.models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="引用颜色">
              <select multiple value={form.paintIds} onChange={(e) => setForm({ ...form, paintIds: Array.from(e.target.selectedOptions, (option) => option.value) })}>
                {data.paints.map((paint) => <option key={paint.id} value={paint.id}>{paint.name}</option>)}
              </select>
            </Field>
            <Field label="喷涂层次">
              <select value={form.layerType} onChange={(e) => setForm({ ...form, layerType: e.target.value as PaintLayerType })}>
                {Object.entries(layerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="调配比例"><input value={form.ratio} onChange={(e) => setForm({ ...form, ratio: e.target.value })} /></Field>
          </div>
          <Field label="颜色备注"><input value={form.colorNotes} onChange={(e) => setForm({ ...form, colorNotes: e.target.value })} /></Field>
          <Field label="标签"><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
          <div className="button-row"><button className="button primary" type="submit">{editingId ? "保存方案" : "新增方案"}</button>{editingId && <button className="button ghost" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>取消编辑</button>}</div>
        </form>
        <section className="panel">
          <h2>方案列表</h2>
          {data.colorSchemes.length === 0 ? <EmptyState title="还没有配色方案" description="新增方案后，可在颜色预览中快速参考组合。" /> : (
            <div className="item-list">
              {data.colorSchemes.map((scheme) => (
                <article className="list-card" key={scheme.id}>
                  <strong>{scheme.name}</strong>
                  <p>{scheme.description || "暂无描述"}</p>
                  <div className="mini-swatches">
                    {scheme.colors.map((color) => {
                      const paint = data.paints.find((item) => item.id === color.paintId);
                      return <span key={`${scheme.id}-${color.paintId}`} style={{ background: paint?.hex ?? "#ccc" }} title={paint?.name ?? "颜色已删除"} />;
                    })}
                  </div>
                  <span>关联模型：{scheme.modelIds.map((id) => data.models.find((model) => model.id === id)?.name).filter(Boolean).join("，") || "未关联"}</span>
                  <span>颜色：{scheme.colors.map((color) => data.paints.find((paint) => paint.id === color.paintId)?.name ?? "颜色已删除").join("，")}</span>
                  <div className="tag-row">{scheme.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                  <div className="button-row"><button className="button ghost" onClick={() => edit(scheme)}>编辑</button><ConfirmDelete onConfirm={() => dispatch({ type: "deleteScheme", id: scheme.id })} /></div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </>
  );
}
