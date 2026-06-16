import { Link } from "react-router-dom";
import { ImagePreview } from "../components/ui/ImagePreview";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import { formatDate } from "../utils/dates";

export function DashboardPage() {
  const { data, source } = useWorkbench();
  const recentLogs = [...data.sprayLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const galleryItems = [
    ...data.models.filter((model) => model.imageUrl).map((model) => ({ id: model.id, title: model.name, url: model.imageUrl!, source: "模型图片" })),
    ...data.sprayLogs.flatMap((log) => log.imageUrls.map((url, index) => ({ id: `${log.id}-${index}`, title: log.title, url, source: "喷涂记录" }))),
  ].slice(0, 8);

  return (
    <>
      <PageHeader title="仪表盘" description="查看喷涂项目、颜色资产、最近记录和成品图库。" />
      <section className="stat-grid">
        <div className="stat"><span>模型</span><strong>{data.models.length}</strong></div>
        <div className="stat"><span>颜色</span><strong>{data.paints.length}</strong></div>
        <div className="stat"><span>配色方案</span><strong>{data.colorSchemes.length}</strong></div>
        <div className="stat"><span>喷涂记录</span><strong>{data.sprayLogs.length}</strong></div>
      </section>
      <section className="panel">
        <h2>快速入口</h2>
        <div className="quick-links">
          <Link to="/models">新增模型</Link>
          <Link to="/colors">管理颜色</Link>
          <Link to="/schemes">整理配色方案</Link>
          <Link to="/logs">记录喷涂步骤</Link>
          <Link to="/preview">打开颜色预览</Link>
        </div>
      </section>
      <section className="panel">
        <h2>成品图库</h2>
        {galleryItems.length === 0 ? (
          <p className="muted">还没有图片。给模型或喷涂记录添加图片 URL 后，这里会自动展示预览。</p>
        ) : (
          <div className="gallery-grid">
            {galleryItems.map((item) => (
              <article className="gallery-card" key={item.id}>
                <ImagePreview url={item.url} alt={item.title} />
                <strong>{item.title}</strong>
                <span>{item.source}</span>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="panel">
        <h2>最近喷涂记录</h2>
        {recentLogs.length === 0 ? (
          <p className="muted">还没有喷涂记录，可以从“喷涂记录”页面新增第一条。</p>
        ) : (
          <div className="item-list">
            {recentLogs.map((log) => {
              const model = data.models.find((item) => item.id === log.modelId);
              return (
                <article className="list-card" key={log.id}>
                  <strong>{log.title}</strong>
                  <span>{model?.name ?? "未关联模型"} · {formatDate(log.date)} · {log.steps.length} 个步骤</span>
                  <p>{log.resultNotes || "暂无结果备注"}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section className="panel compact-panel">
        <h2>数据状态</h2>
        <p className="muted">当前数据来源：{source === "localStorage" ? "浏览器本地自动保存" : "示例数据"}</p>
        <p className="muted">最后更新时间：{formatDate(data.updatedAt)}</p>
      </section>
    </>
  );
}
