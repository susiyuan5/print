import { Link } from "react-router-dom";
import { ImagePreview } from "../components/ui/ImagePreview";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import { formatDate } from "../utils/dates";

const activeStatuses = new Set(["planned", "in_progress", "painting", "reviewing"]);

export function DashboardPage() {
  const { data, source } = useWorkbench();
  const projects = data.projects ?? [];
  const images = data.workshopImages ?? [];
  const recentProject = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const activeProjects = projects.filter((project) => activeStatuses.has(project.status)).slice(0, 4);
  const galleryItems = [
    ...images.map((image) => ({ id: image.id, title: image.title || "项目图片", url: image.dataUrl, source: "项目图片" })),
    ...data.models.filter((model) => model.imageUrl).map((model) => ({ id: model.id, title: model.name, url: model.imageUrl!, source: "模型图片" })),
    ...data.sprayLogs.flatMap((log) => log.imageUrls.map((url, index) => ({ id: `${log.id}-${index}`, title: log.title, url, source: "喷涂记录" }))),
  ].slice(0, 8);

  return (
    <>
      <PageHeader title="喷涂数字工作台" description="以项目为中心，管理模型、配色、记录、图片和预览画布。" />
      <section className="stat-grid">
        <div className="stat"><span>项目</span><strong>{projects.length}</strong></div>
        <div className="stat"><span>模型</span><strong>{data.models.length}</strong></div>
        <div className="stat"><span>颜色</span><strong>{data.paints.length}</strong></div>
        <div className="stat"><span>喷涂记录</span><strong>{data.sprayLogs.length}</strong></div>
      </section>
      <section className="panel hero-panel">
        <h2>继续上次项目</h2>
        {recentProject ? (
          <>
            <strong>{recentProject.name}</strong>
            <p>{recentProject.goal || "暂无目标风格"}</p>
            <span className="muted">最后更新：{formatDate(recentProject.updatedAt)}</span>
            <div className="button-row"><Link className="button primary" to="/projects">打开项目中心</Link><Link className="button ghost" to="/logs">记录喷涂</Link></div>
          </>
        ) : (
          <div className="button-row"><span className="muted">还没有项目。</span><Link className="button primary" to="/projects">新建项目</Link></div>
        )}
      </section>
      <section className="panel">
        <h2>快速新建</h2>
        <div className="quick-links">
          <Link to="/projects">新建项目</Link>
          <Link to="/models">新建模型</Link>
          <Link to="/colors">新建颜色</Link>
          <Link to="/logs">新建喷涂记录</Link>
          <Link to="/schemes">新建配色方案</Link>
        </div>
      </section>
      <section className="panel">
        <h2>进行中项目</h2>
        {activeProjects.length === 0 ? <p className="muted">暂无进行中的项目。</p> : (
          <div className="item-list">
            {activeProjects.map((project) => {
              const model = data.models.find((item) => item.id === project.modelId);
              return (
                <article className="list-card" key={project.id}>
                  <strong>{project.name}</strong>
                  <span>{model?.name ?? "未关联模型"} · {project.styleKeywords.join("，") || "未填写关键词"}</span>
                  <p>{project.notes || project.goal || "暂无备注"}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section className="panel">
        <h2>最近项目图片</h2>
        {galleryItems.length === 0 ? <p className="muted">上传项目图片后，这里会显示最近图片。</p> : (
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
      <section className="panel compact-panel">
        <h2>数据状态</h2>
        <p className="muted">当前数据来源：{source === "localStorage" ? "浏览器本地自动保存" : "示例数据"}</p>
        <p className="muted">最后更新时间：{formatDate(data.updatedAt)}</p>
      </section>
    </>
  );
}
