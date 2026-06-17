import { readModelDirectoryHandle, saveModelDirectoryHandle, clearModelDirectoryHandle } from "./modelLibraryDb";

export interface ModelLibraryResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export interface ScannedModelFile {
  fileName: string;
  relativePath: string;
  extension: string;
  sizeBytes: number;
}

const SUPPORTED_EXTENSIONS = new Set(["glb", "stl", "obj"]);
const MAX_SCAN_DEPTH = 4;
const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50 MB

const unsupportedMessage = "当前浏览器不支持本地模型仓库，请使用 Chrome / Edge，或使用临时文件预览。";

export function isModelLibrarySupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window && typeof indexedDB !== "undefined";
}

function withTimeout<T>(promise: Promise<T>, message: string, ms = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => { window.clearTimeout(timer); resolve(value); })
      .catch((error) => { window.clearTimeout(timer); reject(error); });
  });
}

// --- connect ---
export async function connectModelLibrary(): Promise<ModelLibraryResult<FileSystemDirectoryHandle>> {
  if (!isModelLibrarySupported()) return { ok: false, error: unsupportedMessage };
  try {
    const handle = await window.showDirectoryPicker({ mode: "read" });
    const permission = await requestModelDirectoryPermission(handle);
    if (!permission.ok) return permission;
    await saveModelDirectoryHandle(handle);
    return { ok: true, value: handle };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, error: "已取消选择模型仓库文件夹。" };
    }
    return { ok: false, error: "无法连接本地模型仓库，请重新选择文件夹。" };
  }
}

export async function restoreModelLibrary(): Promise<ModelLibraryResult<FileSystemDirectoryHandle>> {
  if (!isModelLibrarySupported()) return { ok: false, error: unsupportedMessage };
  try {
    const handle = await withTimeout(readModelDirectoryHandle(), "模型仓库检查超时，请重新连接模型仓库文件夹。");
    if (!handle) return { ok: false, error: "尚未连接本地模型仓库。" };
    const permission = await queryModelDirectoryPermission(handle);
    if (!permission.ok) return { ok: false, error: "本地模型仓库权限已失效，请重新连接模型文件夹。" };
    return { ok: true, value: handle };
  } catch {
    return { ok: false, error: "无法恢复模型仓库连接，请重新选择模型仓库文件夹。" };
  }
}

export async function clearModelLibrary(): Promise<void> {
  await clearModelDirectoryHandle();
}

// --- permission ---
export async function queryModelDirectoryPermission(handle: FileSystemDirectoryHandle): Promise<ModelLibraryResult<FileSystemDirectoryHandle>> {
  try {
    const state = await withTimeout(handle.queryPermission({ mode: "read" }), "模型仓库权限检查超时。");
    return state === "granted"
      ? { ok: true, value: handle }
      : { ok: false, error: "模型仓库权限未授权，请重新连接模型文件夹。" };
  } catch {
    return { ok: false, error: "无法检查模型仓库权限。" };
  }
}

export async function requestModelDirectoryPermission(handle: FileSystemDirectoryHandle): Promise<ModelLibraryResult<FileSystemDirectoryHandle>> {
  try {
    const state = await handle.requestPermission({ mode: "read" });
    return state === "granted"
      ? { ok: true, value: handle }
      : { ok: false, error: "未授予模型仓库读取权限。" };
  } catch {
    return { ok: false, error: "无法请求模型仓库读取权限。" };
  }
}

// --- scan ---
export async function scanModelFiles(handle: FileSystemDirectoryHandle): Promise<ModelLibraryResult<ScannedModelFile[]>> {
  const scanned: ScannedModelFile[] = [];
  try {
    await scanDirectory(handle, "", 0, scanned);
    return { ok: true, value: scanned };
  } catch {
    return { ok: false, error: "扫描模型文件时出错，请确认文件夹权限。" };
  }
}

async function scanDirectory(
  handle: FileSystemDirectoryHandle,
  relativePath: string,
  depth: number,
  results: ScannedModelFile[],
): Promise<void> {
  if (depth > MAX_SCAN_DEPTH) return;
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind === "file") {
      const ext = name.split(".").pop()?.toLowerCase() ?? "";
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        results.push({
          fileName: name,
          relativePath: relativePath ? `${relativePath}/${name}` : name,
          extension: ext,
          sizeBytes: file.size,
        });
      }
    } else if (entry.kind === "directory") {
      const dirHandle = entry as FileSystemDirectoryHandle;
      const childPath = relativePath ? `${relativePath}/${name}` : name;
      await scanDirectory(dirHandle, childPath, depth + 1, results);
    }
  }
}

export function isLargeFile(sizeBytes: number): boolean {
  return sizeBytes >= LARGE_FILE_THRESHOLD;
}

export function formatModelFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- read ---
export async function readModelFileByRelativePath(
  handle: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<ModelLibraryResult<File>> {
  try {
    const parts = relativePath.split("/");
    let currentHandle: FileSystemDirectoryHandle | FileSystemFileHandle = handle;
    for (let i = 0; i < parts.length - 1; i++) {
      currentHandle = await (currentHandle as FileSystemDirectoryHandle).getDirectoryHandle(parts[i]);
    }
    const fileHandle = await (currentHandle as FileSystemDirectoryHandle).getFileHandle(parts[parts.length - 1]);
    const file = await fileHandle.getFile();
    return { ok: true, value: file };
  } catch {
    return { ok: false, error: "无法读取模型文件，文件可能已移动或删除。" };
  }
}

export async function createModelObjectUrl(
  handle: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<ModelLibraryResult<string>> {
  const result = await readModelFileByRelativePath(handle, relativePath);
  if (!result.ok || !result.value) return { ok: false, error: result.error ?? "无法读取模型文件。" };
  return { ok: true, value: URL.createObjectURL(result.value) };
}

export function revokeModelObjectUrl(url: string) {
  URL.revokeObjectURL(url);
}
