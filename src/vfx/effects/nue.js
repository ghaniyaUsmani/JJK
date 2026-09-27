/**
 * "Nue" — Megumi.
 * A dark shadow pool spreads from the hand area; blue-white lightning
 * arcs upward briefly; a wing-like silhouette hints and fades.
 */
export function nue({ system, anchors, ctx }) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const anchor = anchors[0] || { x: W / 2, y: H * 0.6 };

  // Shadow puddle expanding
  system.add({
    kind: 'glow',
    x: anchor.x, y: anchor.y + 20,
    vx: 0, vy: 0,
    color: (t) => `rgba(4, 6, 14, ${0.85 * (1 - t * 0.6)})`,
    size: (t) => 40 + t * 260,
    age: 0, life: 900, alpha: 1,
  });

  // Inky ring
  system.add({
    kind: 'ring',
    x: anchor.x, y: anchor.y + 20,
    vx: 0, vy: 0,
    color: 'rgba(120, 170, 255, 0.7)',
    size: (t) => 30 + t * 260,
    width: 2,
    age: 0, life: 700, alpha: 1,
  });

  // Lightning bolts arcing up from the pool
  const bolts = 6;
  for (let i = 0; i < bolts; i++) {
    setTimeout(() => {
      const startAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const dist = 120 + Math.random() * 200;
      system.add({
        kind: 'lightning',
        x: anchor.x + (Math.random() - 0.5) * 40,
        y: anchor.y + 10,
        tx: anchor.x + Math.cos(startAngle) * dist,
        ty: anchor.y + Math.sin(startAngle) * dist,
        vx: 0, vy: 0,
        color: 'rgba(180, 220, 255, 0.9)',
        width: 2,
        age: 0, life: 220,
        alpha: 1,
      });
    }, 120 + i * 60);
  }

  // Wing-suggesting arc particles
  for (let i = 0; i < 24; i++) {
    const t = i / 24;
    const side = i < 12 ? -1 : 1;
    const localT = (t % (12 / 24)) * 2;
    const angle = side * (Math.PI * 0.45) * localT - Math.PI / 2 + side * 0.2;
    const dist = 80 + localT * 200;
    setTimeout(() => {
      system.add({
        kind: 'glow',
        x: anchor.x + Math.cos(angle) * dist,
        y: anchor.y + Math.sin(angle) * dist - 30,
        vx: Math.cos(angle) * 0.1,
        vy: Math.sin(angle) * 0.1,
        color: () => `rgba(70, 90, 160, 0.65)`,
        size: (t) => 14 - t * 6,
        age: 0, life: 700,
        alpha: 0.9,
      });
    }, 180 + i * 12);
  }

  // Small sparks trailing
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const speed = 0.4 + Math.random() * 0.7;
      system.add({
        kind: 'spark',
        x: anchor.x + (Math.random() - 0.5) * 60,
        y: anchor.y + Math.random() * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: 'rgba(200, 220, 255, 0.85)',
        trail: 4, width: 1.2,
        age: 0, life: 600 + Math.random() * 300,
        alpha: 0.9,
      });
    }, Math.random() * 400);
  }
}
