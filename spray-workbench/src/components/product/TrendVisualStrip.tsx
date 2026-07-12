function Placeholder({ label }: { label: string }) { return <div className="image-fallback visual-placeholder">{label}<small>暂无图片</small></div>; }

export function TrendVisualStrip({ title, sourceUrl, attribution, sourceLink }: { title: string; sourceUrl?: string; attribution?: string; sourceLink?: string }) {
  return <div className="trend-visual-strip"><article><strong>来源商品图</strong>{sourceUrl ? <><img src={sourceUrl} alt={`${title} 来源商品图`} /><small>{attribution ?? "来源图"}</small>{sourceLink && <a href={sourceLink} target="_blank" rel="noreferrer">查看来源</a>}</> : <Placeholder label="来源商品图" />}</article></div>;
}
