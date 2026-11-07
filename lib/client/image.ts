import type { UploadPage } from "../types";

const MAX_EDGE = 2000; // genoeg om kleine letters te lezen, klein genoeg om snel te versturen
const PDF_MAX_BYTES = 3 * 1024 * 1024;

export interface PhotoQuality {
  dark: boolean;
  blurry: boolean;
  small: boolean;
}

export interface PreparedPage extends UploadPage {
  id: string;
  quality?: PhotoQuality;
  preview: string; // data-URL voor de miniatuur ("" bij PDF)
  name: string;
}

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function loadImage(file: File): Promise<HTMLImageElement | ImageBitmap> {
  if ("createImageBitmap" in window) {
    try {
      // respecteert de EXIF-oriëntatie van telefoonfoto's
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* val terug op <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export class FileProblem extends Error {
  constructor(public code: "pdfTooBig" | "notImage" | "cannotOpen") {
    super(code);
  }
}

/** Snelle controle: is de foto te donker, wazig of te klein? (op een verkleinde kopie) */
function checkQuality(source: CanvasImageSource, w: number, h: number): PhotoQuality {
  const sw = 480;
  const sh = Math.max(1, Math.round((h / w) * sw));
  const c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { dark: false, blurry: false, small: false };
  ctx.drawImage(source, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);
  const g = new Float32Array(sw * sh);
  let sum = 0;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    g[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += g[j];
  }
  const mean = sum / g.length;
  // Scherpte: variantie van de Laplace-filter. Wazige foto's hebben weinig harde randen.
  let lsum = 0;
  let lsq = 0;
  let n = 0;
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const i = y * sw + x;
      const v = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - sw] - g[i + sw];
      lsum += v;
      lsq += v * v;
      n++;
    }
  }
  const variance = lsq / n - (lsum / n) ** 2;
  return { dark: mean < 75, blurry: variance < 40, small: Math.max(w, h) < 900 };
}

const newId = () => Math.random().toString(36).slice(2);

export async function preparePage(file: File): Promise<PreparedPage> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    if (file.size > PDF_MAX_BYTES) {
      throw new FileProblem("pdfTooBig");
    }
    const dataUrl = await readAsDataURL(file);
    return { id: newId(), mediaType: "application/pdf", data: dataUrl.split(",")[1], preview: "", name: file.name };
  }
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new FileProblem("notImage");
  }
  let img: HTMLImageElement | ImageBitmap;
  try {
    img = await loadImage(file);
  } catch {
    throw new FileProblem("cannotOpen");
  }
  const w = "naturalWidth" in img ? img.naturalWidth : img.width;
  const h = "naturalHeight" in img ? img.naturalHeight : img.height;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new FileProblem("cannotOpen");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  const quality = checkQuality(canvas, w, h);
  if ("close" in img) img.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
  return { id: newId(), mediaType: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl, name: file.name, quality };
}
