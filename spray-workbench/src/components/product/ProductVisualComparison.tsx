import { ImageUploader, type UploadedImagePayload } from "../ui/ImageUploader";
import { WorkshopImageView } from "../ui/ImageGallery";
import type { ProductOpportunity, WorkshopImage } from "../../types/workbench";
import { createId } from "../../utils/ids";
import { nowIso } from "../../utils/dates";

function MissingImage({ label }: { label: string }) { return <div className="image-fallback visual-placeholder">{label}<small>暂无图片</small></div>; }

export function ProductVisualComparison({ product, images, modelThumbnail, onChange, onAddImage }: { product: ProductOpportunity; images: WorkshopImage[]; modelThumbnail?: WorkshopImage; onChange: (product: ProductOpportunity) => void; onAddImage: (image: WorkshopImage) => void }) {
  const prototypeImages = images.filter((image) => image.productId === product.id || (product.prototypeImageIds ?? []).includes(image.id));
  const addPrototype = (uploaded: UploadedImagePayload[]) => { const timestamp = nowIso(); const ids = uploaded.map(() => createId("prototype")); uploaded.forEach((payload, index) => onAddImage({ id: ids[index], productId: product.id, title: `${product.name} 样品照片`, notes: "产品打样记录", capturedAt: timestamp, ...payload, createdAt: timestamp, updatedAt: timestamp })); onChange({ ...product, prototypeImageIds: [...new Set([...(product.prototypeImageIds ?? []), ...ids])] }); };
  const source = product.sourceImages?.[0];
  return <section className="panel"><h2>产品视觉对比</h2><p className="muted">市场来源图、匹配模型缩略图与实际打样照片并列保存；来源图保留归属链接。</p><div className="visual-comparison-grid"><article><h3>市场来源图</h3>{source?.url ? <><img src={source.url} alt={source.title ?? product.name} /><small>{source.attribution ?? "来源未注明"}</small>{source.sourceUrl && <a href={source.sourceUrl} target="_blank" rel="noreferrer">查看原始来源</a>}</> : <MissingImage label="市场来源图" />}</article><article><h3>本地模型缩略图</h3>{modelThumbnail ? <WorkshopImageView image={modelThumbnail} alt={`${product.name} 模型缩略图`} /> : <MissingImage label="模型缩略图" />}</article><article><h3>样品照片</h3>{prototypeImages[0] ? <WorkshopImageView image={prototypeImages[0]} alt={`${product.name} 样品照片`} /> : <MissingImage label="样品照片" />}<ImageUploader label="添加样品照片" fileNamePrefix={`product-${product.id}`} onUpload={addPrototype} /></article></div>{prototypeImages.length > 1 && <div className="gallery-grid">{prototypeImages.slice(1).map((image) => <WorkshopImageView key={image.id} image={image} alt={image.title ?? "样品照片"} />)}</div>}</section>;
}
