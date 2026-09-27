/**
 * Draw MediaPipe hand landmarks on an overlay canvas so users get
 * feedback while training. Uses accent colors.
 */
const CONNECTIONS = [
  // thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // middle
  [5, 9], [9, 10], [10, 11], [11, 12],
  // ring
  [9, 13], [13, 14], [14, 15], [15, 16],
  // pinky
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

export function drawLandmarks(ctx, hands, width, height, opts = {}) {
  const { mirror = false, clear = true, boneWidth = 2, tipRadius = 4, jointRadius = 2.6, glow = false } = opts;
  if (clear) ctx.clearRect(0, 0, width, height);
  if (!hands || hands.length === 0) return;

  const xy = (p) => [mirror ? (1 - p.x) * width : p.x * width, p.y * height];

  for (const hand of hands) {
    const pts = hand.landmarks;
    if (!pts || pts.length < 21) continue;

    // Bones
    ctx.strokeStyle = 'rgba(240, 97, 107, 0.85)';
    ctx.lineWidth = boneWidth;
    ctx.lineCap = 'round';
    if (glow) {
      ctx.shadowColor = 'rgba(196, 48, 61, 0.9)';
      ctx.shadowBlur = 12;
    }
    for (const [a, b] of CONNECTIONS) {
      const [x1, y1] = xy(pts[a]);
      const [x2, y2] = xy(pts[b]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    if (glow) ctx.shadowBlur = 0;

    // Joints
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = xy(pts[i]);
      const isTip = [4, 8, 12, 16, 20].includes(i);
      ctx.beginPath();
      ctx.fillStyle = isTip ? '#F0616B' : 'rgba(196, 48, 61, 0.95)';
      ctx.arc(x, y, isTip ? tipRadius : jointRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
