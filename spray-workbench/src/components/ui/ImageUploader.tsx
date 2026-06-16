import { useState } from "react";
import { connectImageLibrary, isFileSystemAccessSupported, makeImageFileName, restoreImageLibrary, writeImageFile } from "../../data/fileLibrary";
import type { ImageStorageType } from "../../types/workbench";
import { compressImage, compressImageToBlob, estimateLocalStorageUsage, formatBytes } from "../../utils/images";

const STORAGE_WARNING_BYTES = 4 * 1024 * 1024;
const SINGLE_IMAGE_LIMIT_BYTES = 1.5 * 1024 * 1024;
const IMAGE_STORAGE_MODE_KEY = "spray-workbench:image-storage-mode";

export interface UploadedImagePayload {
  storageType: ImageStorageType;
  dataUrl?: string;
  imageUrl?: string;
  localRelativePath?: string;
  mimeType: string;
  width: number;
  height: number;
  originalSizeBytes: number;
  sizeBytes: number;
  title?: string;
}

interface ImageUploaderProps {
  label?: string;
  fileNamePrefix?: string;
  onUpload: (images: UploadedImagePayload[]) => void;
}

function getInitialStorageMode(): Exclude<ImageStorageType, "remoteUrl"> {
  const saved = window.localStorage.getItem(IMAGE_STORAGE_MODE_KEY);
  return saved === "localFile" ? "localFile" : "dataUrl";
}

export function ImageUploader({ label = "插入图片", fileNamePrefix, onUpload }: ImageUploaderProps) {
  const [storageMode, setStorageMode] = useState<Exclude<ImageStorageType, "remoteUrl">>(getInitialStorageMode);
  const [message, setMessage] = useState("支持点击上传、拖拽上传和一次选择多张图片。");
  const [isDragging, setIsDragging] = useState(false);

  function updateStorageMode(mode: Exclude<ImageStorageType, "remoteUrl">) {
    setStorageMode(mode);
    window.localStorage.setItem(IMAGE_STORAGE_MODE_KEY, mode);
  }

  async function handleFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setMessage("上传失败：请选择图片文件。");
      return;
    }

    const uploaded: UploadedImagePayload[] = [];
    const reports: string[] = [];
    let directoryHandle: FileSystemDirectoryHandle | undefined;

    if (storageMode === "localFile") {
      if (!isFileSystemAccessSupported()) {
        setMessage("当前浏览器不支持本地文件夹写入，请使用桌面版 Chrome 或 Edge，或继续使用内置图片模式。");
        return;
      }
      const restored = await restoreImageLibrary();
      if (restored.ok) {
        directoryHandle = restored.value;
      } else {
        const connected = await connectImageLibrary();
        if (!connected.ok) {
          setMessage(connected.error ?? "无法连接本地图片仓库。");
          return;
        }
        directoryHandle = connected.value;
      }
    }

    for (const file of imageFiles) {
      try {
        if (storageMode === "localFile") {
          const compressed = await compressImageToBlob(file);
          if (compressed.sizeBytes > SINGLE_IMAGE_LIMIT_BYTES) {
            reports.push(`${file.name} 压缩后仍有 ${formatBytes(compressed.sizeBytes)}，已跳过。请先裁剪或降低分辨率。`);
            continue;
          }
          const written = await writeImageFile(directoryHandle!, compressed.blob, makeImageFileName(fileNamePrefix, compressed.mimeType));
          if (!written.ok || !written.value) {
            reports.push(`${file.name} 保存失败：${written.error ?? "无法写入本地图片仓库。"}`);
            continue;
          }
          uploaded.push({
            storageType: "localFile",
            localRelativePath: written.value.relativePath,
            mimeType: written.value.mimeType,
            width: compressed.width,
            height: compressed.height,
            originalSizeBytes: compressed.originalSizeBytes,
            sizeBytes: written.value.sizeBytes,
            title: file.name.replace(/\.[^.]+$/, ""),
          });
          reports.push(`${file.name}：${formatBytes(file.size)} -> ${formatBytes(written.value.sizeBytes)}，${compressed.width} x ${compressed.height}，已保存到本地图片仓库`);
        } else {
          const compressed = await compressImage(file);
          if (compressed.sizeBytes > SINGLE_IMAGE_LIMIT_BYTES) {
            reports.push(`${file.name} 压缩后仍有 ${formatBytes(compressed.sizeBytes)}，已跳过。请先裁剪或降低分辨率。`);
            continue;
          }
          uploaded.push({ ...compressed, storageType: "dataUrl", title: file.name.replace(/\.[^.]+$/, "") });
          reports.push(`${file.name}：${formatBytes(file.size)} -> ${formatBytes(compressed.sizeBytes)}，${compressed.width} x ${compressed.height}`);
        }
      } catch {
        reports.push(`${file.name} 上传失败：图片无法读取或压缩。`);
      }
    }

    if (uploaded.length > 0) onUpload(uploaded);
    const usage = estimateLocalStorageUsage() + uploaded.filter((item) => item.storageType === "dataUrl").reduce((sum, item) => sum + item.sizeBytes, 0);
    const warning = usage > STORAGE_WARNING_BYTES ? " 当前本地数据已超过 4MB，建议导出 JSON 备份，并优先使用本地图片仓库。" : "";
    setMessage(`${reports.join("；")}${warning}`);
  }

  return (
    <div
      className={`upload-box ${isDragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <strong>{label}</strong>
      <div className="storage-mode-row" role="group" aria-label="图片存储模式">
        <button className={`storage-mode-button ${storageMode === "dataUrl" ? "active" : ""}`} type="button" onClick={() => updateStorageMode("dataUrl")}>内置存储</button>
        <button className={`storage-mode-button ${storageMode === "localFile" ? "active" : ""}`} type="button" onClick={() => updateStorageMode("localFile")}>本地图片仓库</button>
      </div>
      <input type="file" accept="image/*" multiple onChange={(event) => event.target.files && handleFiles(event.target.files)} />
      {storageMode === "localFile" && !isFileSystemAccessSupported() && <small className="error-text">当前浏览器不支持本地文件夹写入，请使用桌面版 Chrome 或 Edge，或继续使用内置图片模式。</small>}
      <small>{message}</small>
    </div>
  );
}
