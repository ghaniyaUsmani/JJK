import { frameDistance } from '../features.js';

/**
 * Dynamic Time Warping distance between two sequences of frames.
 * Each sequence is an array of Float32Array feature vectors.
 * We use a Sakoe-Chiba band (windowed DTW) for speed.
 *
 * The returned distance is normalized by the warping-path length so
 * different-length gestures are comparable.
 */
export function dtw(a, b, { window } = {}) {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0) return Infinity;

  const w = Math.max(window ?? Math.max(3, Math.floor(Math.max(n, m) * 0.3)),
                     Math.abs(n - m));

  // Use two rolling rows to keep memory small.
  const INF = Infinity;
  let prev = new Float64Array(m + 1).fill(INF);
  let curr = new Float64Array(m + 1).fill(INF);
  prev[0] = 0;

  for (let i = 1; i <= n; i++) {
    curr.fill(INF);
    const jStart = Math.max(1, i - w);
    const jEnd = Math.min(m, i + w);
    for (let j = jStart; j <= jEnd; j++) {
      const cost = frameDistance(a[i - 1], b[j - 1]);
      const best = Math.min(prev[j], curr[j - 1], prev[j - 1]);
      curr[j] = cost + best;
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  const raw = prev[m];
  if (!isFinite(raw)) return Infinity;
  return raw / Math.max(n, m);
}
