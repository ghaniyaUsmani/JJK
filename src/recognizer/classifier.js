import { dtw } from './dtw.js';

/**
 * Rolling-window gesture classifier.
 *
 * Maintains a ring buffer of the latest N feature vectors, and on
 * each `tick()` compares that buffer against every stored gesture
 * sample via DTW. If the min distance for some gesture is below its
 * threshold and at least K samples agree (i.e. their distance is
 * also below threshold), we fire that gesture and enter cooldown.
 */
export function createClassifier(model, opts = {}) {
  const cfg = {
    windowFrames: 24,
    minAgree: 2,
    cooldownMs: 1400,
    minPresenceFrames: 12, // must actually see hands for at least this many
    ...opts,
  };

  const buffer = [];
  let cooldownUntil = 0;
  let currentModel = model;
  let presenceCount = 0;

  return {
    push(featureFrame /* {vec, presence} | null */) {
      if (!featureFrame) {
        // no hands this frame; keep buffer, but track drop-off
        buffer.push(null);
        if (buffer.length > cfg.windowFrames) buffer.shift();
        presenceCount = buffer.filter((f) => f).length;
        return;
      }
      buffer.push(featureFrame.vec);
      if (buffer.length > cfg.windowFrames) buffer.shift();
      presenceCount = buffer.filter((f) => f).length;
    },

    /**
     * Attempt classification against the current buffer.
     * Returns { id, label, score, distance, anchor? } or null.
     */
    tick(now = performance.now()) {
      if (now < cooldownUntil) return null;
      if (presenceCount < cfg.minPresenceFrames) return null;

      const seq = buffer.filter((f) => f); // strip nulls, use present frames
      if (seq.length < cfg.minPresenceFrames) return null;

      let best = null;
      for (const g of Object.values(currentModel.gestures)) {
        if (!g.samples.length || g.threshold == null) continue;
        const distances = g.samples.map((s) => dtw(seq, s));
        distances.sort((a, b) => a - b);
        const minDist = distances[0];
        const agree = distances.filter((d) => d <= g.threshold).length;
        if (
          minDist <= g.threshold &&
          agree >= cfg.minAgree &&
          (!best || minDist < best.minDist)
        ) {
          best = { g, minDist, agree };
        }
      }

      if (!best) return null;

      cooldownUntil = now + cfg.cooldownMs;
      const confidence = clamp01(1 - best.minDist / best.g.threshold);
      return {
        id: best.g.id,
        label: best.g.label,
        kanji: best.g.kanji,
        character: best.g.character,
        distance: best.minDist,
        score: confidence,
      };
    },

    setModel(m) { currentModel = m; },
    clear() { buffer.length = 0; presenceCount = 0; },
  };
}

function clamp01(v) {
  if (!isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
