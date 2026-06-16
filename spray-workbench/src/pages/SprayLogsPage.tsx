import { useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { PaintLayerType, SprayLog } from "../types/workbench";
import { layerLabels } from "../utils/colors";
import { nowIso, todayDate } from "../utils/dates";
import { createId } from "../utils/ids";

const emptyForm = { title: "", modelId: "", date: todayDate(), stepTitle: "", layerType: "base" as PaintLayerType, paintIds: [] as string[], thinner: "", pressure: "", technique: "", stepNotes: "", resultNotes: "" };

export function SprayLogsPage() {
  const { data, dispatch } = useWorkbench();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function edit(log: SprayLog) {
    const step = log.steps[0];
    setEditingId(log.id);
    setForm({ title: log.title, modelId: log.modelId, date: log.date, stepTitle: step?.title ?? "", layerType: step?.layerType ?? "base", paintIds: step?.paintIds ?? [], thinner: step?.thinner ?? "", pressure: step?.pressure ?? "", technique: step?.technique ?? "", stepNotes: step?.notes ?? "", resultNotes: log.resultNotes ?? "" });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return window.alert("请填写记录标题。");
    if (!form.modelId) return window.alert("请选择关联模型。");
    const old = data.sprayLogs.find((item) => item.id === editingId);
    const timestamp = nowIso();
    dispatch({
      type: "upsertLog",
      log: {
        id: editingId ?? createId("log"),
        modelId: form.modelId,
        title: form.title.trim(),
        date: form.date,
        steps: [{
          id: old?.steps[0]?.id ?? createId("step"),
          title: form.stepTitle.trim() || "喷涂步骤",
          layerType: form.layerType,
          paintIds: form.paintIds,
          thinner: form.thinner.trim() || undefined,
          pressure: form.pressure.trim() || undefined,
          technique: form.technique.trim() || undefined,
          notes: form.stepNotes.trim() || undefined,
        }],
        resultNotes: form.resultNotes.trim() || undefined,
        imageUrls: old?.imageUrls ?? [],
        createdAt: old?.createdAt ?? timestamp,
        updatedAt: timestamp,
      },
    });
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <>
      <PageHeader title="喷涂记录" description="记录每次喷涂使用的模型、颜色、参数和效果。" />
      <section className="editor-layout">
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{editingId ? "编辑喷涂记录" : "新增喷涂记录"}</h2>
          <div className="form-grid">
            <Field label="记录标题"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="日期"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          </div>
          <Field label="关联模型">
            <select value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })}>
              <option value="">请选择模型</option>
              {data.models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="步骤标题"><input value={form.stepTitle} onChange={(e) => setForm({ ...form, stepTitle: e.target.value })} /></Field>
            <Field label="喷涂层次">
              <select value={form.layerType} onChange={(e) => setForm({ ...form, layerType: e.target.value as PaintLayerType })}>
                {Object.entries(layerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="使用颜色">
            <select multiple value={form.paintIds} onChange={(e) => setForm({ ...form, paintIds: Array.from(e.target.selectedOptions, (option) => option.value) })}>
              {data.paints.map((paint) => <option key={paint.id} value={paint.id}>{paint.name}</option>)}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="稀释比例"><input value={form.thinner} onChange={(e) => setForm({ ...form, thinner: e.target.value })} /></Field>
            <Field label="气压"><input value={form.pressure} onChange={(e) => setForm({ ...form, pressure: e.target.value })} /></Field>
            <Field label="手法"><input value={form.technique} onChange={(e) => setForm({ ...form, technique: e.target.value })} /></Field>
          </div>
          <Field label="步骤备注"><textarea value={form.stepNotes} onChange={(e) => setForm({ ...form, stepNotes: e.target.value })} /></Field>
          <Field label="结果备注"><textarea value={form.resultNotes} onChange={(e) => setForm({ ...form, resultNotes: e.target.value })} /></Field>
          <div className="button-row"><button className="button primary" type="submit">{editingId ? "保存记录" : "新增记录"}</button>{editingId && <button className="button ghost" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>取消编辑</button>}</div>
        </form>
        <section className="panel">
          <h2>记录列表</h2>
          {data.sprayLogs.length === 0 ? <EmptyState title="还没有喷涂记录" description="完成一次喷涂后，把模型、颜色和参数记录下来。" /> : (
            <div className="item-list">
              {data.sprayLogs.map((log) => {
                const model = data.models.find((item) => item.id === log.modelId);
                return (
                  <article className="list-card" key={log.id}>
                    <div className="card-top"><strong>{log.title}</strong><span className="badge">{log.date}</span></div>
                    <span>模型：{model?.name ?? "模型已删除"}</span>
                    <span>颜色：{log.steps.flatMap((step) => step.paintIds).map((id) => data.paints.find((paint) => paint.id === id)?.name ?? "颜色已删除").join("，") || "未选择颜色"}</span>
                    <p>{log.resultNotes || "暂无结果备注"}</p>
                    <div className="button-row"><button className="button ghost" onClick={() => edit(log)}>编辑</button><ConfirmDelete onConfirm={() => dispatch({ type: "deleteLog", id: log.id })} /></div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </>
  );
}
