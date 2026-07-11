import { readFile, rename, writeFile } from "node:fs/promises";
export async function writeAtomicJson(path, value) { const temp = `${path}.tmp`; await writeFile(temp, JSON.stringify(value, null, 2)); await rename(temp, path); }
export async function readJson(path, fallback) { try { return { ...fallback, ...JSON.parse(await readFile(path, "utf-8")) }; } catch { return structuredClone(fallback); } }
