import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { ProductMarket, ProductOpportunity, ProductStatus } from "../types/workbench";
import { createId } from "../utils/ids";
import { transitionProduct } from "../utils/productRules";

const stages: Array<{ status: ProductStatus; label: string; next: string }> = [
  { status: "watching", label: "发现", next: "核对来源与本地模型" },
  { status: "candidate", label: "验证", next: "补充成本和打印验证" },
  { status: "test-print", label: "测试打印", next: "记录测试结果" },
  { status: "test-selling", label: "测试销售", next: "记录曝光、浏览与订单" },
  { status: "approved", label: "批准量产", next: "安排生产" },
];

const statusLabel = (status: ProductStatus) => stages.find((stage) => stage.status === status)?.label ?? "已淘汰";
const nextAction = (status: ProductStatus) => stages.find((stage) => stage.status === status)?.next ?? "查看历史记录";
const isMarketBacked = (product: ProductOpportunity) => Boolean(product.marketData || product.radarProvenance || product.radarItemId);

function emptyProduct(name: string): ProductOpportunity {
  return {
    id: createId("product"), name, category: "手动新增", markets: ["Canada"], productRole: "profit",
    description: "", targetCustomer: "待验证", customerProblem: "待研究", customizationOptions: [],
    // Required legacy fields remain neutral but are never rendered as market evidence.
    demandScore: 0, competitionScore: 0, profitScore: 0, shippingScore: 0, videoScore: 0, customizationScore: 0, repeatabilityScore: 0,
    licenseStatus: "unknown", ipRisk: "high", complianceRisk: "low", riskTags: [], sourceLinks: [], evidenceNotes: [], status: "watching",
  };
}

export function ProductRadarPage() {
  const { data, dispatch, setNotice } = useWorkbench();
  const products = data.productOpportunities ?? [];
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState("");

  const addManual = (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualName.trim()) return;
    dispatch({ type: "upsertProductOpportunity", product: emptyProduct(manualName.trim()) });
    setManualName("");
    setShowManualForm(false);
    setNotice("已手动新增产品；请补充市场数据或从趋势雷达关联来源。");
  };

  const move = (product: ProductOpportunity, status: ProductStatus) => {
    const result = transitionProduct(product, status, data.productTestRecords ?? [], data.salesTestRecords ?? [], data.licenseRecords ?? []);
    if (!result.ok) return setNotice(result.message);
    dispatch({ type: "upsertProductOpportunity", product: { ...product, status, statusHistory: [...(product.statusHistory ?? []), { status, changedAt: new Date().toISOString() }] } });
  };

  return <>
    <PageHeader title="产品研发管线" description="趋势产品雷达是市场产品数据的主要入口；手动产品可在此补充后续研发信息。" />
    {products.length === 0 ? <section className="panel empty-state"><h2>暂无产品。请从趋势产品雷达导入，或手动新增产品。</h2><div className="button-row"><Link className="button primary" to="/trend-radar">前往趋势产品雷达</Link><button className="button ghost" onClick={() => setShowManualForm(true)}>手动新增产品</button></div></section> : <>
      <section className="pipeline-board">
        {stages.map((stage) => <article className="pipeline-column" key={stage.status}><header><strong>{stage.label}</strong><span>{products.filter((product) => product.status === stage.status).length}</span></header><small>{stage.next}</small></article>)}
      </section>
      <div className="button-row"><Link className="button primary" to="/trend-radar">从趋势产品雷达导入</Link><button className="button ghost" onClick={() => setShowManualForm((value) => !value)}>手动新增产品</button></div>
    </>}
    {showManualForm && <form className="panel form-panel" onSubmit={addManual}><h2>手动新增产品</h2><Field label="产品名称"><input autoFocus value={manualName} onChange={(event) => setManualName(event.target.value)} /></Field><div className="button-row"><button className="button primary">创建产品</button><button type="button" className="button ghost" onClick={() => setShowManualForm(false)}>取消</button></div></form>}
    {products.length > 0 && <section className="radar-product-list">
      {products.map((product) => {
        const source = product.marketData;
        const model = data.modelAssets?.find((asset) => asset.id === (source?.matchedModelAssetId ?? product.modelAssetId));
        const platform = source?.platforms.join("、") ?? product.radarProvenance?.platforms.join("、");
        const capturedAt = source?.capturedAt ?? product.radarProvenance?.firstSeenAt;
        const price = source?.price;
        const canTestPrint = product.status === "watching" || product.status === "candidate";
        return <article className="radar-product" key={product.id}>
          <div className="card-top"><div><strong>{product.name}</strong><span className="radar-subtitle">当前阶段：{statusLabel(product.status)}</span></div></div>
          {isMarketBacked(product) ? <div className="market-facts">
            <span>来源平台：{platform || "暂无数据"}</span><span>抓取时间：{capturedAt ? new Date(capturedAt).toLocaleString() : "暂无数据"}</span>
            <span>售价：{price == null ? "暂无数据" : `${source?.currency ?? ""} ${price}`}</span><span>本地模型：{model ? `已匹配 · ${model.name}` : "未匹配"}</span>
            {source?.keywords.length ? <span>关键词：{source.keywords.join("、")}</span> : null}
          </div> : <p className="muted">暂无市场数据</p>}
          <p>下一步：{nextAction(product.status)}</p>
          <div className="button-row"><Link className="button ghost" to={`/product-radar/${product.id}`}>产品详情</Link>{canTestPrint && <button className="button ghost" onClick={() => move(product, "test-print")}>进入测试打印</button>}<ConfirmDelete onConfirm={() => dispatch({ type: "deleteProductOpportunity", id: product.id })} /></div>
        </article>;
      })}
    </section>}
  </>;
}
