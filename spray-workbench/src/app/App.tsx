import { lazy, Suspense } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { Beaker, Boxes, Briefcase, Brush, ClipboardCheck, Database, Gauge, Layers3, Palette, Radar, SwatchBook } from "lucide-react";
import { DashboardPage } from "../pages/DashboardPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { ColorsPage } from "../pages/ColorsPage";
import { ColorSchemesPage } from "../pages/ColorSchemesPage";
import { SprayLogsPage } from "../pages/SprayLogsPage";
import { ColorPreviewPage } from "../pages/ColorPreviewPage";
import { ColorLabPage } from "../pages/ColorLabPage";
import { DataPage } from "../pages/DataPage";
import { ProductRadarPage } from "../pages/ProductRadarPage";
import { ProductDetailPage } from "../pages/ProductDetailPage";
import { SprayReviewsPage } from "../pages/SprayReviewsPage";
import { useWorkbench } from "../state/WorkbenchProvider";

const ModelAssetsPage = lazy(() =>
  import("../pages/ModelAssetsPage").then((module) => ({ default: module.ModelAssetsPage })),
);

const navItems = [
  { to: "/", label: "今日工作台", icon: Gauge },
  { to: "/product-radar", label: "产品研发管线", icon: Radar },
  { to: "/projects", label: "项目中心", icon: Briefcase },
  { to: "/models", label: "模型管理", icon: Boxes },
  { to: "/colors", label: "颜色管理", icon: Palette },
  { to: "/schemes", label: "配色方案", icon: SwatchBook },
  { to: "/color-lab", label: "配色实验室", icon: Beaker },
  { to: "/logs", label: "喷涂记录", icon: Brush },
  { to: "/reviews", label: "喷涂复盘", icon: ClipboardCheck },
  { to: "/preview", label: "颜色预览", icon: Layers3 },
  { to: "/data", label: "数据管理", icon: Database },
];

function ModelsRoute() {
  return (
    <Suspense fallback={<div className="lazy-loading"><div className="spinner" /><span>正在加载模型管理...</span></div>}>
      <ModelAssetsPage />
    </Suspense>
  );
}

export function App() {
  const { notice, setNotice } = useWorkbench();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">PL</span>
          <div>
            <strong>3D 商品研发台</strong>
            <small>PrintLab Workbench</small>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="main-panel">
        {notice && (
          <div className="notice">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(undefined)}>知道了</button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/models" element={<ModelsRoute />} />
          <Route path="/model-assets" element={<Navigate to="/models" replace />} />
          <Route path="/colors" element={<ColorsPage />} />
          <Route path="/schemes" element={<ColorSchemesPage />} />
          <Route path="/color-lab" element={<ColorLabPage />} />
          <Route path="/logs" element={<SprayLogsPage />} />
          <Route path="/reviews" element={<SprayReviewsPage />} />
          <Route path="/preview" element={<ColorPreviewPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/product-radar" element={<ProductRadarPage />} />
          <Route path="/product-radar/:productId" element={<ProductDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
