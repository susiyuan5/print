import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { ModelViewer } from "../components/model/ModelViewer";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { ModelAsset, ModelFileExtension, WorkshopImage } from "../types/workbench";
import { formatDate, nowIso } from "../utils/dates";
import { createId } from "../utils/ids";
import { compressImage, getWorkshopImageSource } from "../utils/images";
import {
  clearModelLibrary,
  connectModelLibrary,
  createModelObjectUrl,
  formatModelFileSize,
  isLargeFile,
  isModelLibrarySupported,
  restoreModelLibrary,
  scanModelFiles,
  type ScannedModelFile,
} from "../utils/localModelLibrary";

type ModelGridItem =
  | { kind: "asset"; key: string; asset: ModelAsset }
  | { kind: "scan"; key: string; file: ScannedModelFile };

function inferExtension(fileName: string): ModelFileExtension {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "glb" || ext === "gltf" || ext === "stl" || ext === "obj") return ext;
  return "other";
}

function imageSource(image?: WorkshopImage) {
  return image ? getWorkshopImageSource(image) : "";
}

const COMMON_TAGS = [
  "动漫",
  "游戏",
  "人物",
  "机甲",
  "车模",
  "手办",
  "GK",
  "STL",
  "3D打印",
  "待打印",
  "已打印",
  "待喷涂",
  "喷涂中",
  "已完成",
  "参考图",
  "涂装参考",
  "大件",
  "小件",
  "高细节",
  "分件多",
  "需要支撑",
];

const MAX_RECOMMENDED_TAGS = 12;

function splitTagText(value: string) {
  return value.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean);
}

function normalizeTags(tags: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  tags.forEach((tag) => {
    const normalized = tag.trim();
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });
  return result;
}

function inferRecommendedTags(asset: ModelAsset) {
  const tags: string[] = [];
  const text = [asset.name, asset.fileName, asset.localRelativePath, asset.localInfoText, asset.notes].filter(Boolean).join(" ").toLocaleLowerCase();
  const ext = asset.fileExtension.toLocaleLowerCase();

  if (ext === "stl") tags.push("STL", "3D打印", "切片", "灰模");
  if (ext === "glb" || ext === "gltf") tags.push("3D预览", "数字模型");
  if ((asset.imageFileCount ?? 0) >= 2) tags.push("参考图", "涂装参考");
  if ((asset.modelFileCount ?? 0) >= 20) tags.push("分件多");
  if ((asset.fileSizeBytes ?? 0) >= 500 * 1024 * 1024) tags.push("大件", "高细节");

  if (/kozeki|yuuka|blue archive|蔚蓝档案/.test(text)) tags.push("蔚蓝档案", "动漫", "人物", "女角色");
  if (/nier|尼尔/.test(text)) tags.push("尼尔", "动漫", "人物");
  if (/gundam|rx|zaku|高达/.test(text)) tags.push("高达", "机甲", "拼装模型");
  if (/porsche|car|auto|911/.test(text)) tags.push("车模", "汽车", "喷漆");
  if (/figure|garage kit|\bgk\b|手办/.test(text)) tags.push("手办", "GK", "人物");

  return normalizeTags([...tags, ...COMMON_TAGS]).slice(0, MAX_RECOMMENDED_TAGS);
}

export function ModelAssetsPage() {
  const { data, dispatch } = useWorkbench();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [heroPreviewImage, setHeroPreviewImage] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerNotes, setRegisterNotes] = useState("");
  const [librarySupported, setLibrarySupported] = useState(true);
  const [libraryStatus, setLibraryStatus] = useState("正在检查本地模型仓库...");
  const [libraryHandle, setLibraryHandle] = useState<FileSystemDirectoryHandle | undefined>();
  const [scannedFiles, setScannedFiles] = useState<ScannedModelFile[]>([]);
  const [scanError, setScanError] = useState("");
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const assets = data.modelAssets ?? [];
  const images = data.workshopImages ?? [];
  const imagesById = useMemo(() => new Map(images.map((image) => [image.id, image])), [images]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    assets.forEach((asset) => asset.tags?.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [assets]);

  const gridItems = useMemo<ModelGridItem[]>(() => {
    const assetByPath = new Map(assets.map((asset) => [asset.localRelativePath, asset]));
    const scannedItems: ModelGridItem[] = scannedFiles.map((file) => {
      const existing = assetByPath.get(file.relativePath);
      return existing ? { kind: "asset", key: existing.id, asset: existing } : { kind: "scan", key: `scan:${file.relativePath}`, file };
    });
    const scannedPaths = new Set(scannedFiles.map((file) => file.relativePath));
    const extraAssets = assets
      .filter((asset) => !asset.localRelativePath || !scannedPaths.has(asset.localRelativePath))
      .map<ModelGridItem>((asset) => ({ kind: "asset", key: asset.id, asset }));

    return [...scannedItems, ...extraAssets].filter((item) => {
      const query = searchText.trim().toLowerCase();
      const text = item.kind === "asset"
        ? [item.asset.name, item.asset.fileName, item.asset.localRelativePath, item.asset.notes, ...(item.asset.tags ?? [])].join(" ").toLowerCase()
        : [item.file.fileName, item.file.relativePath].join(" ").toLowerCase();
      if (query && !text.includes(query)) return false;
      if (selectedTags.length > 0) {
        if (item.kind !== "asset") return false;
        const tags = item.asset.tags ?? [];
        if (!selectedTags.every((tag) => tags.includes(tag))) return false;
      }
      return true;
    });
  }, [assets, scannedFiles, searchText, selectedTags]);

  useEffect(() => {
    if (!isModelLibrarySupported()) {
      setLibrarySupported(false);
      setLibraryStatus("当前浏览器不支持本地模型仓库，请使用 Chrome / Edge。");
      return;
    }
    restoreModelLibrary().then((result) => {
      if (result.ok) {
        setLibraryHandle(result.value);
        setLibraryStatus("本地模型仓库已连接。");
      } else {
        setLibraryHandle(undefined);
        setLibraryStatus(result.error ?? "尚未连接本地模型仓库。");
      }
    });
  }, []);

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  function toggleSelectedTag(tag: string) {
    setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  function showModelObjectUrl(url: string, file?: File) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(url);
    setHeroPreviewImage("");
    setSelectedFile(file ?? null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    showModelObjectUrl(URL.createObjectURL(file), file);
    setRegisterName(file.name.replace(/\.[^.]+$/, ""));
    setRegisterNotes("");
  }

  function handleRegisterTemp() {
    if (!selectedFile) return;
    const timestamp = nowIso();
    dispatch({
      type: "upsertModelAsset",
      asset: {
        id: createId("ma"),
        name: registerName.trim() || selectedFile.name,
        sourceType: "temporary",
        fileName: selectedFile.name,
        fileExtension: inferExtension(selectedFile.name),
        fileSizeBytes: selectedFile.size,
        notes: registerNotes.trim() || undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });
  }

  function clearSelection() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setHeroPreviewImage("");
    setSelectedFile(null);
    setRegisterName("");
    setRegisterNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleConnectLibrary() {
    const result = await connectModelLibrary();
    if (result.ok) {
      setLibraryHandle(result.value);
      setLibraryStatus("本地模型仓库已连接。请选择停留在 F:\\3D打印手办文件 这一层。");
      setScannedFiles([]);
      setScanError("");
    } else {
      setLibraryStatus(result.error ?? "无法连接本地模型仓库。");
    }
  }

  async function handleScanLibrary() {
    let handle = libraryHandle;
    if (!handle) {
      const restored = await restoreModelLibrary();
      if (!restored.ok || !restored.value) {
        setLibraryStatus(restored.error ?? "请先连接本地模型仓库。");
        return;
      }
      handle = restored.value;
      setLibraryHandle(handle);
    }
    setScanError("");
    const result = await scanModelFiles(handle);
    if (result.ok && result.value) {
      setScannedFiles(result.value);
      setLibraryStatus(`扫描完成：找到 ${result.value.length} 个模型包。`);
    } else {
      setScanError(result.error ?? "扫描失败。");
    }
  }

  function handleClearLibrary() {
    clearModelLibrary().then(() => {
      setLibraryHandle(undefined);
      setLibraryStatus("本地模型仓库已断开。");
      setScannedFiles([]);
    });
  }

  function handleRegisterFromScan(file: ScannedModelFile) {
    const timestamp = nowIso();
    dispatch({
      type: "upsertModelAsset",
      asset: {
        id: createId("ma"),
        name: file.fileName,
        sourceType: "localFile",
        fileName: file.fileName,
        fileExtension: inferExtension(file.previewRelativePath ?? file.fileName),
        fileSizeBytes: file.sizeBytes,
        localRelativePath: file.relativePath,
        localPreviewRelativePath: file.previewRelativePath,
        modelFileCount: file.modelFileCount,
        localInfoText: file.infoText,
        imageFileCount: file.imageFileCount,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });
  }

  function startEditingName(asset: ModelAsset) {
    setEditingAssetId(asset.id);
    setEditingName(asset.name);
  }

  function saveEditingName(asset: ModelAsset) {
    const name = editingName.trim();
    if (!name) return;
    dispatch({ type: "upsertModelAsset", asset: { ...asset, name, updatedAt: nowIso() } });
    setEditingAssetId(null);
    setEditingName("");
  }

  function addEditingTags(value: string) {
    const nextTags = splitTagText(value);
    if (nextTags.length === 0) return;
    setEditingTags((current) => normalizeTags([...current, ...nextTags]));
    setTagDraft("");
  }

  function removeEditingTag(tag: string) {
    setEditingTags((current) => current.filter((item) => item !== tag));
  }

  function handleTagDraftKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addEditingTags(tagDraft);
  }

  function handleTagDraftPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pastedText = event.clipboardData.getData("text");
    if (splitTagText(pastedText).length <= 1) return;
    event.preventDefault();
    addEditingTags(pastedText);
  }

  function startEditingMeta(asset: ModelAsset) {
    setEditingMetaId(asset.id);
    setEditingTags(normalizeTags(asset.tags ?? []));
    setTagDraft("");
    setEditingNotes(asset.notes ?? "");
  }

  function saveEditingMeta(asset: ModelAsset) {
    const tags = normalizeTags([...editingTags, ...splitTagText(tagDraft)]);
    dispatch({
      type: "upsertModelAsset",
      asset: {
        ...asset,
        tags,
        notes: editingNotes.trim() || undefined,
        updatedAt: nowIso(),
      },
    });
    setEditingMetaId(null);
    setEditingTags([]);
    setTagDraft("");
    setEditingNotes("");
  }

  async function handleThumbnailUpload(asset: ModelAsset, fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("请选择图片文件。");
      return;
    }
    try {
      const compressed = await compressImage(file, 1200, 0.82);
      const timestamp = nowIso();
      const imageId = createId("asset-thumb");
      dispatch({
        type: "addWorkshopImage",
        image: {
          id: imageId,
          title: `${asset.name} 预览图`,
          storageType: "dataUrl",
          dataUrl: compressed.dataUrl,
          mimeType: compressed.mimeType,
          width: compressed.width,
          height: compressed.height,
          originalSizeBytes: compressed.originalSizeBytes,
          sizeBytes: compressed.sizeBytes,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });
      dispatch({ type: "upsertModelAsset", asset: { ...asset, thumbnailImageId: imageId, updatedAt: timestamp } });
      setHeroPreviewImage(compressed.dataUrl);
      setSelectedFile(null);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
    } catch {
      window.alert("图片读取失败，请换一张预览图再试。");
    }
  }

  async function handlePreviewLocal(asset: ModelAsset) {
    const handle = libraryHandle ?? (await restoreModelLibrary()).value;
    const previewPath = asset.localPreviewRelativePath ?? asset.localRelativePath;
    if (!handle || !previewPath) {
      window.alert("需要重新连接本地模型仓库后才能预览此文件。");
      return;
    }
    const result = await createModelObjectUrl(handle, previewPath);
    if (result.ok && result.value) showModelObjectUrl(result.value);
    else window.alert(result.error ?? "无法加载模型文件。");
  }

  function handlePreviewTemp() {
    window.alert("临时文件刷新后已失效，请重新选择模型文件。");
  }

  function handleRemove(id: string) {
    dispatch({ type: "deleteModelAsset", id });
  }

  function renderAssetCard(asset: ModelAsset) {
    const thumbnail = imageSource(imagesById.get(asset.thumbnailImageId ?? ""));
    const isEditingName = editingAssetId === asset.id;
    const isEditingMeta = editingMetaId === asset.id;
    const assetTags = asset.tags ?? [];
    const visibleTags = assetTags.slice(0, 6);
    const hiddenTagCount = Math.max(0, assetTags.length - visibleTags.length);
    const recommendedTags = inferRecommendedTags(asset).filter((tag) => !editingTags.includes(tag));
    return (
      <article className="model-asset-card" key={asset.id}>
        <div className="model-asset-thumb">
          {thumbnail ? <img src={thumbnail} alt={`${asset.name} 预览图`} onClick={() => setHeroPreviewImage(thumbnail)} /> : <div className="empty-thumb"><span>预览图</span></div>}
          <label className="thumb-upload-button">
            上传图
            <input type="file" accept="image/*" onChange={(event) => { handleThumbnailUpload(asset, event.target.files); event.currentTarget.value = ""; }} />
          </label>
        </div>
        <div className="model-asset-card-body">
          <div className="card-top">
            {isEditingName ? (
              <input className="asset-name-input" value={editingName} autoFocus onChange={(event) => setEditingName(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Enter") saveEditingName(asset);
                if (event.key === "Escape") setEditingAssetId(null);
              }} />
            ) : <strong title={asset.name}>{asset.name}</strong>}
            <span className="badge">{asset.fileExtension.toUpperCase()}</span>
          </div>
          <span title={asset.fileName}>文件夹：{asset.fileName}</span>
          {asset.modelFileCount != null && <span>拆件：{asset.modelFileCount} 个</span>}
          <span>大小：{asset.fileSizeBytes != null ? formatModelFileSize(asset.fileSizeBytes) : "未知"}</span>
          {asset.localRelativePath && <span title={asset.localRelativePath}>目录：{asset.localRelativePath}</span>}
          {assetTags.length > 0 && <div className="asset-tag-row">{visibleTags.map((tag) => <span key={tag}>{tag}</span>)}{hiddenTagCount > 0 && <span>+{hiddenTagCount}</span>}</div>}
          {asset.notes && <p className="asset-note" title={asset.notes}>{asset.notes}</p>}
          {isEditingMeta && (
            <div className="asset-meta-editor">
              <div className="selected-tag-chips" aria-label="已选标签">
                {editingTags.length === 0 ? <span className="tag-editor-empty">暂无标签</span> : editingTags.map((tag) => (
                  <button key={tag} className="selected-tag-chip" type="button" onClick={() => removeEditingTag(tag)} title="点击删除">
                    {tag}<span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
              <input
                className="tag-chip-input"
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={handleTagDraftKeyDown}
                onPaste={handleTagDraftPaste}
                placeholder="输入标签后按 Enter"
              />
              <div className="recommended-tags" aria-label="推荐标签">
                {recommendedTags.map((tag) => (
                  <button key={tag} className="recommended-tag-chip" type="button" onClick={() => addEditingTags(tag)}>{tag}</button>
                ))}
              </div>
              <textarea value={editingNotes} onChange={(event) => setEditingNotes(event.target.value)} placeholder="备注" />
              <div className="button-row">
                <button className="button primary small" type="button" onClick={() => saveEditingMeta(asset)}>保存</button>
                <button className="button ghost small" type="button" onClick={() => { setEditingMetaId(null); setEditingTags([]); setTagDraft(""); }}>取消</button>
              </div>
            </div>
          )}
          <span className="muted">登记：{formatDate(asset.createdAt)}</span>
        </div>
        <div className="button-row">
          {isEditingName ? <button className="button primary small" type="button" onClick={() => saveEditingName(asset)}>保存</button> : <button className="button ghost small" type="button" onClick={() => startEditingName(asset)}>改名</button>}
          <button className="button ghost small" type="button" onClick={() => startEditingMeta(asset)}>标签备注</button>
          {asset.sourceType === "localFile" ? <button className="button ghost small" type="button" onClick={() => handlePreviewLocal(asset)}>加载预览</button> : <button className="button ghost small" type="button" onClick={handlePreviewTemp}>预览</button>}
          <ConfirmDelete onConfirm={() => handleRemove(asset.id)} />
        </div>
      </article>
    );
  }

  function renderScanCard(file: ScannedModelFile) {
    return (
      <article className="model-asset-card scan-card" key={`scan:${file.relativePath}`}>
        <div className="model-asset-thumb empty-thumb"><span>{file.modelFileCount ?? 1} 件</span></div>
        <div className="model-asset-card-body">
          <div className="card-top"><strong title={file.fileName}>{file.fileName}</strong><span className="badge">{file.extension.toUpperCase()}</span></div>
          <span title={file.relativePath}>目录：{file.relativePath}</span>
          <span>拆件：{file.modelFileCount ?? 1} 个</span>
          <span>总大小：{formatModelFileSize(file.sizeBytes)}{isLargeFile(file.sizeBytes) && <span className="warning-text"> 大文件</span>}</span>
          <span className="muted">未登记</span>
        </div>
        <div className="button-row"><button className="button primary small" type="button" onClick={() => handleRegisterFromScan(file)}>登记</button></div>
      </article>
    );
  }

  return (
    <>
      <PageHeader title="模型管理" description="停留在 F:\\3D打印手办文件 这一层扫描；每个一级文件夹是一张模型卡片。" />
      <section className="panel library-status-panel">
        <h2>本地模型仓库</h2>
        <p className="muted">{libraryStatus}</p>
        {scanError && <p className="error-text">{scanError}</p>}
        {!librarySupported && <p className="error-text">当前浏览器不支持本地模型仓库，请使用 Chrome / Edge。</p>}
        {librarySupported && <div className="button-row">
          <button className="button primary" type="button" onClick={handleConnectLibrary}>选择 F:\3D打印手办文件</button>
          <button className="button ghost" type="button" onClick={handleScanLibrary}>扫描模型包</button>
          {libraryHandle && <button className="button ghost danger" type="button" onClick={handleClearLibrary}>断开仓库</button>}
        </div>}
      </section>
      <section className="editor-layout wide-editor">
        <div className="panel form-panel">
          <h2>预览</h2>
          <div className="file-picker">
            <input ref={fileInputRef} hidden type="file" accept=".glb,.gltf,.stl,.obj" onChange={handleFileChange} />
            <button className="button primary" type="button" onClick={() => fileInputRef.current?.click()}>选择单个模型文件</button>
            {(selectedFile || objectUrl || heroPreviewImage) && <button className="button ghost" type="button" onClick={clearSelection}>清除预览</button>}
          </div>
          {selectedFile && <div className="file-meta"><strong>{selectedFile.name}</strong><span>{inferExtension(selectedFile.name).toUpperCase()} · {formatModelFileSize(selectedFile.size)}</span></div>}
          <div className="model-viewer-wrap">
            {heroPreviewImage ? <img className="asset-hero-preview-image" src={heroPreviewImage} alt="模型预览图" /> : <ModelViewer modelUrl={objectUrl} fileName={selectedFile?.name} fileExtension={selectedFile ? inferExtension(selectedFile.name) : undefined} />}
          </div>
          {selectedFile && <div className="register-form">
            <h3>登记为模型资产</h3>
            <div className="form-grid"><label>名称<input value={registerName} onChange={(event) => setRegisterName(event.target.value)} placeholder={selectedFile.name} /></label></div>
            <label>备注<textarea value={registerNotes} onChange={(event) => setRegisterNotes(event.target.value)} placeholder="可选备注" /></label>
            <button className="button primary" type="button" onClick={handleRegisterTemp}>登记为模型资产</button>
          </div>}
        </div>
        <section className="panel">
          <h2>模型资产</h2>
          <p className="muted">可以给模型打多个标签，再同时选中多个标签进行筛选。</p>
          <div className="model-filter-row">
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="搜索名称、目录、标签、备注" />
            <div className="tag-filter-group" aria-label="标签筛选">
              {allTags.length === 0 ? <span className="muted">暂无标签</span> : allTags.map((tag) => (
                <button key={tag} className={`tag-filter-chip ${selectedTags.includes(tag) ? "active" : ""}`} type="button" onClick={() => toggleSelectedTag(tag)}>{tag}</button>
              ))}
            </div>
            {(searchText || selectedTags.length > 0) && <button className="button ghost" type="button" onClick={() => { setSearchText(""); setSelectedTags([]); }}>清除筛选</button>}
          </div>
          {gridItems.length === 0 ? <EmptyState title="暂无模型资产" description="点击“扫描模型包”后，这里会显示模型卡片。" /> : <div className="model-asset-grid">{gridItems.map((item) => item.kind === "asset" ? renderAssetCard(item.asset) : renderScanCard(item.file))}</div>}
        </section>
      </section>
    </>
  );
}
