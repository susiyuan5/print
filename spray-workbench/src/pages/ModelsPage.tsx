import { useEffect, useMemo, useState } from 'react';
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { Field } from "../components/ui/Field";
import { ImageGallery } from "../components/ui/ImageGallery";
import { ImagePreview } from "../components/ui/ImagePreview";
import { ImageUploader, type UploadedImagePayload } from "../components/ui/ImageUploader";
import { PageHeader } from "../components/ui/PageHeader";
import { ModelViewer } from '../components/model/ModelViewer';
import { useWorkbench } from "../state/WorkbenchProvider";
import type { ModelStatus, ScaleModel } from "../types/workbench";
import { joinTags, splitTags, statusLabels } from "../utils/colors";
import { nowIso } from "../utils/dates";
import { createId } from "../utils/ids";


interface LocalModel { folderName:string;name:string;brand:string;series:string;scale:string;status:string;tags:string[];note:string;coverUrl:string|null;modelUrl:string|null;modelExt:string|null }
const GS: Record<string,string> = { planned:'计划中',in_progress:'制作中',painting:'喷涂中',painted:'已喷涂',finished:'已完成',archived:'已归档',unknown:'未知' }

function LocalModelGallery({ models }: { models: LocalModel[] }) {
  const [sq,setSq]=useState(''); const [sf,setSf]=useState('all'); const [tf,setTf]=useState(''); const [pv,setPv]=useState<LocalModel|null>(null)
  const at=useMemo(()=>{const s=new Set<string>();models.forEach(m=>m.tags.forEach(t=>s.add(t)));return Array.from(s).sort()},[models])
  const fl=useMemo(()=>models.filter(m=>{return (!sq||m.name.toLowerCase().includes(sq.toLowerCase())||m.folderName.toLowerCase().includes(sq.toLowerCase()))&&(sf==='all'||m.status===sf)&&(!tf||m.tags.includes(tf))}),[models,sq,sf,tf])
  const as=useMemo(()=>Array.from(new Set(models.map(m=>m.status))),[models])
  return (<>
    <div className="gallery-filters">
      <input className="gallery-search" type="text" placeholder="搜索模型名称..." value={sq} onChange={e=>setSq(e.target.value)}/>
      <select value={sf} onChange={e=>setSf(e.target.value)}><option value="all">所有状态</option>{as.map(s=><option key={s} value={s}>{GS[s]??s}</option>)}</select>
      <select value={tf} onChange={e=>setTf(e.target.value)}><option value="">所有标签</option>{at.map(t=><option key={t} value={t}>{t}</option>)}</select>
      <span className="gallery-count">{fl.length}/{models.length} 个模型</span>
    </div>
    {fl.length===0?<EmptyState title="没有匹配的模型" description="请调整搜索或筛选条件。"/>:<div className="model-gallery">{fl.map(model=><article className="model-card" key={model.folderName}>
      <div className="model-card-cover">{model.coverUrl?<img src={model.coverUrl} alt={model.name} loading="lazy" onError={e=>{(e.target as HTMLImageElement).style.display="none"}}/>:null}{model.modelUrl&&<button className="model-card-3d-btn" type="button" onClick={()=>setPv(model)} title="预览 3D">3D</button>}</div>
      <div className="model-card-body"><strong className="model-card-name">{model.name}</strong><span className="model-card-meta">{[model.brand,model.series,model.scale].filter(Boolean).join(" · ")||"未填写信息"}</span><span className="model-card-status">{GS[model.status]??model.status}</span>{model.tags.length>0&&<div className="model-card-tags">{model.tags.slice(0,4).map(tag=><span key={tag}>{tag}</span>)}</div>}{model.note&&<p className="model-card-note">{model.note}</p>}</div>
    </article>)}</div>}
    {pv&&pv.modelUrl&&<div className="modal-overlay" onClick={()=>setPv(null)}><div className="modal-content modal-3d" onClick={e=>e.stopPropagation()}><div className="modal-header"><strong>{pv.name}</strong><span className="badge">{pv.modelExt?.toUpperCase()}</span><button className="button ghost" type="button" onClick={()=>setPv(null)}>关闭</button></div><div className="modal-3d-viewer"><ModelViewer modelUrl={pv.modelUrl} fileName={pv.name+"."+pv.modelExt} fileExtension={pv.modelExt??undefined}/></div></div></div>}
  </>)
}

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
  const [mode, setMode] = useState<"checking"|"local"|"browser">("checking")
  const [localModels, setLocalModels] = useState<LocalModel[]>([])
  useEffect(() => { const c = new AbortController(); fetch("/api/local-models",{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject(r)).then(j=>{if(j.ok&&Array.isArray(j.models)){setLocalModels(j.models);setMode("local")}else setMode("browser")}).catch(()=>setMode("browser")); return ()=>c.abort() }, [])

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

  if (mode === "checking") return (<> <PageHeader title="模型管理" description="正在检测本地模型仓库..." /><div className="lazy-loading"><div className="spinner"/><span>正在检测模式...</span></div> </>)
  if (mode === "local") return (<> <PageHeader title="模型管理" description={"本地仓库模式 · "+localModels.length+" 个模型"} /><section className="panel mode-badge-panel"><span className="badge badge-local">本地仓库模式</span><span className="muted">读取自本地硬盘模型文件夹</span></section><LocalModelGallery models={localModels}/> </>)

  return (
    <>
      <PageHeader title="模型管理" description="浏览器本地数据模式" />
      <section className="panel mode-badge-panel"><span className="badge badge-temp">浏览器本地数据模式</span><span className="muted">启动本地服务器可切换到本地仓库模式</span></section>
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
