// Gratis lezen op het toestel zelf: tekstherkenning (Tesseract) voor foto's en pdf.js voor PDF's.
// Alle bestanden komen van onze eigen site (public/vendor). De brief verlaat de telefoon niet.
import type { PreparedPage } from "./image";

export type ReadProgress = { stage: "laden" | "lezen"; page: number; pages: number; progress: number };

type TesseractWorker = Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>>;
let workerPromise: Promise<TesseractWorker> | null = null;
let onLog: ((p: number, status: string) => void) | null = null;

function base() {
  return `${window.location.origin}/vendor`;
}

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, OEM } = await import("tesseract.js");
      return createWorker("nld", OEM.LSTM_ONLY, {
        workerPath: `${base()}/tesseract/worker.min.js`,
        corePath: `${base()}/tesseract`,
        langPath: `${base()}/tesseract/lang`,
        gzip: true,
        // Taalbestand wordt na de eerste keer bewaard in de browser (sneller, werkt daarna ook met slecht internet).
        cacheMethod: "write",
        logger: (m) => onLog?.(m.progress ?? 0, m.status ?? ""),
      }).then(async (w) => {
        // Spaties tussen woorden bewaren: beter voor bedragen, IBAN's en kenmerken.
        await w.setParameters({ preserve_interword_spaces: "1" });
        return w;
      });
    })().catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

/**
 * Maakt een foto beter leesbaar voor de tekstherkenning:
 * grijs, contrast oprekken (schaduw en vergeling weg) en kleine foto's vergroten.
 */
export async function enhanceForOcr(src: string | HTMLCanvasElement): Promise<HTMLCanvasElement> {
  let source: CanvasImageSource;
  let w: number;
  let h: number;
  if (typeof src === "string") {
    const img = new Image();
    img.src = src;
    await img.decode();
    source = img;
    w = img.naturalWidth;
    h = img.naturalHeight;
  } else {
    source = src;
    w = src.width;
    h = src.height;
  }
  const scale = Math.max(w, h) < 1800 ? Math.min(2, 2200 / Math.max(w, h)) : 1;
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, c.width, c.height);
  const im = ctx.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const g = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
    d[i] = g;
    hist[g]++;
  }
  const total = d.length / 4;
  let lo = 0;
  let hi = 255;
  for (let acc = 0; lo < 255 && (acc += hist[lo]) < total * 0.01; lo++);
  for (let acc = 0; hi > 0 && (acc += hist[hi]) < total * 0.02; hi--);
  const range = Math.max(40, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / range));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(im, 0, 0);
  return c;
}

async function ocrImage(src: string | HTMLCanvasElement, report: (p: number, status: string) => void) {
  const worker = await getWorker();
  try {
    src = await enhanceForOcr(src);
  } catch {
    /* lukt verbeteren niet, dan gewoon het origineel lezen */
  }
  onLog = report;
  try {
    const { data } = await worker.recognize(src);
    return { text: data.text, confidence: data.confidence };
  } finally {
    onLog = null;
  }
}

async function readPdf(page: PreparedPage, report: (p: number, status: string) => void) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `${base()}/pdfjs/pdf.worker.min.mjs`;
  const bytes = Uint8Array.from(atob(page.data), (c) => c.charCodeAt(0));
  const task = pdfjs.getDocument({ data: bytes });
  const doc = await task.promise;
  const texts: string[] = [];
  let confidence = 95;
  const n = Math.min(doc.numPages, 6);
  for (let i = 1; i <= n; i++) {
    const p = await doc.getPage(i);
    const content = await p.getTextContent();
    let text = "";
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2 && !text.endsWith("\n")) text += "\n";
      text += item.str + (item.hasEOL ? "\n" : "");
      lastY = y;
    }
    if (text.replace(/\s/g, "").length < 40) {
      // Gescande PDF zonder tekstlaag: maak er een plaatje van en lees dat.
      const viewport = p.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await p.render({ canvas, viewport }).promise;
      const r = await ocrImage(canvas, (pr, st) => report((i - 1 + pr) / n, st));
      text = r.text;
      confidence = Math.min(confidence, r.confidence);
    }
    texts.push(text);
    report(i / n, "lezen");
  }
  await task.destroy();
  return { text: texts.join("\n\n"), confidence };
}

/** Leest alle bladzijden. Geeft de tekst en een betrouwbaarheid (0-100). */
export async function readLetter(pages: PreparedPage[], onProgress: (p: ReadProgress) => void) {
  const texts: string[] = [];
  let confidence = 100;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const report = (p: number, status: string) =>
      onProgress({
        stage: /load|initializ/i.test(status) ? "laden" : "lezen",
        page: i + 1,
        pages: pages.length,
        progress: Math.max(0, Math.min(1, p)),
      });
    const r = page.mediaType === "application/pdf" ? await readPdf(page, report) : await ocrImage(page.preview, report);
    texts.push(r.text);
    confidence = Math.min(confidence, r.confidence);
  }
  return { text: texts.join("\n\n--- volgende bladzijde ---\n\n"), confidence };
}
