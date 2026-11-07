// Live hulp bij het maken van een foto: kijkt een paar keer per seconde naar een verkleind camerabeeld
// en zegt wat er beter moet. Alles gebeurt op het toestel.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameMetrics {
  brightness: number; // gemiddelde helderheid binnen het kader (0-255)
  outside: number; // gemiddelde helderheid buiten het kader
  edges: number; // deel van de pixels met een harde rand (tekst) binnen het kader
  border: number; // deel van de randstrook binnen het kader dat 'papier' is
  spill: number; // deel van de strook buiten het kader dat 'papier' is
  motion: number; // gemiddelde verandering t.o.v. het vorige beeld
  contrast: boolean; // is papier duidelijk lichter dan de achtergrond?
}

export type Hint = "tooDark" | "holdStill" | "aim" | "closer" | "further" | "good";

/** gray: grijswaarden (0-255) van w×h pixels; frame: het kader in dezelfde pixels. */
export function measure(gray: Uint8ClampedArray, w: number, h: number, frame: Rect, prev: Uint8ClampedArray | null): FrameMetrics {
  const fx0 = Math.max(1, Math.round(frame.x));
  const fy0 = Math.max(1, Math.round(frame.y));
  const fx1 = Math.min(w - 2, Math.round(frame.x + frame.w));
  const fy1 = Math.min(h - 2, Math.round(frame.y + frame.h));
  const strip = Math.max(2, Math.round(Math.min(frame.w, frame.h) * 0.08));
  const ring = Math.max(2, Math.round(Math.min(frame.w, frame.h) * 0.1));

  let inSum = 0;
  let inN = 0;
  let edgeN = 0;
  let outSum = 0;
  let outN = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = gray[i];
      const inside = x >= fx0 && x < fx1 && y >= fy0 && y < fy1;
      if (inside) {
        inSum += v;
        inN++;
        const gx = Math.abs(gray[i + 1] - gray[i - 1]);
        const gy = Math.abs(gray[i + w] - gray[i - w]);
        if (gx + gy > 60) edgeN++;
      } else {
        outSum += v;
        outN++;
      }
    }
  }
  const brightness = inN ? inSum / inN : 0;
  const outside = outN ? outSum / outN : brightness;
  const contrast = brightness - outside > 22;
  const thr = (brightness + outside) / 2;

  // Randstrook binnen het kader: is daar papier? (zo niet: brief te klein in beeld)
  let bN = 0;
  let bBright = 0;
  // Strook buiten het kader: is daar ook papier? (zo ja: brief te groot / te dichtbij)
  let sN = 0;
  let sBright = 0;
  for (let y = Math.max(1, fy0 - ring); y < Math.min(h - 1, fy1 + ring); y++) {
    for (let x = Math.max(1, fx0 - ring); x < Math.min(w - 1, fx1 + ring); x++) {
      const v = gray[y * w + x];
      const inside = x >= fx0 && x < fx1 && y >= fy0 && y < fy1;
      if (inside) {
        const nearEdge = x < fx0 + strip || x >= fx1 - strip || y < fy0 + strip || y >= fy1 - strip;
        if (nearEdge) {
          bN++;
          if (v > thr) bBright++;
        }
      } else {
        sN++;
        if (v > thr) sBright++;
      }
    }
  }

  let motion = 0;
  if (prev && prev.length === gray.length) {
    let d = 0;
    for (let i = 0; i < gray.length; i += 3) d += Math.abs(gray[i] - prev[i]);
    motion = d / (gray.length / 3);
  }

  return {
    brightness,
    outside,
    edges: inN ? edgeN / inN : 0,
    border: bN ? bBright / bN : 0,
    spill: sN ? sBright / sN : 0,
    motion,
    contrast,
  };
}

/** Welke tip tonen we? In volgorde van belangrijkheid. */
export function decide(m: FrameMetrics): Hint {
  if (m.brightness < 65) return "tooDark";
  if (m.motion > 14) return "holdStill";
  if (m.edges < 0.012) return "aim";
  if (m.contrast) {
    if (m.spill > 0.55) return "further";
    if (m.border < 0.5) return "closer";
  }
  return "good";
}

/** Kader in A4-verhouding (staand), zo groot mogelijk binnen het scherm met ruimte voor knoppen. */
export function frameRect(viewW: number, viewH: number, top: number, bottom: number): Rect {
  const ratio = 1 / 1.414;
  const maxW = viewW * 0.9;
  const maxH = (viewH - top - bottom) * 0.96;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return { x: (viewW - w) / 2, y: top + (viewH - top - bottom - h) / 2, w, h };
}
