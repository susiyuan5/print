import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui/PageHeader";
import { Field } from "../components/ui/Field";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { ProductOpportunity, ProductMarket, RiskLevel, ProductStatus, ProductRole } from "../types/workbench";
import { createId } from "../utils/ids";
import { transitionProduct } from "../utils/productRules";

const markets: ProductMarket[] = ["Canada", "USA", "UK", "EU"];
const marketLabels: Record<ProductMarket, string> = { Canada: "加拿大", USA: "美国", UK: "英国", EU: "欧盟" };
const categories = ["成人桌面解压玩具", "游戏与桌面配件", "花盆与家居装饰", "个性化礼品", "本地问题解决零件"];
const stages: { status: ProductStatus; label: string; action: string }[] = [
  { status: "watching", label: "发现", action: "补充市场证据" },
  { status: "candidate", label: "验证", action: "核验需求与成本" },
  { status: "test-print", label: "测试打印", action: "记录时间、重量和失败率" },
  { status: "test-selling", label: "测试销售", action: "记录曝光、订单和退货" },
  { status: "approved", label: "批准量产", action: "安排批量生产" },
];
const statusLabel = (status: ProductStatus) => stages.find((stage) => stage.status === status)?.label ?? "未知阶段";
const starter = ["机械齿轮解压玩具", "无磁指尖滑块", "手柄支架", "桌下耳机挂架", "模块化理线器", "带托盘花盆", "个性化姓名花盆", "宠物剪影纪念品", "光栅灯罩", "婚礼姓名牌", "洞洞板工具挂架", "房车收纳挂钩", "滑雪手套烘干架", "家电替换旋钮", "特定型号替换卡扣"];
const blank = () => ({ name: "", category: categories[0], markets: ["Canada"] as ProductMarket[], role: "traffic" as ProductRole, demand: 60, competition: 50, profit: 60, shipping: 70, video: 55, customization: 60, repeatability: 60, ip: "low" as RiskLevel, compliance: "low" as RiskLevel, status: "watching" as ProductStatus, description: "", price: "", material: "", packaging: "", shippingCost: "", time: "", modelId: "", projectId: "", schemeId: "", logId: "" });

function breakdown(product: ProductOpportunity) {
  const additions = [
    ["需求", product.demandScore * .2], ["利润潜力", product.profitScore * .2], ["运输", product.shippingScore * .15],
    ["定制化", product.customizationScore * .15], ["低竞争", (100 - product.competitionScore) * .1], ["视频表现", product.videoScore * .1], ["复刻效率", product.repeatabilityScore * .1],
  ] as [string, number][];
  const deductions = [
    ["IP 风险", product.ipRisk === "medium" ? 10 : product.ipRisk === "high" ? 30 : 0],
    ["合规风险", product.complianceRisk === "medium" ? 10 : product.complianceRisk === "high" ? 25 : 0],
  ] as [string, number][];
  return { additions, deductions };
}

function calc(product: ProductOpportunity) {
  if (product.ipRisk === "blocked" || product.complianceRisk === "blocked") return 0;
  const parts = breakdown(product);
  return Math.round(Math.max(0, Math.min(100, parts.additions.reduce((sum, item) => sum + item[1], 0) - parts.deductions.reduce((sum, item) => sum + item[1], 0))));
}

function confidence(product: ProductOpportunity) {
  let points = 10;
  if (product.sourceLinks.length) points += Math.min(40, product.sourceLinks.length * 10);
  if (product.evidenceNotes.length) points += Math.min(30, product.evidenceNotes.length * 10);
  if (product.materialCostCad && product.printTimeHours) points += 20;
  return Math.min(100, points);
}

function profit(product: ProductOpportunity) {
  if (!product.sellingPriceCad) return undefined;
  const platformFee = product.sellingPriceCad * .095;
  const fullCost = (product.materialCostCad ?? 0) + (product.packagingCostCad ?? 0) + (product.shippingCostCad ?? 0) + platformFee;
  const net = product.sellingPriceCad - fullCost;
  return { net, margin: product.sellingPriceCad ? net / product.sellingPriceCad * 100 : 0, hourly: product.printTimeHours ? net / product.printTimeHours : undefined };
}

function grade(value: number) { return value >= 85 ? "优先测试" : value >= 70 ? "值得验证" : value >= 55 ? "继续观察" : value >= 40 ? "低优先级" : "淘汰"; }
function relation(label: string, id: string, items: { id: string; name?: string; title?: string }[]) { if (!id) return ""; const item = items.find((entry) => entry.id === id); return `${label}: ${item?.name ?? item?.title ?? id}`; }

export function ProductRadarPage() {
  const { data, dispatch, setNotice } = useWorkbench();
  const products = data.productOpportunities ?? [];
  const [form, setForm] = useState(blank());
  const [market, setMarket] = useState("all");
  const [quick, setQuick] = useState("all");
  const shown = useMemo(() => products.filter((product) => (market === "all" || product.markets.includes(market as ProductMarket)) && (quick === "all" || (quick === "shipping" && product.shippingScore >= 75) || (quick === "blocked" && calc(product) === 0))).sort((a, b) => calc(b) - calc(a)), [products, market, quick]);

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    const linkedNotes = [
      relation("model", form.modelId, data.models), relation("project", form.projectId, data.projects ?? []),
      relation("scheme", form.schemeId, data.colorSchemes), relation("spray-log", form.logId, data.sprayLogs),
    ].filter(Boolean);
    const product: ProductOpportunity = {
      id: createId("radar"), name: form.name, category: form.category, markets: form.markets, productRole: form.role,
      description: form.description, targetCustomer: "待验证", customerProblem: "待研究", customizationOptions: [],
      demandScore: form.demand, competitionScore: form.competition, profitScore: form.profit, shippingScore: form.shipping, videoScore: form.video, customizationScore: form.customization, repeatabilityScore: form.repeatability,
      materialCostCad: Number(form.material) || undefined, packagingCostCad: Number(form.packaging) || undefined, shippingCostCad: Number(form.shippingCost) || undefined, sellingPriceCad: Number(form.price) || undefined, printTimeHours: Number(form.time) || undefined,
      licenseStatus: "unknown", ipRisk: form.ip, complianceRisk: form.compliance, riskTags: [], sourceLinks: [], evidenceNotes: linkedNotes,
      status: form.status === "watching" ? "watching" : "candidate", lastCheckedAt: new Date().toISOString().slice(0, 10),
    };
    dispatch({ type: "upsertProductOpportunity", product });
    setForm(blank());
  }

  function seed() {
    starter.forEach((name, index) => dispatch({ type: "upsertProductOpportunity", product: { id: createId("radar"), name, category: categories[Math.min(4, Math.floor(index / 3))], markets, productRole: index < 2 ? "traffic" : index < 10 ? "profit" : "search", description: "初始候选：尚未关联模型文件或市场证据。", targetCustomer: "待验证", customerProblem: "待研究", customizationOptions: [], demandScore: 60, competitionScore: 50, profitScore: 60, shippingScore: 70, videoScore: 55, customizationScore: 60, repeatabilityScore: 60, licenseStatus: "unknown", ipRisk: "low", complianceRisk: "low", riskTags: [], sourceLinks: [], evidenceNotes: [], status: "watching", lastCheckedAt: new Date().toISOString().slice(0, 10) } }));
  }

  function move(product: ProductOpportunity, status: ProductStatus) {
    const result = transitionProduct(product, status, data.productTestRecords ?? [], data.salesTestRecords ?? [], []);
    if (!result.ok) { setNotice(result.message); return; }
    dispatch({ type: "upsertProductOpportunity", product: { ...product, status, statusHistory: [...(product.statusHistory ?? []), { status, changedAt: new Date().toISOString() }] } });
  }

  return <>
    <PageHeader title="产品研发管线" description="发现产品 → 验证需求 → 测试打印 → 测试销售 → 批准量产。" />
    <section className="radar-disclaimer"><strong>评分不是实时销量</strong><span>机会分用于排序；证据可信度用于判断这个分数有多可靠。</span></section>
    <section className="pipeline-board">
      {stages.map((stage) => <article className="pipeline-column" key={stage.status}><header><strong>{stage.label}</strong><span>{products.filter((item) => item.status === stage.status).length}</span></header><small>{stage.action}</small><div>{products.filter((item) => item.status === stage.status).sort((a, b) => calc(b) - calc(a)).slice(0, 5).map((item) => <div className="pipeline-mini-card" key={item.id}><strong>{item.name}</strong><span>{calc(item)} 分 · 可信度 {confidence(item)}%</span></div>)}</div></article>)}
    </section>

    <section className="editor-layout radar-layout">
      <form className="panel form-panel" onSubmit={save}>
        <h2>新增产品机会</h2>
        <Field label="产品名称"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="form-grid"><Field label="类别"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="阶段"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}>{stages.map((item) => <option key={item.status} value={item.status}>{item.label}</option>)}</select></Field></div>
        <div className="form-grid"><Field label="产品角色"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ProductRole })}>{[["traffic", "引流"], ["profit", "利润"], ["search", "搜索"], ["seasonal", "季节性"], ["replacement", "替换件"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="目标市场"><select multiple value={form.markets} onChange={(e) => setForm({ ...form, markets: Array.from(e.target.selectedOptions, (option) => option.value as ProductMarket) })}>{markets.map((item) => <option key={item} value={item}>{marketLabels[item]}</option>)}</select></Field></div>
        <Field label="描述"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="radar-score-fields">{(["demand", "competition", "profit", "shipping", "video", "customization", "repeatability"] as const).map((key) => <label key={key}>{key}<input type="number" min="0" max="100" value={form[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} /></label>)}</div>
        <div className="form-grid"><Field label="售价 CAD"><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field><Field label="打印小时"><input type="number" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field><Field label="材料成本"><input type="number" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} /></Field><Field label="包装成本"><input type="number" value={form.packaging} onChange={(e) => setForm({ ...form, packaging: e.target.value })} /></Field><Field label="运费补贴"><input type="number" value={form.shippingCost} onChange={(e) => setForm({ ...form, shippingCost: e.target.value })} /></Field></div>
        <div className="form-grid"><Field label="IP 风险"><select value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value as RiskLevel })}>{["low", "medium", "high", "blocked"].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="合规风险"><select value={form.compliance} onChange={(e) => setForm({ ...form, compliance: e.target.value as RiskLevel })}>{["low", "medium", "high", "blocked"].map((item) => <option key={item}>{item}</option>)}</select></Field></div>
        <h3>关联现有工作</h3>
        <div className="form-grid"><Field label="模型"><select value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })}><option value="">未关联</option>{data.models.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="项目"><select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}><option value="">未关联</option>{(data.projects ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="配色方案"><select value={form.schemeId} onChange={(e) => setForm({ ...form, schemeId: e.target.value })}><option value="">未关联</option>{data.colorSchemes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="喷涂记录"><select value={form.logId} onChange={(e) => setForm({ ...form, logId: e.target.value })}><option value="">未关联</option>{data.sprayLogs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field></div>
        <button className="button primary">创建产品机会</button>
      </form>

      <section>
        <div className="panel"><div className="filter-grid"><Field label="市场"><select value={market} onChange={(e) => setMarket(e.target.value)}><option value="all">全部</option>{markets.map((item) => <option key={item} value={item}>{marketLabels[item]}</option>)}</select></Field><Field label="快速筛选"><select value={quick} onChange={(e) => setQuick(e.target.value)}><option value="all">全部</option><option value="shipping">加拿大运输友好</option><option value="blocked">已阻塞</option></select></Field></div>{!products.length && <button className="button primary" onClick={seed}>载入 15 个初始候选</button>}</div>
        <div className="radar-product-list">{shown.map((product) => { const value = calc(product); const blocked = value === 0; const money = profit(product); const parts = breakdown(product); return <article className={`radar-product ${blocked ? "blocked" : ""}`} key={product.id}>
          <div className="card-top"><div><strong>{product.name}</strong><span className="radar-subtitle">{product.category} · {product.markets.map((marketItem) => marketLabels[marketItem]).join("、")} · {statusLabel(product.status)}</span></div><div className="radar-score"><strong>{value}</strong><span>{grade(value)}</span></div></div>
          <div className="radar-badges"><span>可信度 {confidence(product)}%</span><span>IP {product.ipRisk}</span><span>合规 {product.complianceRisk}</span></div>
          {blocked && <p className="radar-blocked">商业测试已阻止：IP 或合规风险不允许继续。</p>}
          <p>{product.description || "暂无描述"}</p>
          <div className="profit-grid"><div><span>净利润</span><strong>{money ? `CA$${money.net.toFixed(2)}` : "—"}</strong></div><div><span>净利率</span><strong>{money ? `${money.margin.toFixed(0)}%` : "—"}</strong></div><div><span>每机器小时</span><strong>{money?.hourly ? `CA$${money.hourly.toFixed(2)}` : "—"}</strong></div></div>
          <details><summary>评分解释</summary><div className="score-breakdown"><div><strong>加分</strong>{parts.additions.map(([label, amount]) => <span key={label}>+{amount.toFixed(1)} {label}</span>)}</div><div><strong>扣分</strong>{parts.deductions.filter((item) => item[1] > 0).map(([label, amount]) => <span key={label}>-{amount} {label}</span>)}{!parts.deductions.some((item) => item[1] > 0) && <span>无风险扣分</span>}</div></div></details>
          <details><summary>关联与证据</summary>{product.evidenceNotes.map((note) => <p key={note}>{note}</p>)}<p>最后检查：{product.lastCheckedAt || "未记录"}</p></details>
          <div className="button-row"><Link className="button ghost" to={`/product-radar/${product.id}`}>产品详情</Link><button className="button ghost" disabled={blocked} onClick={() => move(product, "test-print")}>进入测试打印</button><button className="button ghost" disabled={blocked} onClick={() => move(product, "test-selling")}>进入测试销售</button><button className="button danger" onClick={() => move(product, "rejected")}>淘汰</button><ConfirmDelete onConfirm={() => dispatch({ type: "deleteProductOpportunity", id: product.id })} /></div>
        </article>; })}</div>
      </section>
    </section>
  </>;
}
