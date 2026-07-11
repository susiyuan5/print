import express from "express";
import cors from "cors";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createServer } from "node:http";

const PORT = process.env.LOCAL_SERVER_PORT ? Number(process.env.LOCAL_SERVER_PORT) : 3456;
const MODEL_ROOT = resolve(process.env.LOCAL_MODEL_ROOT ?? "F:/3D打印手办文件");

const SUPPORTED_MODEL_EXTS = new Set([".glb", ".gltf"]);
const COVER_NAMES = new Set(["cover.jpg", "cover.png", "cover.webp", "thumbnail.jpg", "thumbnail.png"]);

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

// API: list models
app.get("/api/local-models", async (_req, res) => {
  try {
    const models = await scanModels();
    res.json({ ok: true, models });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Static: serve model assets
app.use("/local-assets", express.static(MODEL_ROOT));

createServer(app).listen(PORT, "127.0.0.1", () => {
  console.log(`Local model server running at http://localhost:${PORT}`);
  console.log(`Serving models from: ${MODEL_ROOT}`);
});
