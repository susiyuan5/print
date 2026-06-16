# Spray Workbench 喷涂工作台

Spray Workbench 是一个可部署到 GitHub Pages 的中文喷涂工作台，用于管理模型、颜色、配色方案、喷涂记录，并提供可截图的 2D 模型轮廓颜色预览。

## 运行

```bash
cd spray-workbench
npm install
npm run dev
```

如果 Windows PowerShell 拦截 `npm.ps1`，可以使用：

```bash
npm.cmd install
npm.cmd run dev
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
- 新版本保留旧的 `ratio` 文本字段，并新增可选的百分比字段，旧数据可以继续导入。

## GitHub Pages 部署

目标站点地址：

```text
https://susiyuan5.github.io/print/
```

部署步骤：

1. 将仓库推送到 GitHub。
2. 在仓库 `Settings -> Pages` 中，把 Source 设为 `GitHub Actions`。
3. 推送 `main` 分支后，根目录 `.github/workflows/deploy.yml` 会自动构建并部署。
4. 当前 Vite `base` 为 `/print/`，React Router 的 `basename` 也为 `/print`。

如果仓库是 `username.github.io` 这种用户站点，请把 `vite.config.ts` 里的 `base` 改成 `/`，并把 `src/main.tsx` 里的 `BrowserRouter basename` 改成 `/` 或移除。

## 已包含功能

- 模型新增、编辑、删除，并支持图片 URL 预览。
- 颜色新增、编辑、删除。
- 配色方案新增、编辑、删除，支持引用颜色、百分比比例、比例总和检查和混合色预览。
- 喷涂记录新增、编辑、删除，支持关联模型、多步骤、步骤排序、图片 URL 预览。
- 喷涂步骤支持层类型、颜色、比例、气压、稀释剂、技巧、备注。
- 喷涂步骤支持一键套用常用参数模板。
- 仪表盘包含成品图库，聚合模型和喷涂记录中的图片 URL。
- 颜色预览支持车辆、飞行器、机器人、零件四种 2D 轮廓。
- localStorage 自动保存。
- JSON 导入、导出和示例数据重置。
- GitHub Pages Actions 部署配置。
