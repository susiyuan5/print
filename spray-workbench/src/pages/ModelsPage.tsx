import { useMemo, useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { Field } from "../components/ui/Field";
import { ImageGallery } from "../components/ui/ImageGallery";
import { ImagePreview } from "../components/ui/ImagePreview";
import { ImageUploader, type UploadedImagePayload } from "../components/ui/ImageUploader";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { ModelStatus, ScaleModel } from "../types/workbench";
import { joinTags, splitTags, statusLabels } from "../utils/colors";
import { nowIso } from "../utils/dates";
import { createId } from "../utils/ids";

const emptyForm = {
  name: "",
  brand: "",
  series: "",
  scale: "",
  status: "planned" as ModelStatus,
  tags: "",
  imageUrl: "",
  notes: "",
};

export function ModelsPage() {
  const { data, dispatch } = useWorkbench();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const modelImages = data.workshopImages ?? [];
  const logsByModel = useMemo(
    () => new Map(data.models.map((model) => [model.id, data.sprayLogs.filter((log) => log.modelId === model.id).length])),
    [data.models, data.sprayLogs],
  );

  function edit(model: ScaleModel) {
    setEditingId(model.id);
    setForm({
      name: model.name,
      brand: model.brand ?? "",
      series: model.series ?? "",
      scale: model.scale ?? "",
      status: model.status,
      tags: joinTags(model.tags),
      imageUrl: model.imageUrl ?? "",
      notes: model.notes ?? "",
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return window.alert("请填写模型名称。");
    const old = data.models.find((item) => item.id === editingId);
    const timestamp = nowIso();
    dispatch({
      type: "upsertModel",
      model: {
        id: editingId ?? createId("model"),
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        series: form.series.trim() || undefined,
        scale: form.scale.trim() || undefined,
        status: form.status,
        tags: splitTags(form.tags),
        imageUrl: form.imageUrl.trim() || undefined,
        notes: form.notes.trim() || undefined,
        createdAt: old?.createdAt ?? timestamp,
        updatedAt: timestamp,
      },
    });
    setEditingId(null);
    setForm(emptyForm);
  }

  function attachModelImages(modelId: string, uploaded: UploadedImagePayload[]) {
    const timestamp = nowIso();
    uploaded.forEach((image) => {
      dispatch({
        type: "addWorkshopImage",
        image: {
          id: createId("image"),
          modelId,
          title: image.title,
          notes: "",
          capturedAt: "",
          ...image,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });
    });
  }

  return (
    <>
      <PageHeader title="模型管理" description="维护模型资料、制作状态、URL 图片和本地图片档案。" />
      <section className="editor-layout">
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{editingId ? "编辑模型" : "新增模型"}</h2>
          <Field label="模型名称"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="form-grid">
            <Field label="品牌"><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
            <Field label="系列"><input value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })} /></Field>
            <Field label="比例"><input value={form.scale} onChange={(e) => setForm({ ...form, scale: e.target.value })} /></Field>
            <Field label="状态">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ModelStatus })}>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="标签"><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="用逗号或空格分隔" /></Field>
          <Field label="图片 URL"><input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://example.com/model.jpg" /></Field>
          <ImagePreview url={form.imageUrl} alt="模型 URL 图片预览" />
          <Field label="备注"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="button-row">
            <button className="button primary" type="submit">{editingId ? "保存模型" : "新增模型"}</button>
            {editingId && <button className="button ghost" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>取消编辑</button>}
          </div>
        </form>
        <section className="panel">
          <h2>模型列表</h2>
          {data.models.length === 0 ? <EmptyState title="还没有模型" description="新增一个模型后，就可以关联喷涂记录、项目和图片。" /> : (
            <div className="item-list">
              {data.models.map((model) => {
                const relatedImages = modelImages.filter((image) => image.modelId === model.id);
                return (
                  <article className="list-card" key={model.id}>
                    {model.imageUrl && <ImagePreview url={model.imageUrl} alt={`${model.name} URL 图片`} />}
                    <div className="card-top"><strong>{model.name}</strong><span className="badge">{statusLabels[model.status]}</span></div>
                    <span>{[model.brand, model.series, model.scale].filter(Boolean).join(" · ") || "未填写品牌信息"}</span>
                    <p>{model.notes || "暂无备注"}</p>
                    <div className="tag-row">{model.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                    <small>关联喷涂记录：{logsByModel.get(model.id) ?? 0}</small>
                    <h3>模型图片</h3>
                    <ImageGallery
                      images={relatedImages}
                      emptyText="暂无模型图片。"
                      onUpdate={(image) => dispatch({ type: "updateWorkshopImage", image })}
                      onDelete={(id) => dispatch({ type: "deleteWorkshopImage", id })}
                    />
                    <ImageUploader label="插入模型图片" fileNamePrefix={`model-${model.id}`} onUpload={(uploaded) => attachModelImages(model.id, uploaded)} />
                    <div className="button-row"><button className="button ghost" onClick={() => edit(model)}>编辑</button><ConfirmDelete onConfirm={() => dispatch({ type: "deleteModel", id: model.id })} /></div>
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
