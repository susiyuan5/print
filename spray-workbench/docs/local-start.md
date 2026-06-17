# 喷涂工作台 — 本地启动指南

## 快速启动

双击项目根目录下的 **`start-local.bat`** 即可一键启动所有服务。

- 后端（Express 文件服务器）：http://localhost:3456
- 前端（Vite 开发服务器）：http://localhost:5173/print/

启动后浏览器会自动打开 `http://localhost:5173/print/models` 进入模型画廊。

如需停止服务，**直接关闭 start-local.bat 的命令窗口**即可。也可以双击 `stop-local.bat` 强制结束所有 node 进程。

---

## 创建桌面快捷方式

1. 右键桌面 → **新建 → 快捷方式**
2. 对象位置填入：

   ```
   C:\Users\Administrator\Documents\喷涂\spray-workbench\start-local.bat
   ```

3. 名称：`喷涂工作台`
4. 完成

可选：右键快捷方式 → 属性 → 更改图标 → 选择一个喜欢的图标。

---

## 模型文件夹结构

在 `F:\print\` 下按照项目约定的目录结构组织模型文件：

```
F:\print\
  RX-78-2\              ← 模型名称（文件夹名）
    cover.jpg            ← 封面图（优先显示）
    model.glb            ← 3D 模型文件
    info.json            ← 可选元数据

  Porsche-911\
    cover.png
    model.glb
    info.json
```

### info.json 格式（可选）

```json
{
  "name": "RX-78-2 高达",
  "brand": "万代",
  "series": "HG",
  "scale": "1/144",
  "status": "制作中",
  "tags": ["白蓝红", "练习件"],
  "note": "计划测试低饱和白色和轻微旧化。"
}
```

> 状态可选值：`planned` / `in_progress` / `painting` / `painted` / `finished` / `archived`

---

## 常见问题

### 端口被占用

如果 3456 或 5173 端口已被其他程序占用：

1. 打开 `spray-workbench\.env.local`，临时修改 `LOCAL_SERVER_PORT` 到其他端口（如 3457）
2. 同时在 `vite.config.ts` 中更新 proxy 目标地址
3. 或在 `stop-local.bat` 中结束现有 node 进程后再启动

### F:\print 不存在

脚本会自动创建 `F:\print`。如果无法创建（权限不足），请手动创建该文件夹或修改 `.env.local` 中的 `LOCAL_MODEL_ROOT` 指向已有目录。

### npm 未安装依赖

脚本会自动运行 `npm install`。如果网络较慢或失败，可以先手动打开终端执行：

```bash
cd C:\Users\Administrator\Documents\喷涂\spray-workbench
npm install
```

### GitHub Pages 静态版本

本项目的静态版本部署在 GitHub Pages，不需要启动本地服务：

```bash
npm run build
```

构建产物在 `dist/` 目录，由 GitHub Actions 自动发布。静态版本只能使用浏览器本地数据模式（无本地模型仓库功能）。

### 切换回 D:/SprayModels

如需切换模型仓库目录，编辑 `.env.local`：

```
LOCAL_MODEL_ROOT=D:/SprayModels
```

或自定义其他路径。

---

## 项目结构

```
spray-workbench/
  server.mjs              ← Express 本地后端（文件扫描 + API + 静态服务）
  start-local.bat         ← 一键启动脚本
  stop-local.bat          ← 停止服务脚本
  .env.local              ← 本地配置（模型目录路径）
  vite.config.ts          ← Vite 配置（含 API 代理）
  src/
    pages/
      ModelsPage.tsx       ← 模型画廊页面（本地 / 浏览器双模式）
    utils/
      localModelLibrary.ts ← 本地模型仓库工具（FSAA）
      modelLibraryDb.ts    ← IndexedDB 目录句柄持久化
```
