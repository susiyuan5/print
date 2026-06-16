export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function estimateLocalStorageUsage() {
  let total = 0;
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;
    total += key.length + (window.localStorage.getItem(key)?.length ?? 0);
  }
  return total * 2;
}

function loadFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));
}

async function drawCompressedCanvas(file: File, maxSize = 1400) {
  const dataUrl = await loadFileAsDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建图片压缩画布。");
  context.drawImage(image, 0, 0, width, height);
  return { canvas, width, height };
}

export async function compressImageToBlob(file: File, maxSize = 1400, quality = 0.78) {
  const { canvas, width, height } = await drawCompressedCanvas(file, maxSize);
  let blob = await canvasToBlob(canvas, "image/webp", quality);
  let mimeType = "image/webp";
  if (!blob) {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
    mimeType = "image/jpeg";
  }
  if (!blob) throw new Error("图片压缩失败。");
  return {
    blob,
    mimeType,
    width,
    height,
    originalSizeBytes: file.size,
    sizeBytes: blob.size,
  };
}

export async function compressImage(file: File, maxSize = 1400, quality = 0.78) {
  const { canvas, width, height } = await drawCompressedCanvas(file, maxSize);
  const blob = await canvasToBlob(canvas, "image/jpeg", quality);
  if (!blob) throw new Error("图片压缩失败。");
  const output = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return {
    dataUrl: output,
    mimeType: "image/jpeg",
    width,
    height,
    originalSizeBytes: file.size,
    sizeBytes: blob.size,
  };
}

export function getWorkshopImageSource(image: { storageType?: string; dataUrl?: string; imageUrl?: string }) {
  if (image.storageType === "remoteUrl") return image.imageUrl ?? "";
  if (image.storageType === "localFile") return "";
  return image.dataUrl ?? image.imageUrl ?? "";
}

export function getStorageTypeLabel(storageType?: string) {
  if (storageType === "localFile") return "本地图片仓库";
  if (storageType === "remoteUrl") return "外部图片 URL";
  return "内置图片";
}
