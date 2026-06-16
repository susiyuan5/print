import { useState } from "react";
import { compressImage, estimateLocalStorageUsage, formatBytes } from "../../utils/images";

interface ImageUploaderProps {
  onUpload: (image: { dataUrl: string; mimeType: string; width: number; height: number; sizeBytes: number; title?: string }) => void;
}

export function ImageUploader({ onUpload }: ImageUploaderProps) {
  const [message, setMessage] = useState("");

  async function handleFile(file?: File) {
    if (!file) return;
    try {
      setMessage("正在压缩图片...");
      const compressed = await compressImage(file);
      onUpload({ ...compressed, title: file.name.replace(/\.[^.]+$/, "") });
      const usage = estimateLocalStorageUsage() + compressed.sizeBytes;
      setMessage(`已压缩为 ${compressed.width} x ${compressed.height}，约 ${formatBytes(compressed.sizeBytes)}。当前本地存储约 ${formatBytes(usage)}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片处理失败。");
    }
  }

  return (
    <div className="upload-box">
      <input type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])} />
      <small>{message || "选择图片后会自动压缩并保存到本地数据中。"}</small>
    </div>
  );
}
