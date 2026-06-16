# Spray Workbench 喷涂工作台

Spray Workbench 是一个静态部署的中文喷涂工作台 MVP，用于管理模型、颜色、配色方案、喷涂记录，并提供可截图的 2D 模型轮廓颜色预览。

## 运行

```bash
cd spray-workbench
npm install
npm run dev
```

## 构建

```bash
cd spray-workbench
npm run build
```

本地预览生产构建：

```bash
cd spray-workbench
npm run preview
```

## 数据管理

- 日常编辑会自动保存到浏览器 localStorage。
- localStorage 键名是 `spray-workbench:data:v1`。
- “数据管理”页面支持导入 JSON、导出 JSON、重置示例数据。
- JSON 文件适合长期备份，也可以手动提交到 GitHub 仓库保存历史。

## GitHub Pages 部署

1. 将仓库推送到 GitHub。
2. 在仓库 Settings → Pages 中，把 Source 设为 GitHub Actions。
3. 推送 `main` 或 `master` 分支后，`.github/workflows/deploy.yml` 会自动构建并部署。
4. 当前 Vite `base` 默认为 `/spray-workbench/`，适合项目站点。

如果仓库是 `username.github.io` 这种用户站点，请把 `vite.config.ts` 里的 `base` 改成 `/`，并把 `src/main.tsx` 里的 `BrowserRouter basename` 改成 `/` 或移除。

## MVP 已包含

- 模型新增、编辑、删除。
- 颜色新增、编辑、删除。
- 配色方案新增、编辑、删除，并引用颜色。
- 喷涂记录新增、编辑、删除，并关联模型。
- 颜色预览支持车辆、飞行器、机器人、零件四种 2D 轮廓。
- localStorage 自动保存。
- JSON 导入、导出和示例数据重置。
- GitHub Pages Actions 部署配置。
