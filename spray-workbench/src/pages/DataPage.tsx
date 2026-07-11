import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { checkLocalImageExists, connectImageLibrary, isFileSystemAccessSupported, restoreImageLibrary } from "../data/fileLibrary";
import { downloadJson, loadSnapshots, normalizeWorkbenchData, resetData } from "../data/storage";
import { parseWorkbenchData } from "../data/validators";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { PaintLayerType, SprayStepTemplate } from "../types/workbench";
import { layerLabels } from "../utils/colors";
import { nowIso } from "../utils/dates";
import { createId } from "../utils/ids";
import { estimateLocalStorageUsage, formatBytes } from "../utils/images";

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
  const [libraryStatus, setLibraryStatus] = useState("正在检查本地图片仓库...");
  const [libraryHandle, setLibraryHandle] = useState<FileSystemDirectoryHandle | undefined>();
  const [missingReport, setMissingReport] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [snapshots, setSnapshots] = useState<Array<{ savedAt: string; data: typeof data }>>([]);
  const storageUsage = estimateLocalStorageUsage();
  const imageStats = useMemo(() => {
    const images = data.workshopImages ?? [];
    return {
      total: images.length,
      dataUrl: images.filter((image) => (image.storageType ?? "dataUrl") === "dataUrl").length,
      localFile: images.filter((image) => image.storageType === "localFile").length,
      remoteUrl: images.filter((image) => image.storageType === "remoteUrl").length,
    };
  }, [data.workshopImages]);

  useEffect(() => {
    if (!isFileSystemAccessSupported()) {
      setLibraryStatus("当前浏览器不支持本地文件夹写入，请使用桌面版 Chrome 或 Edge，或继续使用内置图片模式。");
      return;
    }
    restoreImageLibrary().then((result) => {
      if (result.ok) {
        setLibraryHandle(result.value);
        setLibraryStatus("本地图片仓库已连接。");
      } else {
        setLibraryHandle(undefined);
        setLibraryStatus(result.error ?? "尚未连接本地图片仓库。");
      }
    });
  }, []);

  useEffect(() => { void loadSnapshots().then(setSnapshots).catch(() => setSnapshots([])); }, [data.updatedAt]);

  async function importFile(file?: File) {
    if (!file) return;
    try {
      const text = await file.text();
      if (!window.confirm("导入 JSON 会覆盖当前本地数据，确认继续吗？")) return;
      const raw = JSON.parse(text) as { data?: unknown };
      const parsed = normalizeWorkbenchData(parseWorkbenchData(raw.data ?? raw));
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

  async function reconnectLibrary() {
    const result = await connectImageLibrary();
    if (result.ok) {
      setLibraryHandle(result.value);
      setLibraryStatus("本地图片仓库已连接。");
      setMissingReport("");
      setNotice("本地图片仓库连接成功。");
    } else {
      setLibraryStatus(result.error ?? "无法连接本地图片仓库。");
    }
  }

  async function checkMissingImages() {
    const localImages = (data.workshopImages ?? []).filter((image) => image.storageType === "localFile");
    if (localImages.length === 0) {
      setMissingReport("当前没有本地图片仓库图片。");
      return;
    }
    const handle = libraryHandle ?? (await restoreImageLibrary()).value;
    if (!handle) {
      setMissingReport("图片仓库未连接，无法检查文件。请先选择或重新连接图片仓库文件夹。");
      return;
    }
    const results = await Promise.all(localImages.map((image) => checkLocalImageExists(handle, image.localRelativePath)));
    const missingCount = results.filter((exists) => !exists).length;
    setMissingReport(missingCount === 0 ? `已检查 ${localImages.length} 张本地图片，未发现丢失。` : `已检查 ${localImages.length} 张本地图片，其中 ${missingCount} 张无法读取，请确认文件没有移动或删除。`);
  }

  return (
    <>
      <PageHeader title="数据管理" description="导入、导出和重置喷涂工作台数据。" />
      <section className="panel data-panel">
        <h2>当前数据</h2>
        <p>数据来源：{source === "localStorage" ? "浏览器本地自动保存" : "示例数据"}</p>
        <p>本地保存键：<code>spray-workbench:data:v1</code></p>
        <p>最后更新时间：{data.updatedAt}</p>
        <p>当前估算容量：{formatBytes(storageUsage)}</p>
        {storageUsage > 4 * 1024 * 1024 && <p className="error-text">本地数据已超过 4MB，建议立即导出 JSON 备份，并减少图片数量。</p>}
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
        <h3>可恢复快照</h3>
        <p className="muted">自动保留最近 10 次保存；恢复前会再次确认。</p>
        <div className="item-list">{snapshots.slice(0, 10).map((snapshot) => <div className="list-card" key={snapshot.savedAt}><span>{snapshot.savedAt}</span><button className="button ghost" type="button" onClick={() => { if (window.confirm("恢复此快照会覆盖当前数据，是否继续？")) { dispatch({ type: "replace", data: snapshot.data }); setNotice("已恢复快照。"); } }}>恢复</button></div>)}</div>
      </section>
      <section className="panel data-panel">
        <h2>图片仓库</h2>
        <p>当前图片存储模式：内置存储、本地图片仓库和外部 URL 均可共存。</p>
        <p>本地图片仓库状态：{libraryStatus}</p>
        <p>图片统计：共 {imageStats.total} 张，内置图片 {imageStats.dataUrl} 张，本地图片 {imageStats.localFile} 张，外部 URL {imageStats.remoteUrl} 张。</p>
        <p>localStorage 估算容量：{formatBytes(storageUsage)}</p>
        {storageUsage > 4 * 1024 * 1024 && <p className="error-text">本地数据已超过 4MB，建议导出 JSON 备份，并把新图片保存到本地图片仓库。</p>}
        {!isFileSystemAccessSupported() && <p className="error-text">当前浏览器不支持本地文件夹写入，请使用桌面版 Chrome 或 Edge，或继续使用内置图片模式。</p>}
        <div className="button-row">
          <button className="button primary" type="button" onClick={reconnectLibrary}>选择 / 重新连接图片仓库</button>
          <button className="button ghost" type="button" onClick={checkMissingImages}>检查丢失图片</button>
        </div>
        {missingReport && <p className="muted">{missingReport}</p>}
        <div className="backup-note">
          <strong>备份说明</strong>
          <p>导出 JSON 时，dataURL 图片会包含在 JSON 中；localFile 图片只导出相对路径和元数据；remoteUrl 图片只导出 URL 和元数据。</p>
          <p>本地图片仓库里的图片文件不会包含在 JSON 文件中，请同时备份图片文件夹。</p>
          <pre>{`SprayDigitalWorkshop/
  workshop-data.json
  images/
    xxx.webp
    xxx.webp`}</pre>
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
