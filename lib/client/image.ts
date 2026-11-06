import type { UploadPage } from "../types";

const MAX_EDGE = 2000; // genoeg om kleine letters te lezen, klein genoeg om snel te versturen
const PDF_MAX_BYTES = 3 * 1024 * 1024;

export interface PreparedPage extends UploadPage {
  id: string;
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

export class FileProblem extends Error {}

const newId = () => Math.random().toString(36).slice(2);

export async function preparePage(file: File): Promise<PreparedPage> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    if (file.size > PDF_MAX_BYTES) {
      throw new FileProblem("Deze PDF is te groot (meer dan 3 MB). Maak liever een foto van de brief.");
    }
    const dataUrl = await readAsDataURL(file);
    return { id: newId(), mediaType: "application/pdf", data: dataUrl.split(",")[1], preview: "", name: file.name };
  }
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new FileProblem("Dit bestand is geen foto of PDF.");
  }
  let img: HTMLImageElement | ImageBitmap;
  try {
    img = await loadImage(file);
  } catch {
    throw new FileProblem("Deze foto kan niet worden geopend. Probeer een andere foto, of maak een nieuwe.");
  }
  const w = "naturalWidth" in img ? img.naturalWidth : img.width;
  const h = "naturalHeight" in img ? img.naturalHeight : img.height;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new FileProblem("Uw telefoon kan deze foto niet verwerken.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  if ("close" in img) img.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { id: newId(), mediaType: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl, name: file.name };
}
