import express from "express";
import cors from "cors";
import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { createServer } from "node:http";
import { createAdapters } from "./server/trend-sources/index.mjs";
import { browserStatus, capture, detectSource, launch, open, screenshot, stop, validateUrl } from "./server/browser-capture.mjs";
import { canonicalUrl, findDuplicate, matchModels, mergeInto, normalizeText } from "./server/trend-core.mjs";
import { readJson, writeAtomicJson } from "./server/atomic-json.mjs";
import { isChromeExtensionOrigin, normalizeExtensionCapture } from "./server/extension-capture.mjs";

const PORT = process.env.LOCAL_SERVER_PORT ? Number(process.env.LOCAL_SERVER_PORT) : 3456;
const MODEL_ROOT = resolve(process.env.LOCAL_MODEL_ROOT ?? "F:/3D打印手办文件");

const SUPPORTED_MODEL_EXTS = new Set([".glb", ".gltf"]);
const COVER_NAMES = new Set(["cover.jpg", "cover.png", "cover.webp", "thumbnail.jpg", "thumbnail.png"]);
const TREND_DB = resolve(".trend-radar.json");
const initialTrendState = { items: [], pendingCaptures: [], duplicateReviews: [], captureHistory: [], blockedKeywords: [], settings: { enabledSources: {}, keywords: ["收纳", "桌面", "礼品"], excludedKeywords: [], categories: [], minScore: 50, autoSearch: false, intervalMinutes: 60, maxResultsPerSource: 20, modelMatchThreshold: 25 }, sources: [], lastSuccessfulSearchAt: null, searchLog: [] };
let trendState = await readJson(TREND_DB, initialTrendState);
trendState.pendingCaptures ??= []; trendState.duplicateReviews ??= []; trendState.captureHistory ??= []; trendState.blockedKeywords ??= [];
const saveTrendState = () => writeAtomicJson(TREND_DB, trendState);
const captureById = (id) => trendState.pendingCaptures.find((capture) => capture.id === id);
const addPendingCapture = async (record) => { const captureId = randomUUID(); const capture = { ...record, id: captureId }; trendState.pendingCaptures.push(capture); trendState.captureHistory.unshift({ id: captureId, source: capture.source, url: capture.url, capturedAt: capture.capturedAt, rawItemCount: capture.items.length, importedItemCount: 0, warnings: capture.warnings }); await saveTrendState(); return capture; };
const validItem = (item) => { const errors = []; if (!item.title?.trim()) errors.push("缺少标题"); if (!item.source?.trim()) errors.push("缺少来源"); if (!validateUrl(item.url)) errors.push("商品链接必须是公网 http 或 https"); return errors; };
function importCapture(capture, selectedIndexes = [], edits = {}, forceSeparate = false) { const errors = []; let imported = 0; let skipped = 0; let reviews = 0; const now = new Date().toISOString(); for (const index of selectedIndexes) { const raw = { ...capture.items[index], ...(edits[index] ?? {}) }; const validation = validItem(raw); if (validation.length) { errors.push({ index, message: validation.join("；") }); continue; } const title = raw.title.trim(); const duplicate = forceSeparate ? undefined : findDuplicate(raw, trendState.items); if (duplicate?.confidence === "high") { mergeInto(duplicate.item, raw, now); skipped += 1; continue; } if (duplicate?.confidence === "medium") { trendState.duplicateReviews.push({ id: randomUUID(), raw, existingItemId: duplicate.item.id, score: duplicate.score, reasons: duplicate.reasons, status: "pending", createdAt: now }); reviews += 1; continue; } trendState.items.push({ id: randomUUID(), title, normalizedTitle: normalizeText(title), description: raw.description, imageUrl: raw.imageUrl, images: raw.imageUrl ? [{ url: raw.imageUrl, attribution: raw.attribution ?? raw.source, sourceUrl: raw.url, capturedAt: now }] : [], sources: [{ platform: raw.source, url: canonicalUrl(raw.url) || raw.url, externalId: raw.externalId, discoveredAt: now, price: raw.price, currency: raw.currency, views: raw.views, likes: raw.likes, reviews: raw.reviews }], category: raw.category, keywords: raw.keywords ?? [], heatScore: undefined, competitionScore: undefined, printabilityScore: undefined, profitScore: undefined, totalScore: undefined, recommendation: "watch", status: "new", ipRisk: "unknown", matchedModelAssetIds: [], rejectedModelAssetIds: [], firstSeenAt: now, lastSeenAt: now }); imported += 1; } return { imported, skipped, reviews, errors }; }

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
app.use(cors({ origin: (origin, callback) => { if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin) || isChromeExtensionOrigin(origin)) callback(null, true); else callback(new Error("不允许的来源")); } }));
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
async function captureResponse(req, res, scroll) { try { const result = await capture(scroll ? req.body : {}); const state = browserStatus(); const record = await addPendingCapture({ source: state.source, url: state.url, pageTitle: state.title, capturedAt: new Date().toISOString(), items: result.items.map((item) => ({ ...item, source: state.source, attribution: state.source })), warnings: result.warnings }); res.json({ ok: true, captureId: record.id, itemCount: result.items.length, warnings: result.warnings, url: state.url, pageTitle: state.title }); } catch (error) { res.status(400).json({ ok: false, error: error.message }); } }
app.post("/api/browser/capture", (req, res) => captureResponse(req, res, false));
app.post("/api/browser/scroll-capture", (req, res) => captureResponse(req, res, true));
app.post("/api/browser/extension-captures", async (req, res) => { if (!isChromeExtensionOrigin(req.get("origin"))) return res.status(403).json({ ok: false, error: "仅允许已安装的 Chrome 扩展提交抓取结果" }); try { const record = await addPendingCapture(normalizeExtensionCapture(req.body, { validateUrl, detectSource })); res.json({ ok: true, captureId: record.id, itemCount: record.items.length, warnings: record.warnings }); } catch (error) { res.status(400).json({ ok: false, error: error.message }); } });
app.get("/api/browser/captures/:id", (req, res) => { const capture = captureById(req.params.id); if (!capture) return res.status(404).json({ ok: false, error: "抓取会话不存在或已取消" }); res.json({ ok: true, capture, validation: capture.items.map(validItem) }); });
app.post("/api/browser/captures/:id/import", async (req, res) => { const capture = captureById(req.params.id); if (!capture) return res.status(404).json({ ok: false, error: "抓取会话不存在或已取消" }); const result = importCapture(capture, req.body?.selectedIndexes ?? [], req.body?.edits ?? {}); const history = trendState.captureHistory.find((entry) => entry.id === capture.id); if (history) history.importedItemCount = result.imported; if (!result.errors.length) trendState.pendingCaptures = trendState.pendingCaptures.filter((entry) => entry.id !== capture.id); await saveTrendState(); res.json({ ok: true, ...result }); });
app.delete("/api/browser/captures/:id", async (req, res) => { trendState.pendingCaptures = trendState.pendingCaptures.filter((entry) => entry.id !== req.params.id); await saveTrendState(); res.json({ ok: true }); });
app.post("/api/trend-radar/duplicates/:id/resolve", async (req,res) => { const review=trendState.duplicateReviews.find((entry)=>entry.id===req.params.id); if(!review) return res.status(404).json({ok:false,error:"重复项复核记录不存在"}); if(req.body?.action==="merge") { const target=trendState.items.find((item)=>item.id===review.existingItemId); if(target) mergeInto(target,review.raw,new Date().toISOString()); } else if(req.body?.action==="separate") { importCapture({items:[review.raw]},[0],{},true); } review.status=req.body?.action; await saveTrendState(); res.json({ok:true}); });
app.post("/api/trend-radar/items/:id/matches", async (req,res) => { const item=trendState.items.find((entry)=>entry.id===req.params.id); if(!item) return res.status(404).json({ok:false,error:"趋势项目不存在"}); item.modelMatches=matchModels(item,req.body?.assets??[],item.rejectedModelAssetIds??[],trendState.settings.modelMatchThreshold??25); await saveTrendState(); res.json({ok:true,matches:item.modelMatches}); });
app.post("/api/trend-radar/items/:id/match", async (req,res) => { const item=trendState.items.find((entry)=>entry.id===req.params.id); if(!item) return res.status(404).json({ok:false,error:"趋势项目不存在"}); item.confirmedModelAssetId=req.body?.modelAssetId; item.matchedModelAssetIds=item.confirmedModelAssetId?[item.confirmedModelAssetId]:[]; await saveTrendState(); res.json({ok:true,item}); });
app.post("/api/trend-radar/items/:id/reject-match", async (req,res) => { const item=trendState.items.find((entry)=>entry.id===req.params.id); if(!item) return res.status(404).json({ok:false,error:"趋势项目不存在"}); item.rejectedModelAssetIds=[...new Set([...(item.rejectedModelAssetIds??[]),req.body?.modelAssetId].filter(Boolean))]; if(item.confirmedModelAssetId===req.body?.modelAssetId){delete item.confirmedModelAssetId;item.matchedModelAssetIds=[];} await saveTrendState(); res.json({ok:true,item}); });
app.post("/api/trend-radar/items/:id/convert", async (req,res) => { const item=trendState.items.find((entry)=>entry.id===req.params.id); if(!item) return res.status(404).json({ok:false,error:"趋势项目不存在"}); if(item.status==="converted"||item.conversionProductId) return res.status(409).json({ok:false,error:"该趋势项目已经加入生产"}); item.status=req.body?.modelAssetId?"converted":"preparing"; item.confirmedModelAssetId=req.body?.modelAssetId; item.conversionProductId=req.body?.productId; item.designItMyself=!req.body?.modelAssetId; await saveTrendState(); res.json({ok:true,item}); });
app.post("/api/browser/stop", async (_req, res) => res.json({ ok: true, ...(await stop()) }));
app.get("/api/browser/screenshot", async (_req, res) => { try { res.type("png").send(await screenshot()); } catch (error) { res.status(400).json({ ok: false, error: error.message }); } });

// Static: serve model assets
app.use("/local-assets", express.static(MODEL_ROOT));

createServer(app).listen(PORT, "127.0.0.1", () => {
  console.log(`Local model server running at http://localhost:${PORT}`);
  console.log(`Serving models from: ${MODEL_ROOT}`);
});
