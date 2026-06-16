import { readDirectoryHandle, saveDirectoryHandle } from "./fileLibraryDb";

export interface FileLibraryResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export interface LocalImageWriteResult {
  relativePath: string;
  mimeType: string;
  sizeBytes: number;
}

const unsupportedMessage = "当前浏览器不支持本地文件夹写入，请使用桌面版 Chrome 或 Edge，或继续使用内置图片模式。";

export function isFileSystemAccessSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window && typeof indexedDB !== "undefined";
}

function withTimeout<T>(promise: Promise<T>, message: string, ms = 1500): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

export async function connectImageLibrary(): Promise<FileLibraryResult<FileSystemDirectoryHandle>> {
  if (!isFileSystemAccessSupported()) return { ok: false, error: unsupportedMessage };
  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    const permission = await requestDirectoryPermission(handle);
    if (!permission.ok) return permission;
    await saveDirectoryHandle(handle);
    return { ok: true, value: handle };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, error: "已取消选择图片仓库文件夹。" };
    }
    return { ok: false, error: "无法连接本地图片仓库，请重新选择文件夹。" };
  }
}

export async function restoreImageLibrary(): Promise<FileLibraryResult<FileSystemDirectoryHandle>> {
  if (!isFileSystemAccessSupported()) return { ok: false, error: unsupportedMessage };
  try {
    const handle = await withTimeout(readDirectoryHandle(), "图片仓库检查超时，请重新连接图片仓库文件夹。");
    if (!handle) return { ok: false, error: "尚未连接本地图片仓库。" };
    const permission = await queryDirectoryPermission(handle);
    if (!permission.ok) return { ok: false, error: "图片仓库权限已失效，请重新连接图片仓库文件夹。" };
    return { ok: true, value: handle };
  } catch {
    return { ok: false, error: "无法恢复图片仓库连接，请重新选择图片仓库文件夹。" };
  }
}

export async function queryDirectoryPermission(handle: FileSystemDirectoryHandle): Promise<FileLibraryResult<FileSystemDirectoryHandle>> {
  try {
    const state = await withTimeout(handle.queryPermission({ mode: "readwrite" }), "图片仓库权限检查超时。");
    return state === "granted"
      ? { ok: true, value: handle }
      : { ok: false, error: "图片仓库权限未授权，请重新连接图片仓库文件夹。" };
  } catch {
    return { ok: false, error: "无法检查图片仓库权限。" };
  }
}

export async function requestDirectoryPermission(handle: FileSystemDirectoryHandle): Promise<FileLibraryResult<FileSystemDirectoryHandle>> {
  try {
    const state = await handle.requestPermission({ mode: "readwrite" });
    return state === "granted"
      ? { ok: true, value: handle }
      : { ok: false, error: "未授予图片仓库写入权限。" };
  } catch {
    return { ok: false, error: "无法请求图片仓库写入权限。" };
  }
}

export async function writeImageFile(
  handle: FileSystemDirectoryHandle,
  blob: Blob,
  fileName: string,
): Promise<FileLibraryResult<LocalImageWriteResult>> {
  try {
    const permission = await queryDirectoryPermission(handle);
    if (!permission.ok) {
      const requested = await requestDirectoryPermission(handle);
      if (!requested.ok) return { ok: false, error: requested.error };
    }
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return {
      ok: true,
      value: {
        relativePath: fileName,
        mimeType: blob.type || "image/jpeg",
        sizeBytes: blob.size,
      },
    };
  } catch {
    return { ok: false, error: "图片写入本地仓库失败，请检查文件夹权限和磁盘空间。" };
  }
}

export async function readLocalImageObjectUrl(
  handle: FileSystemDirectoryHandle | undefined,
  relativePath: string | undefined,
): Promise<FileLibraryResult<string>> {
  if (!handle || !relativePath) {
    return { ok: false, error: "图片文件未连接或已移动，请重新选择图片仓库文件夹。" };
  }
  try {
    const fileHandle = await handle.getFileHandle(relativePath);
    const file = await fileHandle.getFile();
    return { ok: true, value: URL.createObjectURL(file) };
  } catch {
    return { ok: false, error: "图片文件未连接或已移动，请重新选择图片仓库文件夹。" };
  }
}

export async function checkLocalImageExists(
  handle: FileSystemDirectoryHandle | undefined,
  relativePath: string | undefined,
) {
  if (!handle || !relativePath) return false;
  try {
    await handle.getFileHandle(relativePath);
    return true;
  } catch {
    return false;
  }
}

export function makeImageFileName(prefix?: string, mimeType = "image/webp") {
  const extension = mimeType.includes("webp") ? "webp" : "jpg";
  const cleanPrefix = prefix?.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "image";
  return `${cleanPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
}
