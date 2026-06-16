import { useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { Field } from "../components/ui/Field";
import { ImageUploader } from "../components/ui/ImageUploader";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { ProjectStatus, SprayProject } from "../types/workbench";
import { splitTags, statusLabels } from "../utils/colors";
import { formatDate, nowIso } from "../utils/dates";
import { createId } from "../utils/ids";
import { formatBytes } from "../utils/images";

const projectStatusLabels: Record<ProjectStatus, string> = {
  planned: "计划中",
  in_progress: "推进中",
  painting: "喷涂中",
  reviewing: "复盘中",
  finished: "已完成",
  archived: "已归档",
};

const emptyForm = {
  name: "",
  modelId: "",
  status: "planned" as ProjectStatus,
  goal: "",
  styleKeywords: "",
  colorSchemeIds: [] as string[],
  sprayLogIds: [] as string[],
  startedAt: "",
  finishedAt: "",
  notes: "",
};

function buildTimeline(project: SprayProject) {
  const events = [
    { date: project.createdAt, title: "创建项目" },
    ...project.colorSchemeIds.map((id) => ({ date: project.updatedAt, title: `关联配色方案 ${id}` })),
    ...project.sprayLogIds.map((id) => ({ date: project.updatedAt, title: `关联喷涂记录 ${id}` })),
    ...project.imageIds.map((id) => ({ date: project.updatedAt, title: `添加项目图片 ${id}` })),
  ];
  return events.slice(0, 6);
}

export function ProjectsPage() {
  const { data, dispatch } = useWorkbench();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const projects = data.projects ?? [];
  const images = data.workshopImages ?? [];

  function edit(project: SprayProject) {
    setEditingId(project.id);
    setForm({
      name: project.name,
      modelId: project.modelId ?? "",
      status: project.status,
      goal: project.goal ?? "",
      styleKeywords: project.styleKeywords.join("，"),
      colorSchemeIds: project.colorSchemeIds,
      sprayLogIds: project.sprayLogIds,
      startedAt: project.startedAt ?? "",
      finishedAt: project.finishedAt ?? "",
      notes: project.notes ?? "",
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return window.alert("请填写项目名称。");
    const old = projects.find((item) => item.id === editingId);
    const timestamp = nowIso();
    dispatch({
      type: "upsertProject",
      project: {
        id: editingId ?? createId("project"),
        name: form.name.trim(),
        modelId: form.modelId || undefined,
        status: form.status,
        goal: form.goal.trim() || undefined,
        styleKeywords: splitTags(form.styleKeywords),
        colorSchemeIds: form.colorSchemeIds,
        sprayLogIds: form.sprayLogIds,
        imageIds: old?.imageIds ?? [],
        startedAt: form.startedAt || undefined,
        finishedAt: form.finishedAt || undefined,
        notes: form.notes.trim() || undefined,
        createdAt: old?.createdAt ?? timestamp,
        updatedAt: timestamp,
      },
    });
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <>
      <PageHeader title="项目中心" description="以项目为核心，串联模型、配色、喷涂记录、图片和时间轴。" />
      <section className="editor-layout wide-editor">
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{editingId ? "编辑项目" : "新建项目"}</h2>
          <Field label="项目名称"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="form-grid">
            <Field label="关联模型">
              <select value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })}>
                <option value="">不关联模型</option>
                {data.models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
              </select>
            </Field>
            <Field label="项目状态">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                {Object.entries(projectStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="目标风格"><textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
          <Field label="风格关键词"><input value={form.styleKeywords} onChange={(e) => setForm({ ...form, styleKeywords: e.target.value })} placeholder="军武，旧化，低饱和" /></Field>
          <Field label="关联配色方案">
            <select multiple value={form.colorSchemeIds} onChange={(e) => setForm({ ...form, colorSchemeIds: Array.from(e.target.selectedOptions, (option) => option.value) })}>
              {data.colorSchemes.map((scheme) => <option key={scheme.id} value={scheme.id}>{scheme.name}</option>)}
            </select>
          </Field>
          <Field label="关联喷涂记录">
            <select multiple value={form.sprayLogIds} onChange={(e) => setForm({ ...form, sprayLogIds: Array.from(e.target.selectedOptions, (option) => option.value) })}>
              {data.sprayLogs.map((log) => <option key={log.id} value={log.id}>{log.title}</option>)}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="开始日期"><input type="date" value={form.startedAt} onChange={(e) => setForm({ ...form, startedAt: e.target.value })} /></Field>
            <Field label="完成日期"><input type="date" value={form.finishedAt} onChange={(e) => setForm({ ...form, finishedAt: e.target.value })} /></Field>
          </div>
          <Field label="备注"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="button-row">
            <button className="button primary" type="submit">{editingId ? "保存项目" : "新建项目"}</button>
            {editingId && <button className="button ghost" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>取消编辑</button>}
          </div>
        </form>

        <section className="panel">
          <h2>项目列表</h2>
          {projects.length === 0 ? <EmptyState title="还没有项目" description="创建项目后，可以把模型、配色、记录和图片都收拢到同一个工作流里。" /> : (
            <div className="item-list">
              {projects.map((project) => {
                const model = data.models.find((item) => item.id === project.modelId);
                const projectImages = images.filter((image) => image.projectId === project.id || project.imageIds.includes(image.id));
                return (
                  <article className="list-card project-card" key={project.id}>
                    <div className="card-top"><strong>{project.name}</strong><span className="badge">{projectStatusLabels[project.status]}</span></div>
                    <p>{project.goal || "暂无目标风格"}</p>
                    <span>关联模型：{model ? `${model.name}（${statusLabels[model.status]}）` : "未关联"}</span>
                    <span>配色方案：{project.colorSchemeIds.map((id) => data.colorSchemes.find((scheme) => scheme.id === id)?.name).filter(Boolean).join("，") || "未关联"}</span>
                    <span>喷涂记录：{project.sprayLogIds.map((id) => data.sprayLogs.find((log) => log.id === id)?.title).filter(Boolean).join("，") || "未关联"}</span>
                    <div className="tag-row">{project.styleKeywords.map((tag) => <span key={tag}>{tag}</span>)}</div>
                    <div className="project-images">
                      {projectImages.length === 0 ? <small>暂无项目图片</small> : projectImages.map((image) => (
                        <figure key={image.id}>
                          <img src={image.dataUrl} alt={image.title || project.name} />
                          <figcaption>{image.width} x {image.height} · {formatBytes(image.sizeBytes)}</figcaption>
                        </figure>
                      ))}
                    </div>
                    <ImageUploader onUpload={(image) => {
                      const id = createId("image");
                      dispatch({ type: "addWorkshopImage", image: { id, projectId: project.id, ...image, createdAt: nowIso() } });
                      dispatch({ type: "upsertProject", project: { ...project, imageIds: [id, ...project.imageIds], updatedAt: nowIso() } });
                    }} />
                    <div className="timeline-list">
                      {buildTimeline(project).map((event, index) => <span key={`${project.id}-${index}`}>{formatDate(event.date)} · {event.title}</span>)}
                    </div>
                    <div className="button-row"><button className="button ghost" onClick={() => edit(project)}>编辑</button><ConfirmDelete onConfirm={() => dispatch({ type: "deleteProject", id: project.id })} /></div>
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
