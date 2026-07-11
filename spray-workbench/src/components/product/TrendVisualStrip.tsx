import { WorkshopImageView } from "../ui/ImageGallery";
import type { WorkshopImage } from "../../types/workbench";

function Placeholder({ label }: { label: string }) { return <div className="image-fallback visual-placeholder">{label}<small>暂无图片</small></div>; }

export function TrendVisualStrip({ title, sourceUrl, attribution, sourceLink, modelThumbnail, prototype }: { title: string; sourceUrl?: string; attribution?: string; sourceLink?: string; modelThumbnail?: WorkshopImage; prototype?: WorkshopImage }) {
  return <div className="visual-comparison-grid trend-visual-strip"><article><strong>市场图</strong>{sourceUrl ? <><img src={sourceUrl} alt={`${title} 市场图`} /><small>{attribution ?? "来源图"}</small>{sourceLink && <a href={sourceLink} target="_blank" rel="noreferrer">查看来源</a>}</> : <Placeholder label="市场图" />}</article><article><strong>模型图</strong>{modelThumbnail ? <WorkshopImageView image={modelThumbnail} alt={`${title} 模型图`} /> : <Placeholder label="模型图" />}</article><article><strong>样品图</strong>{prototype ? <WorkshopImageView image={prototype} alt={`${title} 样品图`} /> : <Placeholder label="样品图" />}</article></div>;
}
