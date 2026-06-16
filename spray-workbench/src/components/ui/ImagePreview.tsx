import { useState } from "react";

export function ImagePreview({ url, alt }: { url?: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!url?.trim()) {
    return <p className="image-hint">未填写图片链接。</p>;
  }

  if (failed) {
    return <div className="image-fallback">图片加载失败，请检查 URL。</div>;
  }

  return (
    <img
      className="image-preview"
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      onLoad={() => setFailed(false)}
    />
  );
}
