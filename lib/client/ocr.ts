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
 * Schaduw en ongelijk licht weghalen (zoals een scanner-app): per vakje bepalen hoe licht het papier daar is
 * (het lichtste deel van het vakje), dat glad maken, en elke pixel daardoor delen. Papier wordt overal wit,
 * tekst blijft donker. Werkt op de grijze pixels, ter plekke.
 */
export function removeShadows(gray: Uint8ClampedArray, W: number, H: number) {
  const B = Math.max(16, Math.round(Math.max(W, H) / 40)); // vakje groter dan een letter, kleiner dan een schaduw
  const bw = Math.ceil(W / B);
  const bh = Math.ceil(H / B);
  const bg = new Float32Array(bw * bh);
  const hist = new Uint32Array(256);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      hist.fill(0);
      let n = 0;
      const y1 = Math.min(H, (by + 1) * B);
      const x1 = Math.min(W, (bx + 1) * B);
      for (let y = by * B; y < y1; y += 2) for (let x = bx * B; x < x1; x += 2, n++) hist[gray[y * W + x]]++;
      // 90e percentiel: de kleur van het papier (niet van de tekst), en ongevoelig voor ruis
      let acc = 0;
      let v = 255;
      for (; v > 0; v--) if ((acc += hist[v]) >= n * 0.1) break;
      bg[by * bw + bx] = Math.max(v, 1);
    }
  }
  // Grote donkere vlakken (dikke kop, logo, tafel): neem de lichtste buur, daarna glad maken
  const tmp = new Float32Array(bg);
  for (let by = 0; by < bh; by++)
    for (let bx = 0; bx < bw; bx++) {
      let m = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const yy = by + dy;
          const xx = bx + dx;
          if (yy >= 0 && yy < bh && xx >= 0 && xx < bw) m = Math.max(m, bg[yy * bw + xx]);
        }
      tmp[by * bw + bx] = m;
    }
  for (let pass = 0; pass < 2; pass++) {
    const src = pass === 0 ? tmp : bg;
    const dst = pass === 0 ? bg : tmp;
    for (let by = 0; by < bh; by++)
      for (let bx = 0; bx < bw; bx++) {
        let s2 = 0;
        let k = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const yy = by + dy;
            const xx = bx + dx;
            if (yy >= 0 && yy < bh && xx >= 0 && xx < bw) {
              s2 += src[yy * bw + xx];
              k++;
            }
          }
        dst[by * bw + bx] = s2 / k;
      }
  }
  const map = tmp; // na twee rondes staat het resultaat in tmp
  // Elke pixel delen door het (bilineair verfijnde) papierlicht
  for (let y = 0; y < H; y++) {
    const fy = Math.min(bh - 1, Math.max(0, (y + 0.5) / B - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(bh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < W; x++) {
      const fx = Math.min(bw - 1, Math.max(0, (x + 0.5) / B - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(bw - 1, x0 + 1);
      const tx = fx - x0;
      const b =
        (map[y0 * bw + x0] * (1 - tx) + map[y0 * bw + x1] * tx) * (1 - ty) + (map[y1 * bw + x0] * (1 - tx) + map[y1 * bw + x1] * tx) * ty;
      const i = y * W + x;
      gray[i] = Math.min(255, (gray[i] * 255) / Math.max(b, 24));
    }
  }
}

/**
 * Donkere foto's hebben veel ruis. Als we het papier daarna wit maken, wordt die ruis ook sterker en leest
 * de tekstherkenning slechter. Daarom bij een donkere foto eerst een zachte 3×3-middeling.
 */
export function denoiseIfDark(gray: Uint8ClampedArray, W: number, H: number) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i += 7) hist[gray[i]]++;
  let n = 0;
  for (const c of hist) n += c;
  let acc = 0;
  let paper = 255;
  for (; paper > 0; paper--) if ((acc += hist[paper]) >= n * 0.3) break; // licht van het papier
  if (paper >= 150) return;
  const src = gray.slice();
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      gray[i] =
        (src[i - W - 1] + 2 * src[i - W] + src[i - W + 1] + 2 * src[i - 1] + 4 * src[i] + 2 * src[i + 1] + src[i + W - 1] + 2 * src[i + W] + src[i + W + 1]) >>
        4;
    }
}

/**
 * Maakt een foto beter leesbaar voor de tekstherkenning:
 * grijs, schaduw weg, contrast oprekken en kleine foto's vergroten.
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
  const W = c.width;
  const H = c.height;
  const gray = new Uint8ClampedArray(W * H);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) gray[j] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
  denoiseIfDark(gray, W, H);
  removeShadows(gray, W, H);
  const hist = new Uint32Array(256);
  for (let j = 0; j < gray.length; j++) hist[gray[j]]++;
  const total = gray.length;
  let lo = 0;
  let hi = 255;
  for (let acc = 0; lo < 255 && (acc += hist[lo]) < total * 0.01; lo++);
  for (let acc = 0; hi > 0 && (acc += hist[hi]) < total * 0.02; hi--);
  const range = Math.max(40, hi - lo);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = Math.max(0, Math.min(255, ((gray[j] - lo) * 255) / range));
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

/** Zoekt QR-codes in een foto (bijvoorbeeld een iDEAL-betaal-QR op de brief). Op het toestel. */
export async function findQrCodes(src: string): Promise<string[]> {
  try {
    const { default: jsQR } = await import("jsqr");
    const img = new Image();
    img.src = src;
    await img.decode();
    const found: string[] = [];
    // Op twee formaten proberen: QR-codes op brieven zijn vaak klein.
    for (const max of [1600, 900]) {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const r = jsQR(d.data, d.width, d.height, { inversionAttempts: "dontInvert" });
      if (r?.data && !found.includes(r.data)) found.push(r.data);
      if (found.length) break;
    }
    return found;
  } catch {
    return [];
  }
}

/** Leest alle bladzijden. Geeft de tekst, een betrouwbaarheid (0-100) en gevonden QR-codes. */
export async function readLetter(pages: PreparedPage[], onProgress: (p: ReadProgress) => void) {
  const texts: string[] = [];
  const qr: string[] = [];
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
    if (page.preview) qr.push(...(await findQrCodes(page.preview)));
    const r = page.mediaType === "application/pdf" ? await readPdf(page, report) : await ocrImage(page.ocrSrc ?? page.preview, report);
    texts.push(r.text);
    confidence = Math.min(confidence, r.confidence);
  }
  return { text: texts.join("\n\n--- volgende bladzijde ---\n\n"), confidence, qr };
}
