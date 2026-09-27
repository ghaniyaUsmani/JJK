/**
 * Convert a set of hand landmarks (MediaPipe output) into a normalized
 * feature vector suitable for gesture comparison.
 *
 * We normalize per-hand:
 *   1. Translate so the wrist (landmark 0) is at origin.
 *   2. Scale by the distance from wrist to middle-finger MCP (landmark 9).
 *
 * The output packs up to 2 hands (Left first, Right second) into a
 * fixed 126-length vector (21 landmarks × 3 dims × 2 hands). Missing
 * hands are filled with zeros and flagged in `presence`.
 */
const LANDMARKS = 21;
const DIMS = 3;
const PER_HAND = LANDMARKS * DIMS; // 63
const VECTOR_LEN = PER_HAND * 2;   // 126

export function toFeatureVector(hands) {
  if (!hands || hands.length === 0) return null;

  // Sort so Left is always slot 0, Right slot 1. If handedness unknown,
  // preserve given order but only fill slot 0.
  let left = null;
  let right = null;
  for (const h of hands) {
    if (h.handedness === 'Left' && !left) left = h.landmarks;
    else if (h.handedness === 'Right' && !right) right = h.landmarks;
    else if (!left && !right) left = h.landmarks;
    else if (!right) right = h.landmarks;
    else if (!left) left = h.landmarks;
  }
  if (!left && !right) return null;

  const vec = new Float32Array(VECTOR_LEN);
  const presence = [Boolean(left), Boolean(right)];

  if (left) writeHand(vec, 0, left);
  if (right) writeHand(vec, PER_HAND, right);

  return { vec, presence };
}

function writeHand(out, offset, landmarks) {
  const wrist = landmarks[0];
  const mcp = landmarks[9];
  const scale =
    Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y, mcp.z - wrist.z) || 1e-6;

  for (let i = 0; i < LANDMARKS; i++) {
    const lm = landmarks[i];
    out[offset + i * DIMS + 0] = (lm.x - wrist.x) / scale;
    out[offset + i * DIMS + 1] = (lm.y - wrist.y) / scale;
    out[offset + i * DIMS + 2] = (lm.z - wrist.z) / scale;
  }
}

export function frameDistance(a, b) {
  // Euclidean distance between two flat vectors, weighted by shared presence.
  // If both frames have the same hands present, straightforward L2.
  // If one has a hand the other doesn't, that hand's slot contributes penalty.
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export const VECTOR_LENGTH = VECTOR_LEN;
