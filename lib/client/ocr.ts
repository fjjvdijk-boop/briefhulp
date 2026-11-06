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
      });
    })().catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

async function ocrImage(src: string | HTMLCanvasElement, report: (p: number, status: string) => void) {
  const worker = await getWorker();
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
