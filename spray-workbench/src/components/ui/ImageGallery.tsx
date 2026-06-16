import { useEffect, useState } from "react";
import { readLocalImageObjectUrl, restoreImageLibrary } from "../../data/fileLibrary";
import type { WorkshopImage } from "../../types/workbench";
import { formatDate, nowIso } from "../../utils/dates";
import { formatBytes, getStorageTypeLabel, getWorkshopImageSource } from "../../utils/images";
import { Field } from "./Field";

interface ImageGalleryProps {
  images: WorkshopImage[];
  emptyText?: string;
  onUpdate: (image: WorkshopImage) => void;
  onDelete: (id: string) => void;
}

interface WorkshopImageViewProps {
  image: WorkshopImage;
  alt: string;
}

export function WorkshopImageView({ image, alt }: WorkshopImageViewProps) {
  const [localUrl, setLocalUrl] = useState("");
  const [error, setError] = useState("");
  const source = getWorkshopImageSource(image);

  useEffect(() => {
    if (image.storageType !== "localFile") return;
    let objectUrl = "";
    let cancelled = false;
    setLocalUrl("");
    setError("");
    restoreImageLibrary()
      .then((library) => readLocalImageObjectUrl(library.value, image.localRelativePath))
      .then((result) => {
        if (cancelled) {
          if (result.ok && result.value) URL.revokeObjectURL(result.value);
          return;
        }
        if (result.ok && result.value) {
          objectUrl = result.value;
          setLocalUrl(result.value);
          setError("");
        } else {
          setLocalUrl("");
          setError(result.error ?? "图片文件未连接或已移动，请重新选择图片仓库文件夹。");
        }
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image.localRelativePath, image.storageType]);

  if (image.storageType === "localFile") {
    if (localUrl) return <img src={localUrl} alt={alt} />;
    return <div className="local-image-missing">{error || "正在读取本地图片..."}</div>;
  }

  if (!source) return <div className="local-image-missing">图片来源缺失。</div>;
  return <img src={source} alt={alt} />;
}

export function ImageGallery({ images, emptyText = "暂无关联图片。", onUpdate, onDelete }: ImageGalleryProps) {
  const [preview, setPreview] = useState<WorkshopImage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (images.length === 0) return <p className="muted">{emptyText}</p>;

  return (
    <>
      <div className="managed-image-grid">
        {images.map((image) => {
          const isEditing = editingId === image.id;
          return (
            <article className="managed-image-card" key={image.id}>
              <button className="image-button" type="button" onClick={() => setPreview(image)}>
                <WorkshopImageView image={image} alt={image.title || "喷涂图片"} />
              </button>
              {isEditing ? (
                <div className="image-edit-form">
                  <Field label="标题"><input value={image.title ?? ""} onChange={(event) => onUpdate({ ...image, title: event.target.value, updatedAt: nowIso() })} /></Field>
                  <Field label="备注"><textarea value={image.notes ?? ""} onChange={(event) => onUpdate({ ...image, notes: event.target.value, updatedAt: nowIso() })} /></Field>
                  <Field label="拍摄日期"><input type="date" value={image.capturedAt ?? ""} onChange={(event) => onUpdate({ ...image, capturedAt: event.target.value, updatedAt: nowIso() })} /></Field>
                  <button className="button ghost" type="button" onClick={() => setEditingId(null)}>完成编辑</button>
                </div>
              ) : (
                <>
                  <strong>{image.title || "未命名图片"}</strong>
                  <span>{image.width} x {image.height} · {formatBytes(image.sizeBytes)}</span>
                  <small>存储：{getStorageTypeLabel(image.storageType)}</small>
                  {image.storageType === "localFile" && <small>文件：{image.localRelativePath || "未记录路径"}</small>}
                  <small>{image.capturedAt ? `拍摄：${formatDate(image.capturedAt)}` : `添加：${formatDate(image.createdAt)}`}</small>
                  {image.notes && <p>{image.notes}</p>}
                  <div className="button-row">
                    <button className="button ghost" type="button" onClick={() => setEditingId(image.id)}>编辑说明</button>
                    <button
                      className="button ghost danger"
                      type="button"
                      onClick={() => {
                        if (window.confirm("确认删除这张图片吗？项目、模型和喷涂记录不会被删除。")) onDelete(image.id);
                      }}
                    >
                      删除图片
                    </button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
      {preview && (
        <div className="image-lightbox" role="dialog" aria-modal="true">
          <div className="image-lightbox-panel">
            <button className="button ghost lightbox-close" type="button" onClick={() => setPreview(null)}>关闭</button>
            <div className="lightbox-image-wrap">
              <WorkshopImageView image={preview} alt={preview.title || "图片预览"} />
            </div>
            <div className="lightbox-meta">
              <h2>{preview.title || "未命名图片"}</h2>
              <p>{preview.notes || "暂无备注"}</p>
              <span>{preview.width} x {preview.height} · {formatBytes(preview.sizeBytes)}{preview.originalSizeBytes ? ` · 原图 ${formatBytes(preview.originalSizeBytes)}` : ""}</span>
              <span>存储方式：{getStorageTypeLabel(preview.storageType)}{preview.localRelativePath ? ` · ${preview.localRelativePath}` : ""}</span>
              <span>{preview.capturedAt ? `拍摄日期：${formatDate(preview.capturedAt)}` : `添加时间：${formatDate(preview.createdAt)}`}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
