import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { Field } from "../components/ui/Field";
import { ImageGallery, WorkshopImageView } from "../components/ui/ImageGallery";
import { ImageUploader, type UploadedImagePayload } from "../components/ui/ImageUploader";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { ProjectStatus, SprayProject } from "../types/workbench";
import { splitTags, statusLabels } from "../utils/colors";
import { formatDate, nowIso } from "../utils/dates";
import { createId } from "../utils/ids";
import { unitModeLabel } from "../utils/paintMixing";

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

function buildTimeline(project: SprayProject, imageCount: number, recipeCount: number) {
  const events = [
    { date: project.createdAt, title: "创建项目" },
    ...project.colorSchemeIds.map(() => ({ date: project.updatedAt, title: "关联配色方案" })),
    ...project.sprayLogIds.map(() => ({ date: project.updatedAt, title: "关联喷涂记录" })),
    ...Array.from({ length: imageCount }).map(() => ({ date: project.updatedAt, title: "插入项目图片" })),
    ...Array.from({ length: recipeCount }).map(() => ({ date: project.updatedAt, title: "关联配漆配方" })),
  ];
  return events.slice(0, 8);
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

  function attachProjectImages(project: SprayProject, uploaded: UploadedImagePayload[]) {
    const timestamp = nowIso();
    const ids = uploaded.map(() => createId("image"));
    uploaded.forEach((image, index) => {
      dispatch({
        type: "addWorkshopImage",
        image: {
          id: ids[index],
          projectId: project.id,
          title: image.title,
          notes: "",
          capturedAt: "",
          ...image,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });
    });
    dispatch({ type: "upsertProject", project: { ...project, imageIds: [...ids, ...project.imageIds], updatedAt: timestamp } });
  }

  return (
    <>
      <PageHeader title="项目中心" description="以项目为核心，串联模型、配色、喷涂记录、配漆配方、图片和时间线。" />
      <section className="editor-layout wide-editor">
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{editingId ? "编辑项目" : "新建项目"}</h2>
          <Field label="项目名称"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <div className="form-grid">
            <Field label="关联模型">
              <select value={form.modelId} onChange={(event) => setForm({ ...form, modelId: event.target.value })}>
                <option value="">不关联模型</option>
                {data.models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
              </select>
            </Field>
            <Field label="项目状态">
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })}>
                {Object.entries(projectStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="目标风格"><textarea value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} /></Field>
          <Field label="风格关键词"><input value={form.styleKeywords} onChange={(event) => setForm({ ...form, styleKeywords: event.target.value })} placeholder="军武，旧化，低饱和" /></Field>
          <Field label="关联配色方案">
            <select multiple value={form.colorSchemeIds} onChange={(event) => setForm({ ...form, colorSchemeIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>
              {data.colorSchemes.map((scheme) => <option key={scheme.id} value={scheme.id}>{scheme.name}</option>)}
            </select>
          </Field>
          <Field label="关联喷涂记录">
            <select multiple value={form.sprayLogIds} onChange={(event) => setForm({ ...form, sprayLogIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>
              {data.sprayLogs.map((log) => <option key={log.id} value={log.id}>{log.title}</option>)}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="开始日期"><input type="date" value={form.startedAt} onChange={(event) => setForm({ ...form, startedAt: event.target.value })} /></Field>
            <Field label="完成日期"><input type="date" value={form.finishedAt} onChange={(event) => setForm({ ...form, finishedAt: event.target.value })} /></Field>
          </div>
          <Field label="备注"><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
          <div className="button-row">
            <button className="button primary" type="submit">{editingId ? "保存项目" : "新建项目"}</button>
            {editingId && <button className="button ghost" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>取消编辑</button>}
          </div>
        </form>

        <section className="panel">
          <h2>项目列表</h2>
          {projects.length === 0 ? <EmptyState title="还没有项目" description="创建项目后，可以把模型、配色、记录、配方和图片收拢到同一个工作流里。" /> : (
            <div className="item-list">
              {projects.map((project) => {
                const model = data.models.find((item) => item.id === project.modelId);
                const projectImages = images.filter((image) => image.projectId === project.id || project.imageIds.includes(image.id));
                const aiConcepts = (data.aiRepaintConcepts ?? []).filter((concept) => concept.projectId === project.id);
                const projectRecipes = (data.paintRecipes ?? []).filter((recipe) => recipe.projectId === project.id);
                const projectReviews = (data.sprayReviews ?? []).filter((review) => review.projectId === project.id);
                return (
                  <article className="list-card project-card" key={project.id}>
                    <div className="card-top"><strong>{project.name}</strong><span className="badge">{projectStatusLabels[project.status]}</span></div>
                    <p>{project.goal || "暂无目标风格"}</p>
                    <span>关联模型：{model ? `${model.name}（${statusLabels[model.status]}）` : "未关联"}</span>
                    <span>配色方案：{project.colorSchemeIds.map((id) => data.colorSchemes.find((scheme) => scheme.id === id)?.name).filter(Boolean).join("，") || "未关联"}</span>
                    <span>喷涂记录：{project.sprayLogIds.map((id) => data.sprayLogs.find((log) => log.id === id)?.title).filter(Boolean).join("，") || "未关联"}</span>
                    <div className="tag-row">{project.styleKeywords.map((tag) => <span key={tag}>{tag}</span>)}</div>
                    <h3>喷涂复盘</h3>
                    <p>{projectReviews.length ? `已完成 ${projectReviews.length} 次复盘；最新建议：${projectReviews[0].recommendation.summary}` : "尚未复盘，完成试喷后记录目标色、实际效果与改进建议。"}</p>
                    <div className="button-row"><Link className="button ghost" to="/reviews">进入复盘 / 打印工单</Link></div>
                    <h3>项目图片</h3>
                    <ImageGallery
                      images={projectImages}
                      emptyText="暂无项目图片。"
                      onUpdate={(image) => dispatch({ type: "updateWorkshopImage", image })}
                      onDelete={(id) => dispatch({ type: "deleteWorkshopImage", id })}
                    />
                    <ImageUploader label="插入项目图片" fileNamePrefix={`project-${project.id}`} onUpload={(uploaded) => attachProjectImages(project, uploaded)} />

                    <h3>配漆配方</h3>
                    {projectRecipes.length === 0 ? <p className="muted">暂无关联配漆配方。</p> : (
                      <div className="recipe-project-summary-list">
                        {projectRecipes.slice(0, 4).map((recipe) => {
                          const testImage = images.find((image) => recipe.testImageIds.includes(image.id));
                          return (
                            <article className="recipe-project-summary" key={recipe.id}>
                              <div className="card-top">
                                <strong>{recipe.isFavorite ? "★ " : ""}{recipe.name}</strong>
                                <span className="badge">{unitModeLabel(recipe.unitMode)}</span>
                              </div>
                              <div className="mini-swatches">
                                <span title="预估色" style={{ background: recipe.estimatedColorHex ?? "#808080" }} />
                                <span title="目标色" style={{ background: recipe.targetColorHex ?? "#808080" }} />
                              </div>
                              <span>{recipe.isFavorite ? "常用配方" : "普通配方"} · 更新时间：{formatDate(recipe.updatedAt)}</span>
                              {testImage && <div className="ai-project-images"><WorkshopImageView image={testImage} alt={`${recipe.name} 试色图片`} /></div>}
                            </article>
                          );
                        })}
                      </div>
                    )}

                    <h3>AI 重涂参考</h3>
                    {aiConcepts.length === 0 ? <p className="muted">暂无关联的 AI 重涂参考。</p> : (
                      <div className="ai-project-summary-list">
                        {aiConcepts.slice(0, 4).map((concept) => {
                          const sourceImage = images.find((image) => image.id === concept.sourceImageId);
                          const resultImage = images.find((image) => concept.resultImageIds.includes(image.id));
                          return (
                            <article className="ai-project-summary" key={concept.id}>
                              <div className="card-top">
                                <strong>{concept.name}</strong>
                                <span className="badge">{concept.comfyImageMode ?? "img2img"}</span>
                              </div>
                              <span>{concept.stylePreset || "未填写风格"} · {formatDate(concept.createdAt)}</span>
                              <div className="ai-project-images">
                                {sourceImage ? <WorkshopImageView image={sourceImage} alt={`${concept.name} 原图`} /> : <div className="image-fallback">未选择原图</div>}
                                {resultImage ? <WorkshopImageView image={resultImage} alt={`${concept.name} 结果图`} /> : <div className="image-fallback">暂无结果图</div>}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                    <h3>时间线摘要</h3>
                    <div className="timeline-list">
                      {buildTimeline(project, projectImages.length, projectRecipes.length).map((event, index) => <span key={`${project.id}-${index}`}>{formatDate(event.date)} · {event.title}</span>)}
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
