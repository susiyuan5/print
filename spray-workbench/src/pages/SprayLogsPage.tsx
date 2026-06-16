import { useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { Field } from "../components/ui/Field";
import { ImagePreview } from "../components/ui/ImagePreview";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { PaintLayerType, SprayLog } from "../types/workbench";
import { layerLabels } from "../utils/colors";
import { nowIso, todayDate } from "../utils/dates";
import { createId } from "../utils/ids";

interface StepDraft {
  id: string;
  title: string;
  layerType: PaintLayerType;
  paintIds: string[];
  ratio: string;
  thinner: string;
  pressure: string;
  technique: string;
  notes: string;
}

const createEmptyStep = (): StepDraft => ({
  id: createId("step"),
  title: "喷涂步骤",
  layerType: "base",
  paintIds: [],
  ratio: "",
  thinner: "",
  pressure: "",
  technique: "",
  notes: "",
});

const emptyForm = {
  title: "",
  modelId: "",
  date: todayDate(),
  imageUrlsText: "",
  steps: [createEmptyStep()],
  resultNotes: "",
};

function splitImageUrls(value: string) {
  return value.split(/\n|,|，/).map((item) => item.trim()).filter(Boolean);
}

export function SprayLogsPage() {
  const { data, dispatch } = useWorkbench();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const imageUrls = splitImageUrls(form.imageUrlsText);

  function updateStep(index: number, patch: Partial<StepDraft>) {
    setForm({
      ...form,
      steps: form.steps.map((step, stepIndex) => (stepIndex === index ? { ...step, ...patch } : step)),
    });
  }

  function addStep() {
    setForm({ ...form, steps: [...form.steps, createEmptyStep()] });
  }

  function deleteStep(index: number) {
    if (form.steps.length === 1) return window.alert("至少保留一个喷涂步骤。");
    setForm({ ...form, steps: form.steps.filter((_, stepIndex) => stepIndex !== index) });
  }

  function moveStep(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= form.steps.length) return;
    const steps = [...form.steps];
    [steps[index], steps[nextIndex]] = [steps[nextIndex], steps[index]];
    setForm({ ...form, steps });
  }

  function applyTemplate(index: number, templateId: string) {
    const template = (data.parameterTemplates ?? []).find((item) => item.id === templateId);
    if (!template) return;
    updateStep(index, {
      title: template.name,
      layerType: template.layerType,
      ratio: template.ratio,
      thinner: template.thinner,
      pressure: template.pressure,
      technique: template.technique,
      notes: template.notes,
    });
  }

  function edit(log: SprayLog) {
    setEditingId(log.id);
    setForm({
      title: log.title,
      modelId: log.modelId,
      date: log.date,
      imageUrlsText: log.imageUrls.join("\n"),
      resultNotes: log.resultNotes ?? "",
      steps: log.steps.length > 0 ? log.steps.map((step) => ({
        id: step.id,
        title: step.title,
        layerType: step.layerType,
        paintIds: step.paintIds,
        ratio: step.ratio ?? "",
        thinner: step.thinner ?? "",
        pressure: step.pressure ?? "",
        technique: step.technique ?? "",
        notes: step.notes ?? "",
      })) : [createEmptyStep()],
    });
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
        imageUrls,
        steps: form.steps.map((step) => ({
          id: step.id,
          title: step.title.trim() || "喷涂步骤",
          layerType: step.layerType,
          paintIds: step.paintIds,
          ratio: step.ratio.trim() || undefined,
          thinner: step.thinner.trim() || undefined,
          pressure: step.pressure.trim() || undefined,
          technique: step.technique.trim() || undefined,
          notes: step.notes.trim() || undefined,
        })),
        resultNotes: form.resultNotes.trim() || undefined,
        createdAt: old?.createdAt ?? timestamp,
        updatedAt: timestamp,
      },
    });
    setEditingId(null);
    setForm({ ...emptyForm, steps: [createEmptyStep()], date: todayDate() });
  }

  return (
    <>
      <PageHeader title="喷涂记录" description="记录每次喷涂使用的模型、图片、步骤、颜色和参数。" />
      <section className="editor-layout wide-editor">
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
          <Field label="图片 URL"><textarea value={form.imageUrlsText} onChange={(e) => setForm({ ...form, imageUrlsText: e.target.value })} placeholder="每行一个图片 URL，也可以用逗号分隔" /></Field>
          {imageUrls.length > 0 && (
            <div className="image-grid">
              {imageUrls.map((url) => <ImagePreview key={url} url={url} alt="喷涂记录图片预览" />)}
            </div>
          )}
          <div className="section-heading">
            <h3>喷涂步骤</h3>
            <button className="button ghost" type="button" onClick={addStep}>新增步骤</button>
          </div>
          <div className="step-editor-list">
            {form.steps.map((step, index) => (
              <section className="step-editor" key={step.id}>
                <div className="card-top">
                  <strong>步骤 {index + 1}</strong>
                  <div className="button-row">
                    <button className="button ghost" type="button" onClick={() => moveStep(index, -1)}>上移</button>
                    <button className="button ghost" type="button" onClick={() => moveStep(index, 1)}>下移</button>
                    <button className="button ghost danger" type="button" onClick={() => deleteStep(index)}>删除步骤</button>
                  </div>
                </div>
                <Field label="套用参数模板">
                  <select value="" onChange={(e) => applyTemplate(index, e.target.value)}>
                    <option value="">选择模板</option>
                    {(data.parameterTemplates ?? []).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                </Field>
                <div className="form-grid">
                  <Field label="步骤标题"><input value={step.title} onChange={(e) => updateStep(index, { title: e.target.value })} /></Field>
                  <Field label="层类型">
                    <select value={step.layerType} onChange={(e) => updateStep(index, { layerType: e.target.value as PaintLayerType })}>
                      {Object.entries(layerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="使用颜色">
                  <select multiple value={step.paintIds} onChange={(e) => updateStep(index, { paintIds: Array.from(e.target.selectedOptions, (option) => option.value) })}>
                    {data.paints.map((paint) => <option key={paint.id} value={paint.id}>{paint.name}</option>)}
                  </select>
                </Field>
                <div className="form-grid">
                  <Field label="比例"><input value={step.ratio} onChange={(e) => updateStep(index, { ratio: e.target.value })} /></Field>
                  <Field label="气压"><input value={step.pressure} onChange={(e) => updateStep(index, { pressure: e.target.value })} /></Field>
                  <Field label="稀释剂"><input value={step.thinner} onChange={(e) => updateStep(index, { thinner: e.target.value })} /></Field>
                  <Field label="技巧"><input value={step.technique} onChange={(e) => updateStep(index, { technique: e.target.value })} /></Field>
                </div>
                <Field label="备注"><textarea value={step.notes} onChange={(e) => updateStep(index, { notes: e.target.value })} /></Field>
              </section>
            ))}
          </div>
          <Field label="结果备注"><textarea value={form.resultNotes} onChange={(e) => setForm({ ...form, resultNotes: e.target.value })} /></Field>
          <div className="button-row"><button className="button primary" type="submit">{editingId ? "保存记录" : "新增记录"}</button>{editingId && <button className="button ghost" type="button" onClick={() => { setEditingId(null); setForm({ ...emptyForm, steps: [createEmptyStep()], date: todayDate() }); }}>取消编辑</button>}</div>
        </form>
        <section className="panel">
          <h2>记录列表</h2>
          {data.sprayLogs.length === 0 ? <EmptyState title="还没有喷涂记录" description="完成一次喷涂后，把模型、颜色和参数记录下来。" /> : (
            <div className="item-list">
              {data.sprayLogs.map((log) => {
                const model = data.models.find((item) => item.id === log.modelId);
                return (
                  <article className="list-card" key={log.id}>
                    {log.imageUrls[0] && <ImagePreview url={log.imageUrls[0]} alt={`${log.title} 图片`} />}
                    <div className="card-top"><strong>{log.title}</strong><span className="badge">{log.date}</span></div>
                    <span>模型：{model?.name ?? "模型已删除"}</span>
                    <span>步骤：{log.steps.length} 个</span>
                    <div className="step-summary-list">
                      {log.steps.map((step, index) => (
                        <div key={step.id} className="step-summary">
                          <strong>{index + 1}. {step.title}</strong>
                          <span>{layerLabels[step.layerType]} · {step.paintIds.map((id) => data.paints.find((paint) => paint.id === id)?.name ?? "颜色已删除").join("，") || "未选择颜色"}</span>
                          <small>{[step.ratio, step.pressure, step.thinner, step.technique].filter(Boolean).join(" · ") || "未填写参数"}</small>
                        </div>
                      ))}
                    </div>
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
