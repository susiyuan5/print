import { useRef, useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { downloadJson, normalizeWorkbenchData, resetData } from "../data/storage";
import { parseWorkbenchData } from "../data/validators";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { PaintLayerType, SprayStepTemplate } from "../types/workbench";
import { layerLabels } from "../utils/colors";
import { nowIso } from "../utils/dates";
import { createId } from "../utils/ids";

const emptyTemplate = {
  name: "",
  layerType: "base" as PaintLayerType,
  ratio: "",
  thinner: "",
  pressure: "",
  technique: "",
  notes: "",
};

export function DataPage() {
  const { data, dispatch, source, setNotice } = useWorkbench();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);

  async function importFile(file?: File) {
    if (!file) return;
    try {
      const text = await file.text();
      if (!window.confirm("导入 JSON 会覆盖当前本地数据，确认继续吗？")) return;
      const parsed = normalizeWorkbenchData(parseWorkbenchData(JSON.parse(text)));
      dispatch({ type: "replace", data: parsed });
      setError("");
      setNotice("JSON 导入成功，数据已自动保存到浏览器本地。");
    } catch (err) {
      setError(err instanceof Error ? `导入失败：${err.message}` : "导入失败：无法读取 JSON。");
    }
  }

  function editTemplate(template: SprayStepTemplate) {
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      layerType: template.layerType,
      ratio: template.ratio,
      thinner: template.thinner,
      pressure: template.pressure,
      technique: template.technique,
      notes: template.notes,
    });
  }

  function submitTemplate(event: React.FormEvent) {
    event.preventDefault();
    if (!templateForm.name.trim()) return window.alert("请填写模板名称。");
    const old = (data.parameterTemplates ?? []).find((item) => item.id === editingTemplateId);
    const timestamp = nowIso();
    dispatch({
      type: "upsertTemplate",
      template: {
        id: editingTemplateId ?? createId("template"),
        ...templateForm,
        name: templateForm.name.trim(),
        createdAt: old?.createdAt ?? timestamp,
        updatedAt: timestamp,
      },
    });
    setEditingTemplateId(null);
    setTemplateForm(emptyTemplate);
  }

  return (
    <>
      <PageHeader title="数据管理" description="导入、导出和重置喷涂工作台数据。" />
      <section className="panel data-panel">
        <h2>当前数据</h2>
        <p>数据来源：{source === "localStorage" ? "浏览器本地自动保存" : "示例数据"}</p>
        <p>本地保存键：<code>spray-workbench:data:v1</code></p>
        <p>最后更新时间：{data.updatedAt}</p>
        {error && <p className="error-text">{error}</p>}
        <div className="button-row">
          <button className="button primary" type="button" onClick={() => downloadJson(data)}>导出 JSON</button>
          <button className="button ghost" type="button" onClick={() => inputRef.current?.click()}>导入 JSON</button>
          <button
            className="button ghost danger"
            type="button"
            onClick={() => {
              if (window.confirm("确认重置为示例数据吗？当前本地数据会被覆盖。")) {
                dispatch({ type: "replace", data: resetData() });
                setNotice("已重置为示例数据。");
              }
            }}
          >
            重置示例数据
          </button>
          <input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => importFile(event.target.files?.[0])} />
        </div>
      </section>
      <section className="panel">
        <h2>喷涂参数模板库</h2>
        <form className="template-form" onSubmit={submitTemplate}>
          <div className="form-grid">
            <Field label="模板名称"><input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} /></Field>
            <Field label="层类型">
              <select value={templateForm.layerType} onChange={(e) => setTemplateForm({ ...templateForm, layerType: e.target.value as PaintLayerType })}>
                {Object.entries(layerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="比例"><input value={templateForm.ratio} onChange={(e) => setTemplateForm({ ...templateForm, ratio: e.target.value })} /></Field>
            <Field label="气压"><input value={templateForm.pressure} onChange={(e) => setTemplateForm({ ...templateForm, pressure: e.target.value })} /></Field>
            <Field label="稀释剂"><input value={templateForm.thinner} onChange={(e) => setTemplateForm({ ...templateForm, thinner: e.target.value })} /></Field>
            <Field label="技巧"><input value={templateForm.technique} onChange={(e) => setTemplateForm({ ...templateForm, technique: e.target.value })} /></Field>
          </div>
          <Field label="备注"><textarea value={templateForm.notes} onChange={(e) => setTemplateForm({ ...templateForm, notes: e.target.value })} /></Field>
          <div className="button-row"><button className="button primary" type="submit">{editingTemplateId ? "保存模板" : "新增模板"}</button>{editingTemplateId && <button className="button ghost" type="button" onClick={() => { setEditingTemplateId(null); setTemplateForm(emptyTemplate); }}>取消编辑</button>}</div>
        </form>
        <div className="item-list">
          {(data.parameterTemplates ?? []).map((template) => (
            <article className="list-card" key={template.id}>
              <strong>{template.name}</strong>
              <span>{layerLabels[template.layerType]} · {template.ratio || "未填比例"} · {template.pressure || "未填气压"}</span>
              <p>{template.notes || template.technique || "暂无说明"}</p>
              <div className="button-row"><button className="button ghost" type="button" onClick={() => editTemplate(template)}>编辑</button><ConfirmDelete onConfirm={() => dispatch({ type: "deleteTemplate", id: template.id })} /></div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>数据预览</h2>
        <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>
      </section>
    </>
  );
}
