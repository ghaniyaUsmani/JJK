/**
 * "Dismantle" — Sukuna.
 * A fan of dark slash lines emanates from the primary hand across
 * the frame with a subtle crimson rim. Fast, sharp, minimal.
 */
export function dismantle({ system, anchors, ctx }) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const anchor = anchors[0] || { x: W / 2, y: H / 2 };

  const total = 7;
  const baseAngle = -Math.PI / 4; // upward-right diagonal
  const fanSpread = Math.PI / 2.2;

  for (let i = 0; i < total; i++) {
    const t = i / (total - 1);
    setTimeout(() => {
      const angle = baseAngle + (t - 0.5) * fanSpread + (Math.random() - 0.5) * 0.15;
      const length = Math.max(W, H) * (0.7 + Math.random() * 0.4);
      const off = 40 + Math.random() * 60;
      const cx = anchor.x + Math.cos(angle) * off;
      const cy = anchor.y + Math.sin(angle) * off;
      system.add({
        kind: 'slash',
        x: cx, y: cy,
        vx: Math.cos(angle) * 0.25,
        vy: Math.sin(angle) * 0.25,
        rot: angle,
        length,
        width: 4 + Math.random() * 2,
        color: 'rgba(10, 10, 12, 0.95)',
        rim: 'rgba(255, 40, 60, 0.7)',
        age: 0, life: 380 + Math.random() * 120,
        alpha: 1,
      });

      // Tiny embers along the cut
      for (let j = 0; j < 12; j++) {
        const along = (Math.random() - 0.5) * length * 0.9;
        system.add({
          kind: 'spark',
          x: cx + Math.cos(angle) * along,
          y: cy + Math.sin(angle) * along,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6 + 0.3,
          ay: 0.001,
          color: 'rgba(255, 90, 100, 0.9)',
          trail: 3, width: 1.2,
          age: 0, life: 500 + Math.random() * 300,
          alpha: 0.9,
        });
      }
    }, i * 60);
  }

  // Anchor flash
  system.add({
    kind: 'glow',
    x: anchor.x, y: anchor.y,
    vx: 0, vy: 0,
    color: (t) => `rgba(255, 60, 70, ${0.55 * (1 - t)})`,
    size: (t) => 30 + t * 80,
    age: 0, life: 260, alpha: 1,
  });
}
