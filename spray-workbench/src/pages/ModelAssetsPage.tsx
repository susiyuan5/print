import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { ModelViewer } from "../components/model/ModelViewer";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { ModelAsset, ModelFileExtension } from "../types/workbench";
import { formatDate, nowIso } from "../utils/dates";
import { createId } from "../utils/ids";
import {
  isModelLibrarySupported,
  connectModelLibrary,
  restoreModelLibrary,
  clearModelLibrary,
  scanModelFiles,
  createModelObjectUrl,
  revokeModelObjectUrl,
  formatModelFileSize,
  isLargeFile,
  type ScannedModelFile,
} from "../utils/localModelLibrary";

function inferExtension(fileName: string): ModelFileExtension {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "glb" || ext === "gltf" || ext === "stl" || ext === "obj") return ext;
  return "other";
}

export function ModelAssetsPage() {
  const { data, dispatch } = useWorkbench();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [registerName, setRegisterName] = useState("");
  const [registerNotes, setRegisterNotes] = useState("");
  const assets = data.modelAssets ?? [];

  // --- local model library state ---
  const [librarySupported, setLibrarySupported] = useState(true);
  const [libraryStatus, setLibraryStatus] = useState("正在检查本地模型仓库...");
  const [libraryHandle, setLibraryHandle] = useState<FileSystemDirectoryHandle | undefined>();
  const [scannedFiles, setScannedFiles] = useState<ScannedModelFile[]>([]);
  const [scanError, setScanError] = useState("");

  // restore library on mount
  useEffect(() => {
    if (!isModelLibrarySupported()) {
      setLibrarySupported(false);
      setLibraryStatus("当前浏览器不支持本地模型仓库，请使用 Chrome / Edge，或使用临时文件预览。");
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

  // cleanup objectUrl on unmount
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  // --- temporary file ---
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setSelectedFile(file);
    setObjectUrl(URL.createObjectURL(file));
    setRegisterName(file.name);
    setRegisterNotes("");
  }

  function handleRegisterTemp() {
    if (!selectedFile) return;
    const name = registerName.trim() || selectedFile.name;
    const timestamp = nowIso();
    dispatch({
      type: "upsertModelAsset",
      asset: {
        id: createId("ma"),
        name,
        sourceType: "temporary",
        fileName: selectedFile.name,
        fileExtension: inferExtension(selectedFile.name),
        fileSizeBytes: selectedFile.size,
        notes: registerNotes.trim() || undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });
    setRegisterName("");
    setRegisterNotes("");
  }

  function clearSelection() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
    setSelectedFile(null);
    setRegisterName("");
    setRegisterNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // --- local model library ---
  async function handleConnectLibrary() {
    const result = await connectModelLibrary();
    if (result.ok) {
      setLibraryHandle(result.value);
      setLibraryStatus("本地模型仓库已连接。");
      setScannedFiles([]);
      setScanError("");
    } else {
      setLibraryStatus(result.error ?? "无法连接本地模型仓库。");
    }
  }

  async function handleReconnectLibrary() {
    setLibraryStatus("正在重新连接...");
    await handleConnectLibrary();
  }

  async function handleScanLibrary() {
    const handle = libraryHandle;
    if (!handle) {
      const restored = await restoreModelLibrary();
      if (!restored.ok || !restored.value) {
        setLibraryStatus(restored.error ?? "请先连接本地模型仓库。");
        return;
      }
      setLibraryHandle(restored.value);
      setLibraryStatus("本地模型仓库已连接。");
    }
    const h = libraryHandle ?? (await restoreModelLibrary()).value;
    if (!h) return;
    setScanError("");
    const result = await scanModelFiles(h);
    if (result.ok && result.value) {
      setScannedFiles(result.value);
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
    const exists = assets.some(
      (a) => a.sourceType === "localFile" && a.localRelativePath === file.relativePath
    );
    if (exists) return;
    const name = file.fileName.replace(/\.[^.]+$/, "");
    const timestamp = nowIso();
    dispatch({
      type: "upsertModelAsset",
      asset: {
        id: createId("ma"),
        name,
        sourceType: "localFile",
        fileName: file.fileName,
        fileExtension: inferExtension(file.fileName),
        fileSizeBytes: file.sizeBytes,
        localRelativePath: file.relativePath,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });
  }

  async function handlePreviewLocal(asset: ModelAsset) {
    const handle = libraryHandle ?? (await restoreModelLibrary()).value;
    if (!handle || !asset.localRelativePath) {
      window.alert("需要重新连接本地模型仓库才能预览此文件。");
      return;
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const result = await createModelObjectUrl(handle, asset.localRelativePath);
    if (result.ok && result.value) {
      setObjectUrl(result.value);
      setSelectedFile(null);
    } else {
      window.alert(result.error ?? "无法加载模型文件。");
    }
  }

  function handlePreviewTemp(asset: ModelAsset) {
    if (asset.sourceType === "temporary") {
      window.alert("临时文件刷新后已失效，请重新选择文件。");
    }
  }

  function isAssetRegistered(file: ScannedModelFile): boolean {
    return assets.some(
      (a) => a.sourceType === "localFile" && a.localRelativePath === file.relativePath
    );
  }

  function handleRemove(id: string) {
    dispatch({ type: "deleteModelAsset", id });
  }

  return (
    <>
      <PageHeader title="3D 模型仓库" description="选择本地模型文件进行预览，或授权本地模型文件夹进行持久化管理。" />

      <section className="static-notice">
        <p>本网站是 GitHub Pages 静态前端，不能直接读取本地硬盘路径。请通过选择文件或授权本地模型文件夹来加载模型。模型文件不会上传到云端，JSON 只保存模型记录和相对路径。</p>
      </section>

      {/* ---- Local Model Library Status ---- */}
      <section className="panel library-status-panel">
        <h2>本地模型仓库</h2>
        <p className="muted">{libraryStatus}</p>
        {!librarySupported && (
          <p className="error-text">当前浏览器不支持本地模型仓库，请使用 Chrome / Edge，或使用临时文件预览。</p>
        )}
        {librarySupported && (
          <div className="button-row">
            <button className="button primary" type="button" onClick={handleConnectLibrary}>
              连接本地模型文件夹
            </button>
            {libraryHandle && (
              <>
                <button className="button ghost" type="button" onClick={handleReconnectLibrary}>
                  重新连接
                </button>
                <button className="button ghost" type="button" onClick={handleScanLibrary}>
                  扫描模型文件
                </button>
                <button className="button ghost danger" type="button" onClick={handleClearLibrary}>
                  断开仓库
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {/* ---- Scan Results ---- */}
      {scannedFiles.length > 0 && (
        <section className="panel scan-results-panel">
          <h2>扫描结果（{scannedFiles.length} 个文件）</h2>
          {scanError && <p className="error-text">{scanError}</p>}
          <div className="item-list">
            {scannedFiles.map((file, idx) => {
              const registered = isAssetRegistered(file);
              return (
                <article className="list-card" key={file.relativePath + "-" + idx}>
                  <div className="card-top">
                    <strong>{file.fileName}</strong>
                    <span className="badge">{file.extension.toUpperCase()}</span>
                  </div>
                  <span>路径：{file.relativePath}</span>
                  <span>
                    大小：{formatModelFileSize(file.sizeBytes)}
                    {isLargeFile(file.sizeBytes) && <span className="warning-text"> 大文件</span>}
                  </span>
                  {registered ? (
                    <span className="muted">已登记</span>
                  ) : (
                    <button className="button primary small" type="button" onClick={() => handleRegisterFromScan(file)}>
                      登记
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- File Picker + Viewer ---- */}
      <section className="editor-layout wide-editor">
        <div className="panel form-panel">
          <h2>临时文件预览</h2>

          <div className="file-picker">
            <input ref={fileInputRef} hidden type="file" accept=".glb,.stl,.obj" onChange={handleFileChange} />
            <button className="button primary" type="button" onClick={() => fileInputRef.current?.click()}>
              选择本地模型文件
            </button>
            {selectedFile && (
              <button className="button ghost" type="button" onClick={clearSelection}>
                清除选择
              </button>
            )}
          </div>

          {selectedFile && (
            <div className="file-meta">
              <strong>{selectedFile.name}</strong>
              <span>{inferExtension(selectedFile.name).toUpperCase()} · {formatModelFileSize(selectedFile.size)}</span>
            </div>
          )}

          <div className="model-viewer-wrap">
            <ModelViewer
              modelUrl={objectUrl}
              fileName={selectedFile?.name}
              fileExtension={selectedFile ? inferExtension(selectedFile.name) : undefined}
            />
          </div>

          {selectedFile && (
            <div className="register-form">
              <h3>登记为模型资产</h3>
              <p className="muted">登记后记录名称、格式和大小信息。文件本身不保存，刷新后需要重新选择。</p>
              <div className="form-grid">
                <label>
                  名称
                  <input value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder={selectedFile.name} />
                </label>
              </div>
              <label>
                备注
                <textarea value={registerNotes} onChange={(e) => setRegisterNotes(e.target.value)} placeholder="可选备注" />
              </label>
              <button className="button primary" type="button" onClick={handleRegisterTemp}>
                登记为模型资产
              </button>
            </div>
          )}
        </div>

        {/* ---- Asset List ---- */}
        <section className="panel">
          <h2>已登记模型资产</h2>
          <p className="muted">
            临时文件刷新后需要重新选择，本地仓库文件需要先恢复仓库连接才能加载预览。
          </p>

          {assets.length === 0 ? (
            <EmptyState title="暂无模型资产" description="选择模型文件并登记后，这里会显示所有登记过的模型资产记录。" />
          ) : (
            <div className="item-list">
              {assets.map((asset) => (
                <article className="list-card" key={asset.id}>
                  <div className="card-top">
                    <strong>{asset.name}</strong>
                    <span className="badge">{asset.fileExtension.toUpperCase()}</span>
                    {asset.sourceType === "temporary" ? (
                      <span className="badge badge-temp">临时</span>
                    ) : (
                      <span className="badge badge-local">本地仓库</span>
                    )}
                  </div>
                  <span>文件：{asset.fileName}</span>
                  <span>大小：{asset.fileSizeBytes != null ? formatModelFileSize(asset.fileSizeBytes) : "未知"}</span>
                  {asset.localRelativePath && <span>路径：{asset.localRelativePath}</span>}
                  {asset.notes && <p>{asset.notes}</p>}
                  <span className="muted">登记时间：{formatDate(asset.createdAt)}</span>
                  <div className="button-row">
                    {asset.sourceType === "localFile" ? (
                      <button className="button ghost" type="button" onClick={() => handlePreviewLocal(asset)}>
                        加载预览
                      </button>
                    ) : (
                      <button className="button ghost" type="button" onClick={() => handlePreviewTemp(asset)}>
                        预览
                      </button>
                    )}
                    <ConfirmDelete onConfirm={() => handleRemove(asset.id)} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </>
  );
}
