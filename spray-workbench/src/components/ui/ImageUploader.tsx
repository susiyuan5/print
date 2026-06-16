import { useState } from "react";
import { compressImage, estimateLocalStorageUsage, formatBytes } from "../../utils/images";

const STORAGE_WARNING_BYTES = 4 * 1024 * 1024;
const SINGLE_IMAGE_LIMIT_BYTES = 1.5 * 1024 * 1024;

export interface UploadedImagePayload {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  originalSizeBytes: number;
  sizeBytes: number;
  title?: string;
}

interface ImageUploaderProps {
  label?: string;
  onUpload: (images: UploadedImagePayload[]) => void;
}

export function ImageUploader({ label = "插入图片", onUpload }: ImageUploaderProps) {
  const [message, setMessage] = useState("支持点击上传、拖拽上传和一次选择多张图片。");
  const [isDragging, setIsDragging] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setMessage("上传失败：请选择图片文件。");
      return;
    }

    const uploaded: UploadedImagePayload[] = [];
    const reports: string[] = [];

    for (const file of imageFiles) {
      try {
        const compressed = await compressImage(file);
        if (compressed.sizeBytes > SINGLE_IMAGE_LIMIT_BYTES) {
          reports.push(`${file.name} 压缩后仍有 ${formatBytes(compressed.sizeBytes)}，已跳过。请先裁剪或降低分辨率。`);
          continue;
        }
        uploaded.push({ ...compressed, title: file.name.replace(/\.[^.]+$/, "") });
        reports.push(`${file.name}：${formatBytes(file.size)} -> ${formatBytes(compressed.sizeBytes)}，${compressed.width} x ${compressed.height}`);
      } catch {
        reports.push(`${file.name} 上传失败：图片无法读取或压缩。`);
      }
    }

    if (uploaded.length > 0) onUpload(uploaded);
    const usage = estimateLocalStorageUsage() + uploaded.reduce((sum, item) => sum + item.sizeBytes, 0);
    const warning = usage > STORAGE_WARNING_BYTES ? " 当前本地数据已超过 4MB，建议导出 JSON 备份并减少图片。" : "";
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
      <input type="file" accept="image/*" multiple onChange={(event) => event.target.files && handleFiles(event.target.files)} />
      <small>{message}</small>
    </div>
  );
}
