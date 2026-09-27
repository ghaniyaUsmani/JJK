import { dtw } from './dtw.js';

/**
 * Default gesture roster (v1). Users train their own hand signs
 * for these three technique ids; the labels + effect are fixed.
 */
export const DEFAULT_GESTURES = [
  {
    id: 'hollow_purple',
    label: 'Hollow Purple',
    kanji: '虚式「茈」',
    character: 'Gojo',
  },
  {
    id: 'dismantle',
    label: 'Dismantle',
    kanji: '解',
    character: 'Sukuna',
  },
  {
    id: 'nue',
    label: 'Nue',
    kanji: '鵺',
    character: 'Megumi',
  },
];

export function emptyModel() {
  const gestures = {};
  for (const g of DEFAULT_GESTURES) {
    gestures[g.id] = {
      id: g.id,
      label: g.label,
      kanji: g.kanji,
      character: g.character,
      samples: [],   // Array<Array<Float32Array>>
      threshold: null,
    };
  }
  return { version: 1, gestures };
}

/**
 * Serialize a model to JSON-safe form (Float32Array -> number[]).
 */
export function serializeModel(model) {
  const out = { version: model.version, gestures: {} };
  for (const [id, g] of Object.entries(model.gestures)) {
    out.gestures[id] = {
      id: g.id,
      label: g.label,
      kanji: g.kanji,
      character: g.character,
      threshold: g.threshold,
      samples: g.samples.map((seq) => seq.map((f) => Array.from(f))),
    };
  }
  return out;
}

export function deserializeModel(data) {
  if (!data || !data.gestures) return emptyModel();
  const gestures = {};
  // Ensure all default gestures exist, even if the saved file predates a new one.
  for (const g of DEFAULT_GESTURES) {
    gestures[g.id] = {
      id: g.id,
      label: g.label,
      kanji: g.kanji,
      character: g.character,
      samples: [],
      threshold: null,
    };
  }
  for (const [id, g] of Object.entries(data.gestures)) {
    if (!gestures[id]) continue; // ignore stale ids
    gestures[id].threshold = g.threshold ?? null;
    gestures[id].samples = (g.samples || []).map((seq) =>
      seq.map((frame) => Float32Array.from(frame))
    );
  }
  return { version: data.version || 1, gestures };
}

/**
 * Recompute the per-gesture recognition threshold from its own samples.
 * threshold = mean(pairwise DTW dist) + 2·std, clamped to a sane range.
 */
export function recalibrateThreshold(gesture) {
  const s = gesture.samples;
  if (s.length < 2) {
    gesture.threshold = null;
    return;
  }
  const dists = [];
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      dists.push(dtw(s[i], s[j]));
    }
  }
  const finite = dists.filter((d) => isFinite(d));
  if (finite.length === 0) {
    gesture.threshold = null;
    return;
  }
  const mean = finite.reduce((a, b) => a + b, 0) / finite.length;
  const variance =
    finite.reduce((a, b) => a + (b - mean) * (b - mean), 0) / finite.length;
  const std = Math.sqrt(variance);
  // clamp so a very-tight cluster still permits some jitter,
  // and a very-loose cluster doesn't accept anything.
  gesture.threshold = Math.min(Math.max(mean + 2 * std, 0.6), 3.0);
}
