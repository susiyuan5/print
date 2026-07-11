import { Link, useParams } from "react-router-dom";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { ProductVisualComparison } from "../components/product/ProductVisualComparison";
import { useWorkbench } from "../state/WorkbenchProvider";
import { createId } from "../utils/ids";
import { approvalMissing, evidenceInfo, profit, salesDiagnosis, salesMetrics, transitionProduct } from "../utils/productRules";
import type { ProductOpportunity, ProductStatus, ProductTestRecord, SalesTestRecord } from "../types/workbench";

function StageActions({ onMove }: { onMove: (status: ProductStatus) => void }) {
  return <div className="button-row"><Link className="button ghost" to="/product-radar">返回雷达</Link><button className="button ghost" onClick={() => onMove("test-print")}>进入打印测试</button><button className="button ghost" onClick={() => onMove("test-selling")}>进入销售测试</button><button className="button primary" onClick={() => onMove("approved")}>批准</button><button className="button danger" onClick={() => onMove("rejected")}>拒绝</button></div>;
}

function Overview({ product, update }: { product: ProductOpportunity; update: (patch: Partial<ProductOpportunity>) => void }) {
  const money = profit(product);
  return <section className="panel form-panel"><h2>基本信息与利润</h2><Field label="名称"><input value={product.name} onChange={e => update({ name: e.target.value })} /></Field><Field label="描述"><textarea value={product.description} onChange={e => update({ description: e.target.value })} /></Field><div className="form-grid">{[["售价 CAD", "sellingPriceCad"], ["材料成本 CAD", "materialCostCad"], ["打印小时", "printTimeHours"]].map(([label, key]) => <Field key={key} label={label}><input type="number" value={product[key as keyof ProductOpportunity] as number ?? ""} onChange={e => update({ [key]: Number(e.target.value) || undefined })} /></Field>)}</div><p>直接成本 CA${money.direct.toFixed(2)} · 估算净利润 CA${money.net.toFixed(2)} · 净利率 {money.netMargin.toFixed(1)}%。估算不保证实际结果。</p></section>;
}

function PrintTests({ product, records }: { product: ProductOpportunity; records: ProductTestRecord[] }) {
  const { dispatch } = useWorkbench();
  const add = () => dispatch({ type: "upsertProductTestRecord", record: { id: createId("print"), productId: product.id, name: "打印测试", testDate: new Date().toISOString().slice(0, 10), successfulQuantity: 0, failedQuantity: 0, result: "revise", updatedAt: new Date().toISOString() } });
  const save = (record: ProductTestRecord, patch: Partial<ProductTestRecord>) => { const next = { ...record, ...patch }; const total = (next.successfulQuantity ?? 0) + (next.failedQuantity ?? 0); if (total > 0) next.printSuccessRate = (next.successfulQuantity ?? 0) / total * 100; dispatch({ type: "upsertProductTestRecord", record: next }); };
  return <section className="panel"><h2>打印测试</h2><button className="button ghost" onClick={add}>新增打印测试</button>{records.map(record => <article className="list-card" key={record.id}><div className="form-grid"><input value={record.name ?? ""} onChange={e => save(record, { name: e.target.value })} /><input type="date" value={record.testDate ?? ""} onChange={e => save(record, { testDate: e.target.value })} /><input type="number" placeholder="成功数量" value={record.successfulQuantity ?? 0} onChange={e => save(record, { successfulQuantity: Number(e.target.value) || 0 })} /><input type="number" placeholder="失败数量" value={record.failedQuantity ?? 0} onChange={e => save(record, { failedQuantity: Number(e.target.value) || 0 })} /><input type="number" placeholder="实际打印小时" value={record.printTimeHours ?? ""} onChange={e => save(record, { printTimeHours: Number(e.target.value) || undefined })} /><select value={record.result ?? "revise"} onChange={e => save(record, { result: e.target.value as ProductTestRecord["result"] })}><option value="pass">通过</option><option value="revise">修改</option><option value="fail">失败</option></select></div><p>自动成功率：{(record.printSuccessRate ?? 0).toFixed(1)}%</p><textarea placeholder="缺陷与备注" value={record.notes ?? ""} onChange={e => save(record, { notes: e.target.value })} /><ConfirmDelete onConfirm={() => dispatch({ type: "deleteProductTestRecord", id: record.id })} /></article>)}</section>;
}

function SalesTests({ product, records }: { product: ProductOpportunity; records: SalesTestRecord[] }) {
  const { dispatch } = useWorkbench();
  const add = () => dispatch({ type: "upsertSalesTestRecord", record: { id: createId("sales"), productId: product.id, platform: "Etsy", periodStart: new Date().toISOString().slice(0, 10), impressions: 0, views: 0, updatedAt: new Date().toISOString() } });
  const save = (record: SalesTestRecord, patch: Partial<SalesTestRecord>) => dispatch({ type: "upsertSalesTestRecord", record: { ...record, ...patch } });
  return <section className="panel"><h2>销售测试</h2><button className="button ghost" onClick={add}>新增销售测试</button>{records.map(record => { const metrics = salesMetrics(record); return <article className="list-card" key={record.id}><div className="form-grid"><input value={record.platform} onChange={e => save(record, { platform: e.target.value })} /><input type="date" value={record.periodStart ?? ""} onChange={e => save(record, { periodStart: e.target.value })} /><input type="date" value={record.periodEnd ?? ""} onChange={e => save(record, { periodEnd: e.target.value })} />{["impressions", "views", "favorites", "inquiries", "addToCart", "orders", "revenueCad", "returns", "testPriceCad", "advertisingSpendCad"].map(key => <input key={key} type="number" min="0" placeholder={key} value={record[key as keyof SalesTestRecord] as number ?? ""} onChange={e => save(record, { [key]: Math.max(0, Number(e.target.value) || 0) })} />)}</div><p>CTR {metrics.ctr.toFixed(1)}% · 转化 {metrics.conversionRate.toFixed(1)}% · {salesDiagnosis(record)}</p><textarea placeholder="客户反馈与备注" value={record.notes ?? ""} onChange={e => save(record, { notes: e.target.value })} /><ConfirmDelete onConfirm={() => dispatch({ type: "deleteSalesTestRecord", id: record.id })} /></article>; })}</section>;
}

function ProductionSection({ product, update }: { product: ProductOpportunity; update: (patch: Partial<ProductOpportunity>) => void }) {
  if (!product.productionStatus) return null;
  const stages = ["queued", "prototyping", "prototype-complete", "test-selling", "selling"] as const;
  const labels = { queued: "打印队列", prototyping: "打样中", "prototype-complete": "样品完成", "test-selling": "测试销售", selling: "正式销售", unprinted: "未打印", paused: "已暂停" };
  const index = stages.indexOf(product.productionStatus as typeof stages[number]);
  const next = index >= 0 && index < stages.length - 1 ? stages[index + 1] : undefined;
  return <section className="panel"><h2>生产流程</h2><p>当前阶段：{labels[product.productionStatus]}</p>{product.radarProvenance && <div className="backup-note"><strong>来源：趋势雷达</strong><p>原始标题：{product.radarProvenance.title}</p><p>平台：{product.radarProvenance.platforms.join("、")} · 首次发现：{product.radarProvenance.firstSeenAt}</p>{product.radarProvenance.sourceLinks.map(link => <a key={link} href={link} target="_blank" rel="noreferrer">查看来源</a>)}</div>}<div className="button-row">{next && <button className="button primary" onClick={() => update({ productionStatus: next })}>推进到：{labels[next]}</button>}<button className="button ghost" onClick={() => update({ productionStatus: "paused" })}>暂停</button></div></section>;
}

export function ProductDetailPage() {
  const { productId } = useParams();
  const { data, dispatch, setNotice } = useWorkbench();
  const product = data.productOpportunities?.find(item => item.id === productId);
  if (!product) return <><PageHeader title="产品不存在" description="该产品可能已被删除。" /><Link className="button ghost" to="/product-radar">返回雷达</Link></>;
  const prints = (data.productTestRecords ?? []).filter(record => record.productId === product.id);
  const sales = (data.salesTestRecords ?? []).filter(record => record.productId === product.id);
  const sources = (data.marketSources ?? []).filter(source => source.productId === product.id);
  const evidence = evidenceInfo(sources);
  const update = (patch: Partial<ProductOpportunity>) => dispatch({ type: "upsertProductOpportunity", product: { ...product, ...patch } });
  const move = (status: ProductStatus) => { const result = transitionProduct(product, status, data.productTestRecords ?? [], data.salesTestRecords ?? [], []); if (!result.ok) { setNotice(result.message); return; } update({ status, statusHistory: [...(product.statusHistory ?? []), { status, changedAt: new Date().toISOString() }] }); };
  return <><PageHeader title={product.name} description={`证据 ${evidence.count} 条，可信度 ${evidence.score}${evidence.stale ? `，${evidence.stale} 条已过期` : ""}`} /><StageActions onMove={move} /><ProductionSection product={product} update={update} /><ProductVisualComparison product={product} images={data.workshopImages ?? []} modelThumbnail={(data.workshopImages ?? []).find(image => image.id === (data.modelAssets ?? []).find(asset => asset.id === product.modelAssetId)?.thumbnailImageId)} onChange={update} onAddImage={(image) => dispatch({ type: "addWorkshopImage", image })} /><section className="editor-layout wide-editor"><div><Overview product={product} update={update} /></div><div><p className="error-text">批准仍缺：{approvalMissing(product, prints, sales, []).join("、") || "无"}</p><PrintTests product={product} records={prints} /><SalesTests product={product} records={sales} /></div></section></>;
}
