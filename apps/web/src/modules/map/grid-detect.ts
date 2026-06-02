/**
 * Best-effort square-grid detection from a map image. This is a heuristic, not a
 * guarantee: it draws the image to an offscreen canvas, measures per-column and
 * per-row "edge energy" (where grid lines live), and uses autocorrelation to find
 * the dominant line spacing and the first line's offset. Returns the cell size and
 * offsets as fractions of the image's natural dimensions, or `null` when it can't
 * find a convincing grid (or the canvas is cross-origin tainted). The GM can always
 * adjust the result by hand — these manual controls are the real source of truth.
 */
export interface DetectedGrid {
  size: number; // cell width as a fraction of image width
  offsetX: number;
  offsetY: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function edgeEnergyColumns(gray: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w);
  for (let x = 1; x < w; x++) {
    let s = 0;
    for (let y = 0; y < h; y++) s += Math.abs(gray[y * w + x]! - gray[y * w + x - 1]!);
    out[x] = s;
  }
  return out;
}

function edgeEnergyRows(gray: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(h);
  for (let y = 1; y < h; y++) {
    let s = 0;
    for (let x = 0; x < w; x++) s += Math.abs(gray[y * w + x]! - gray[(y - 1) * w + x]!);
    out[y] = s;
  }
  return out;
}

/** Dominant repeat period (in samples) via autocorrelation, or null. */
function dominantPeriod(energy: Float32Array): number | null {
  const n = energy.length;
  if (n < 24) return null;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += energy[i]!;
  mean /= n;
  const sig = new Float32Array(n);
  for (let i = 0; i < n; i++) sig[i] = energy[i]! - mean;

  const minP = 8;
  const maxP = Math.floor(n / 3);
  let best = 0;
  let bestLag = 0;
  for (let lag = minP; lag <= maxP; lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += sig[i]! * sig[i + lag]!;
    if (s > best) {
      best = s;
      bestLag = lag;
    }
  }
  return bestLag || null;
}

/** Position of the strongest line within the first `period` samples. */
function firstLineOffset(energy: Float32Array, period: number): number {
  let best = -1;
  let idx = 0;
  const limit = Math.min(period, energy.length);
  for (let i = 0; i < limit; i++) {
    if (energy[i]! > best) {
      best = energy[i]!;
      idx = i;
    }
  }
  return idx;
}

export function detectGrid(img: HTMLImageElement): DetectedGrid | null {
  if (!img.naturalWidth || !img.naturalHeight) return null;
  const maxW = 600;
  const scale = Math.min(1, maxW / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null; // tainted (cross-origin) canvas
  }

  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = (data[i * 4]! + data[i * 4 + 1]! + data[i * 4 + 2]!) / 3;
  }

  const colE = edgeEnergyColumns(gray, w, h);
  const rowE = edgeEnergyRows(gray, w, h);
  const periodX = dominantPeriod(colE);
  const periodY = dominantPeriod(rowE);
  const period = periodX && periodY ? (periodX + periodY) / 2 : periodX || periodY;
  if (!period) return null;

  const cellPxNatural = period / scale;
  const size = cellPxNatural / img.naturalWidth;
  if (size < 0.01 || size > 0.5) return null;

  const offXpx = firstLineOffset(colE, periodX ?? period) / scale;
  const offYpx = firstLineOffset(rowE, periodY ?? period) / scale;
  const offsetX = clamp01((offXpx / img.naturalWidth) % size);
  const offsetY = clamp01((offYpx / img.naturalHeight) % size);

  return { size, offsetX, offsetY };
}
