export const compactDescription = (value) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 1_200);
export const normalizeLanguage = (value) => String(value ?? "").toLowerCase().split("-")[0] || "und";
export const isChineseDescription = (value = "") => {
  const chinese = value.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const content = value.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  return chinese >= 2 && chinese / Math.max(content, 1) >= .2;
};

export function prepareTranslator(sourceLanguage, translatorApi = globalThis.Translator, onDownload = () => undefined) {
  const language = normalizeLanguage(sourceLanguage);
  if (language === "zh") return Promise.resolve({ status: "not-needed", language });
  if (language === "und" || !translatorApi?.create) return Promise.resolve({ status: "unavailable", language });
  try {
    return Promise.resolve(translatorApi.create({
      sourceLanguage: language,
      targetLanguage: "zh",
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", (event) => onDownload(Math.round(event.loaded * 100)));
      },
    })).then((translator) => ({ status: "ready", language, translator })).catch((error) => ({ status: "unavailable", language, error: error instanceof Error ? error.message : String(error) }));
  } catch (error) {
    return Promise.resolve({ status: "unavailable", language, error: error instanceof Error ? error.message : String(error) });
  }
}

export async function translateDescriptions(items, prepared, onProgress = () => undefined) {
  const output = []; let completed = 0;
  for (const item of items) {
    const original = compactDescription(item.description);
    if (!original) { output.push(item); continue; }
    if (prepared.language === "zh" || isChineseDescription(original)) {
      output.push({ ...item, description: original, descriptionLanguage: "zh", translationStatus: "not-needed" });
    } else if (prepared.status !== "ready") {
      output.push({ ...item, description: original, sourceDescription: original, descriptionLanguage: prepared.language, translationStatus: "unavailable" });
    } else {
      try {
        const translated = compactDescription(await prepared.translator.translate(original));
        output.push({ ...item, description: translated || original, sourceDescription: original, descriptionLanguage: prepared.language, translationStatus: translated ? "translated" : "failed" });
      } catch {
        output.push({ ...item, description: original, sourceDescription: original, descriptionLanguage: prepared.language, translationStatus: "failed" });
      }
    }
    completed += 1; onProgress(completed, items.filter((entry) => compactDescription(entry.description)).length);
  }
  prepared.translator?.destroy?.();
  return output;
}
