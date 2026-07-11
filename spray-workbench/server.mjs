import express from "express";
import cors from "cors";
import { readdir, readFile, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { createServer } from "node:http";
import { createAdapters } from "./server/trend-sources/index.mjs";
import { browserStatus, capture, detectSource, launch, open, screenshot, stop } from "./server/browser-capture.mjs";

const PORT = process.env.LOCAL_SERVER_PORT ? Number(process.env.LOCAL_SERVER_PORT) : 3456;
const MODEL_ROOT = resolve(process.env.LOCAL_MODEL_ROOT ?? "F:/3D打印手办文件");

const SUPPORTED_MODEL_EXTS = new Set([".glb", ".gltf"]);
const COVER_NAMES = new Set(["cover.jpg", "cover.png", "cover.webp", "thumbnail.jpg", "thumbnail.png"]);
const TREND_DB = resolve(".trend-radar.json");
let trendState = { items: [], settings: { enabledSources: {}, keywords: ["收纳", "桌面", "礼品"], excludedKeywords: [], categories: [], minScore: 50, autoSearch: false, intervalMinutes: 60, maxResultsPerSource: 20 }, sources: [], lastSuccessfulSearchAt: null, searchLog: [] };
try { trendState = { ...trendState, ...JSON.parse(await readFile(TREND_DB, "utf-8")) }; } catch { /* initialize on first save */ }
const saveTrendState = async () => { const temp = `${TREND_DB}.tmp`; await writeFile(temp, JSON.stringify(trendState, null, 2)); await rename(temp, TREND_DB); };
const pendingCaptures = new Map();
const normalizeTitle = (value = "") => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const validItem = (item) => { const errors = []; if (!item.title?.trim()) errors.push("缺少标题"); if (!item.source?.trim()) errors.push("缺少来源"); try { const url = new URL(item.url); if (!/^https?:$/.test(url.protocol)) errors.push("商品链接必须是 http 或 https"); } catch { errors.push("商品链接无效"); } return errors; };
function importCapture(capture, selectedIndexes = [], edits = {}) { const errors = []; let imported = 0; let skipped = 0; const now = new Date().toISOString(); for (const index of selectedIndexes) { const raw = { ...capture.items[index], ...(edits[index] ?? {}) }; const validation = validItem(raw); if (validation.length) { errors.push({ index, message: validation.join("；") }); continue; } const title = raw.title.trim(); const existing = trendState.items.find((item) => item.sources?.some((source) => source.url === raw.url) || (normalizeTitle(item.title) === normalizeTitle(title) && item.sources?.some((source) => source.platform === raw.source))); if (existing) { existing.lastSeenAt = now; if (!existing.sources.some((source) => source.url === raw.url)) existing.sources.push({ platform: raw.source, url: raw.url, discoveredAt: now, price: raw.price, currency: raw.currency, views: raw.views, likes: raw.likes, reviews: raw.reviews }); skipped += 1; continue; } trendState.items.push({ id: randomUUID(), title, normalizedTitle: normalizeTitle(title), description: raw.description, imageUrl: raw.imageUrl, sources: [{ platform: raw.source, url: raw.url, externalId: raw.externalId, discoveredAt: now, price: raw.price, currency: raw.currency, views: raw.views, likes: raw.likes, reviews: raw.reviews }], category: raw.category, keywords: raw.keywords ?? [], heatScore: undefined, competitionScore: undefined, printabilityScore: undefined, profitScore: undefined, totalScore: undefined, recommendation: "watch", status: "new", ipRisk: "unknown", matchedModelAssetIds: [], firstSeenAt: now, lastSeenAt: now }); imported += 1; } return { imported, skipped, errors }; }

async function scanModels() {
  const results = [];
  try {
    const entries = await readdir(MODEL_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirPath = join(MODEL_ROOT, entry.name);
      const dirName = entry.name;
      try {
        const files = await readdir(dirPath);
        let coverFile = null;
        let modelFile = null;
        let infoData = null;

        for (const file of files) {
          const lower = file.toLowerCase();
          if (COVER_NAMES.has(lower)) coverFile = file;
          else if (file === "info.json") {
            try {
              const raw = await readFile(join(dirPath, file), "utf-8");
              infoData = JSON.parse(raw);
            } catch { /* ignore bad info.json */ }
          } else {
            const ext = lower.substring(lower.lastIndexOf("."));
            if (SUPPORTED_MODEL_EXTS.has(ext)) modelFile = file;
          }
        }

        results.push({
          folderName: dirName,
          name: infoData?.name ?? dirName,
          brand: infoData?.brand ?? "",
          series: infoData?.series ?? "",
          scale: infoData?.scale ?? "",
          status: infoData?.status ?? "unknown",
          tags: Array.isArray(infoData?.tags) ? infoData.tags : [],
          note: infoData?.note ?? infoData?.notes ?? "",
          coverUrl: coverFile ? `/local-assets/${dirName}/${coverFile}` : null,
          modelUrl: modelFile ? `/local-assets/${dirName}/${modelFile}` : null,
          modelExt: modelFile ? modelFile.split(".").pop()?.toLowerCase() : null,
        });
      } catch { /* skip inaccessible folders */ }
    }
  } catch (err) {
    console.error("Failed to scan model directory:", err.message);
  }
  return results;
}

const app = express();
app.use(cors({ origin: [/^http:\/\/localhost(?::\d+)?$/, /^http:\/\/127\.0\.0\.1(?::\d+)?$/] }));
app.use(express.json({ limit: "1mb" }));

// API: list models
app.get("/api/local-models", async (_req, res) => {
  try {
    const models = await scanModels();
    res.json({ ok: true, models });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/trend-radar/results", (_req, res) => res.json({ ok: true, ...trendState }));
app.get("/api/trend-radar/sources", (_req, res) => res.json({ ok: true, sources: createAdapters(trendState.settings.enabledSources).map(({ id, name, enabled }) => ({ id, name, enabled })) }));
app.put("/api/trend-radar/settings", async (req, res) => { trendState.settings = { ...trendState.settings, ...req.body }; await saveTrendState(); res.json({ ok: true, settings: trendState.settings }); });
app.post("/api/trend-radar/search", async (req, res) => {
  const query = req.body?.query ?? trendState.settings.keywords.join(" "); const adapters = createAdapters(trendState.settings.enabledSources).filter((source) => source.enabled);
  const results = await Promise.all(adapters.map(async (source) => ({ source: source.id, ...(await source.search({ query })) })));
  trendState.sources = results.map(({ source, error, items }) => ({ source, ok: !error, error, count: items.length, checkedAt: new Date().toISOString() }));
  trendState.searchLog = [{ query, at: new Date().toISOString(), sourceCount: results.length }, ...trendState.searchLog].slice(0, 30); trendState.lastSuccessfulSearchAt = new Date().toISOString(); await saveTrendState(); res.json({ ok: true, ...trendState });
});
app.post("/api/trend-radar/items/:id/status", async (req, res) => { const item = trendState.items.find((entry) => entry.id === req.params.id); if (!item) return res.status(404).json({ ok: false, error: "未找到趋势项目" }); item.status = req.body?.status ?? item.status; item.note = req.body?.note ?? item.note; await saveTrendState(); res.json({ ok: true, item }); });

app.get("/api/browser/status", (_req, res) => res.json({ ok: true, ...browserStatus() }));
app.post("/api/browser/launch", async (_req, res) => { try { res.json({ ok: true, ...(await launch()) }); } catch (error) { res.status(500).json({ ok: false, error: `无法启动 Chromium：${error.message}。请运行 npx playwright install chromium。` }); } });
app.post("/api/browser/open", async (req, res) => { try { res.json({ ok: true, ...(await open(req.body?.url, req.body?.source || detectSource(req.body?.url))) }); } catch (error) { res.status(400).json({ ok: false, error: error.message }); } });
async function captureResponse(req, res, scroll) { try { const result = await capture(scroll ? req.body : {}); const captureId = randomUUID(); const state = browserStatus(); pendingCaptures.set(captureId, { id: captureId, source: state.source, url: state.url, pageTitle: state.title, capturedAt: new Date().toISOString(), items: result.items.map((item) => ({ ...item, source: state.source })), warnings: result.warnings }); res.json({ ok: true, captureId, itemCount: result.items.length, warnings: result.warnings, url: state.url, pageTitle: state.title }); } catch (error) { res.status(400).json({ ok: false, error: error.message }); } }
app.post("/api/browser/capture", (req, res) => captureResponse(req, res, false));
app.post("/api/browser/scroll-capture", (req, res) => captureResponse(req, res, true));
app.get("/api/browser/captures/:id", (req, res) => { const capture = pendingCaptures.get(req.params.id); if (!capture) return res.status(404).json({ ok: false, error: "抓取会话不存在或已取消" }); res.json({ ok: true, capture, validation: capture.items.map(validItem) }); });
app.post("/api/browser/captures/:id/import", async (req, res) => { const capture = pendingCaptures.get(req.params.id); if (!capture) return res.status(404).json({ ok: false, error: "抓取会话不存在或已取消" }); const result = importCapture(capture, req.body?.selectedIndexes ?? [], req.body?.edits ?? {}); await saveTrendState(); if (!result.errors.length) pendingCaptures.delete(req.params.id); res.json({ ok: true, ...result }); });
app.delete("/api/browser/captures/:id", (req, res) => { pendingCaptures.delete(req.params.id); res.json({ ok: true }); });
app.post("/api/browser/stop", async (_req, res) => res.json({ ok: true, ...(await stop()) }));
app.get("/api/browser/screenshot", async (_req, res) => { try { res.type("png").send(await screenshot()); } catch (error) { res.status(400).json({ ok: false, error: error.message }); } });

// Static: serve model assets
app.use("/local-assets", express.static(MODEL_ROOT));

createServer(app).listen(PORT, "127.0.0.1", () => {
  console.log(`Local model server running at http://localhost:${PORT}`);
  console.log(`Serving models from: ${MODEL_ROOT}`);
});
