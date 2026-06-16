import { NavLink, Route, Routes } from "react-router-dom";
import { Boxes, Brush, Database, Gauge, Layers3, Palette, SwatchBook } from "lucide-react";
import { DashboardPage } from "../pages/DashboardPage";
import { ModelsPage } from "../pages/ModelsPage";
import { ColorsPage } from "../pages/ColorsPage";
import { ColorSchemesPage } from "../pages/ColorSchemesPage";
import { SprayLogsPage } from "../pages/SprayLogsPage";
import { ColorPreviewPage } from "../pages/ColorPreviewPage";
import { DataPage } from "../pages/DataPage";
import { useWorkbench } from "../state/WorkbenchProvider";

const navItems = [
  { to: "/", label: "仪表盘", icon: Gauge },
  { to: "/models", label: "模型管理", icon: Boxes },
  { to: "/colors", label: "颜色管理", icon: Palette },
  { to: "/schemes", label: "配色方案", icon: SwatchBook },
  { to: "/logs", label: "喷涂记录", icon: Brush },
  { to: "/preview", label: "颜色预览", icon: Layers3 },
  { to: "/data", label: "数据管理", icon: Database },
];

export function App() {
  const { notice, setNotice } = useWorkbench();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">SW</span>
          <div>
            <strong>喷涂工作台</strong>
            <small>Spray Workbench</small>
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
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/colors" element={<ColorsPage />} />
          <Route path="/schemes" element={<ColorSchemesPage />} />
          <Route path="/logs" element={<SprayLogsPage />} />
          <Route path="/preview" element={<ColorPreviewPage />} />
          <Route path="/data" element={<DataPage />} />
        </Routes>
      </main>
    </div>
  );
}
