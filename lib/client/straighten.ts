// Scheve foto rechtzetten, zoals een scanner-app: zoek de vier hoeken van het (lichte) papier
// en trek de brief recht naar een rechthoek. Alles op het toestel.

export interface Point {
  x: number;
  y: number;
}

/** Otsu-drempel: scheidt licht (papier) van donker (tafel). */
function otsu(gray: Uint8Array): number {
  const hist = new Array(256).fill(0);
  for (const v of gray) hist[v]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      thr = t;
    }
  }
  return thr;
}

/**
 * Zoekt de hoeken van het papier in een grijs beeld (w×h, klein, ± 400 px).
 * Geeft null als er geen duidelijk los vel papier te zien is (dan doen we niets).
 */
export function findPaperCorners(gray: Uint8Array, w: number, h: number): Point[] | null {
  const thr = otsu(gray);
  const bright = new Uint8Array(w * h);
  let brightCount = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] > thr) {
      bright[i] = 1;
      brightCount++;
    }
  }
  // Is er wel verschil tussen papier en achtergrond?
  let sumIn = 0;
  let sumOut = 0;
  for (let i = 0; i < gray.length; i++) (bright[i] ? (sumIn += gray[i]) : (sumOut += gray[i]));
  const meanIn = sumIn / Math.max(1, brightCount);
  const meanOut = sumOut / Math.max(1, gray.length - brightCount);
  if (meanIn - meanOut < 40) return null;

  // Grootste aaneengesloten lichte vlak (tekst in het papier telt mee door 'gaten' te negeren)
  const label = new Int32Array(w * h);
  let bestLabel = 0;
  let bestSize = 0;
  let next = 1;
  const stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!bright[i] || label[i]) continue;
    let size = 0;
    stack.push(i);
    label[i] = next;
    while (stack.length) {
      const p = stack.pop()!;
      size++;
      const x = p % w;
      const y = (p / w) | 0;
      if (x > 0 && bright[p - 1] && !label[p - 1]) (label[p - 1] = next), stack.push(p - 1);
      if (x < w - 1 && bright[p + 1] && !label[p + 1]) (label[p + 1] = next), stack.push(p + 1);
      if (y > 0 && bright[p - w] && !label[p - w]) (label[p - w] = next), stack.push(p - w);
      if (y < h - 1 && bright[p + w] && !label[p + w]) (label[p + w] = next), stack.push(p + w);
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = next;
    }
    next++;
  }
  // Papier in de schaduw is donkerder dan de drempel en viel er dus buiten. Laat het lichte vlak
  // "doorgroeien" naar buurpixels die er geleidelijk in overgaan (een schaduw verloopt zacht);
  // de rand van het papier is een scherpe overgang en houdt de groei tegen.
  if (bestLabel) {
    const floor = Math.max(30, thr * 0.45);
    const queue: number[] = [];
    for (let i = 0; i < w * h; i++) if (label[i] === bestLabel) queue.push(i);
    for (let qi = 0; qi < queue.length; qi++) {
      const p = queue[qi];
      const x = p % w;
      const y = (p / w) | 0;
      const gp = gray[p];
      const tryAdd = (n: number) => {
        if (label[n] === bestLabel) return;
        const gn = gray[n];
        if (gn < floor || Math.abs(gn - gp) > 6) return;
        label[n] = bestLabel;
        bestSize++;
        queue.push(n);
      };
      if (x > 0) tryAdd(p - 1);
      if (x < w - 1) tryAdd(p + 1);
      if (y > 0) tryAdd(p - w);
      if (y < h - 1) tryAdd(p + w);
    }
  }

  const area = w * h;
  if (bestSize < area * 0.15) return null; // te klein: geen brief

  // Uiterste punten → vier hoeken
  let tl = { x: 0, y: 0, v: Infinity };
  let br = { x: 0, y: 0, v: -Infinity };
  let tr = { x: 0, y: 0, v: -Infinity };
  let bl = { x: 0, y: 0, v: Infinity };
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (label[y * w + x] !== bestLabel) continue;
      const s = x + y;
      const d = x - y;
      if (s < tl.v) tl = { x, y, v: s };
      if (s > br.v) br = { x, y, v: s };
      if (d > tr.v) tr = { x, y, v: d };
      if (d < bl.v) bl = { x, y, v: d };
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  // Raakt het papier bijna overal de rand van de foto? Dan is de foto al goed bijgesneden.
  const touches = [minX <= 1, maxX >= w - 2, minY <= 1, maxY >= h - 2].filter(Boolean).length;
  if (touches >= 3) return null;

  const corners = [tl, tr, br, bl].map(({ x, y }) => ({ x, y }));
  // Controle: lijkt het op een vierhoek die het lichte vlak goed dekt?
  const quadArea = Math.abs(
    corners.reduce((acc, p, i) => {
      const q = corners[(i + 1) % 4];
      return acc + (p.x * q.y - q.x * p.y);
    }, 0) / 2,
  );
  if (quadArea < bestSize * 0.85 || quadArea > bestSize * 1.35) return null;
  return corners;
}

/** Oplossen van een 8×8 stelsel (Gauss) voor de perspectief-transformatie. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** Homografie die doelpunten (rechthoek) afbeeldt op bronpunten (scheve vierhoek). */
export function homography(dst: Point[], src: Point[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = dst[i];
    const { x: u, y: v } = src[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  return [...solve(A, b), 1];
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Zet de brief op `canvas` recht. Geeft een nieuw canvas terug, of null als er niets recht te zetten is.
 */
export function straightenCanvas(canvas: HTMLCanvasElement, maxOut = 2200): HTMLCanvasElement | null {
  const W = canvas.width;
  const H = canvas.height;
  const scale = Math.min(1, 400 / Math.max(W, H));
  const sw = Math.max(8, Math.round(W * scale));
  const sh = Math.max(8, Math.round(H * scale));
  const small = document.createElement("canvas");
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(canvas, 0, 0, sw, sh);
  const sd = sctx.getImageData(0, 0, sw, sh).data;
  const gray = new Uint8Array(sw * sh);
  for (let i = 0, j = 0; i < sd.length; i += 4, j++) gray[j] = (sd[i] * 299 + sd[i + 1] * 587 + sd[i + 2] * 114) / 1000;
  const found = findPaperCorners(gray, sw, sh);
  if (!found) return null;
  const src = found.map((p) => ({ x: p.x / scale, y: p.y / scale }));
  const [tl, tr, br, bl] = src;
  let outW = Math.round(Math.max(dist(tl, tr), dist(bl, br)));
  let outH = Math.round(Math.max(dist(tl, bl), dist(tr, br)));
  const cap = maxOut / Math.max(outW, outH);
  if (cap < 1) {
    outW = Math.round(outW * cap);
    outH = Math.round(outH * cap);
  }
  if (outW < 200 || outH < 200) return null;
  // Bijna recht? Dan alleen bijsnijden is niet nodig: toch rechttrekken is goedkoop en netjes.
  const Hm = homography(
    [
      { x: 0, y: 0 },
      { x: outW - 1, y: 0 },
      { x: outW - 1, y: outH - 1 },
      { x: 0, y: outH - 1 },
    ],
    src,
  );
  const sctx2 = canvas.getContext("2d", { willReadFrequently: true })!;
  const srcData = sctx2.getImageData(0, 0, W, H).data;
  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const octx = out.getContext("2d")!;
  const img = octx.createImageData(outW, outH);
  const d = img.data;
  const [a, b, c, dd, e, f, g, hh] = Hm;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const den = g * x + hh * y + 1;
      const u = (a * x + b * y + c) / den;
      const v = (dd * x + e * y + f) / den;
      // bilineair bemonsteren
      const x0 = Math.floor(u);
      const y0 = Math.floor(v);
      const o = (y * outW + x) * 4;
      if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= H - 1) {
        d[o] = d[o + 1] = d[o + 2] = 255;
        d[o + 3] = 255;
        continue;
      }
      const fx = u - x0;
      const fy = v - y0;
      const i00 = (y0 * W + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + W * 4;
      const i11 = i01 + 4;
      for (let k = 0; k < 3; k++) {
        const top = srcData[i00 + k] * (1 - fx) + srcData[i10 + k] * fx;
        const bot = srcData[i01 + k] * (1 - fx) + srcData[i11 + k] * fx;
        d[o + k] = top * (1 - fy) + bot * fy;
      }
      d[o + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}
