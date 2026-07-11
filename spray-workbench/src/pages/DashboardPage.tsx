import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import type { ProductOpportunity } from "../types/workbench";

function score(product: ProductOpportunity) {
  if (product.ipRisk === "blocked" || product.complianceRisk === "blocked") return 0;
  const base = product.demandScore * .2 + product.profitScore * .2 + product.shippingScore * .15 + product.customizationScore * .15 + (100 - product.competitionScore) * .1 + product.videoScore * .1 + product.repeatabilityScore * .1;
  const penalty = (product.ipRisk === "medium" ? 10 : product.ipRisk === "high" ? 30 : 0) + (product.complianceRisk === "medium" ? 10 : product.complianceRisk === "high" ? 25 : 0);
  return Math.round(Math.max(0, Math.min(100, base - penalty)));
}

function nextAction(product: ProductOpportunity) {
  if (!product.printTimeHours || !product.materialCostCad) return "完成测试打印并录入成本";
  if (!product.sellingPriceCad) return "设置测试售价";
  if (product.status === "candidate" || product.status === "watching") return "推进到测试打印";
  if (product.status === "test-print") return "完成包装与上架准备";
  if (product.status === "test-selling") return "录入曝光、订单与退货数据";
  return "复核产品表现";
}

export function DashboardPage() {
  const { data, source } = useWorkbench();
  const products = data.productOpportunities ?? [];
  const activeProducts = products.filter((item) => !["approved", "rejected"].includes(item.status));
  const priority = [...activeProducts].sort((a, b) => score(b) - score(a)).slice(0, 3);
  const blocked = products.filter((item) => score(item) === 0);
  const testing = products.filter((item) => ["test-print", "test-selling"].includes(item.status));

  return (
    <>
      <PageHeader title="今日工作台" description="从选品、模型、打印测试到喷涂与销售验证，集中显示下一步行动。" />
      <section className="stat-grid dashboard-stat-grid">
        <div className="stat"><span>产品机会</span><strong>{products.length}</strong></div>
        <div className="stat"><span>验证中</span><strong>{activeProducts.length}</strong></div>
        <div className="stat"><span>风险待处理</span><strong>{blocked.length}</strong></div>
        <div className="stat"><span>测试阶段</span><strong>{testing.length}</strong></div>
      </section>

      <section className="panel dashboard-priority-panel">
        <div className="section-heading-row"><div><h2>今日优先事项</h2><p className="muted">按机会得分排序，并优先暴露成本和测试缺口。</p></div><Link className="button primary" to="/product-radar">打开产品管线</Link></div>
        {priority.length === 0 ? <div className="empty-state">还没有产品机会。先进入产品雷达添加候选。</div> : (
          <div className="priority-grid">
            {priority.map((product, index) => (
              <article className="priority-card" key={product.id}>
                <div className="priority-index">{index + 1}</div>
                <div><strong>{product.name}</strong><span>{product.category} · {product.status}</span><p>{nextAction(product)}</p></div>
                <div className="priority-score"><strong>{score(product)}</strong><span>机会分</span></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-two-column">
        <section className="panel">
          <div className="section-heading-row"><h2>阻塞与风险</h2><span className="count-badge">{blocked.length}</span></div>
          {blocked.slice(0, 6).map((product) => <article className="compact-action-card" key={product.id}><strong>{product.name}</strong><span>{nextAction(product)}</span></article>)}
          {!blocked.length && <p className="muted">暂无 IP 或合规阻塞。</p>}
        </section>
        <section className="panel">
          <div className="section-heading-row"><h2>正在测试</h2><span className="count-badge">{testing.length}</span></div>
          {testing.slice(0, 6).map((product) => <article className="compact-action-card" key={product.id}><strong>{product.name}</strong><span>{product.status === "test-print" ? "测试打印中" : "测试销售中"}</span></article>)}
          {!testing.length && <p className="muted">暂无产品处于测试阶段。</p>}
        </section>
      </section>

      <section className="panel">
        <h2>快速进入</h2>
        <div className="quick-links dashboard-quick-links">
          <Link to="/product-radar">新增产品机会</Link><Link to="/models">关联模型文件</Link><Link to="/projects">建立制作项目</Link><Link to="/schemes">设计配色</Link><Link to="/logs">记录喷涂</Link><Link to="/data">查看数据</Link>
        </div>
      </section>

      <section className="panel compact-panel">
        <h2>系统状态</h2>
        <p className="muted">模型资产 {data.modelAssets?.length ?? 0} · 项目 {data.projects?.length ?? 0} · 配色方案 {data.colorSchemes.length} · 喷涂记录 {data.sprayLogs.length}</p>
        <p className="muted">数据来源：{source === "localStorage" ? "浏览器本地自动保存" : "示例数据"}</p>
      </section>
    </>
  );
}
