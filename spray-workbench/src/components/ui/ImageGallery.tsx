import { useState } from "react";
import type { WorkshopImage } from "../../types/workbench";
import { formatDate, nowIso } from "../../utils/dates";
import { formatBytes } from "../../utils/images";
import { Field } from "./Field";

interface ImageGalleryProps {
  images: WorkshopImage[];
  emptyText?: string;
  onUpdate: (image: WorkshopImage) => void;
  onDelete: (id: string) => void;
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
                <img src={image.dataUrl} alt={image.title || "喷涂图片"} />
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
            <img src={preview.dataUrl} alt={preview.title || "图片预览"} />
            <div className="lightbox-meta">
              <h2>{preview.title || "未命名图片"}</h2>
              <p>{preview.notes || "暂无备注"}</p>
              <span>{preview.width} x {preview.height} · {formatBytes(preview.sizeBytes)}{preview.originalSizeBytes ? ` · 原图 ${formatBytes(preview.originalSizeBytes)}` : ""}</span>
              <span>{preview.capturedAt ? `拍摄日期：${formatDate(preview.capturedAt)}` : `添加时间：${formatDate(preview.createdAt)}`}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
