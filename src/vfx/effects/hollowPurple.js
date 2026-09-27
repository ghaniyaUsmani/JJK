/**
 * "Hollow Purple" — Gojo's technique effect.
 *
 * Rendered assuming ADDITIVE blending is enabled by the play stage
 * (globalCompositeOperation = 'lighter'). Dark tendrils are drawn
 * back into 'source-over' via a per-particle blend override.
 *
 * Sequence — grows from a pinpoint at screen center and consumes the
 * frame; camera video shows through additive light, feeling like a
 * real luminescence rather than a painted circle:
 *
 *   0–450ms    SEED    tiny arc-white pinpoint; inward-drawn sparks
 *   450–1300ms EXPAND  layered plasma orb with turbulent edges + bolts
 *   1300–1900ms PEAK   full-screen wash; slow bolt lattice; dark wisps
 *   1900–2600ms RECEDE plasma contracts, embers linger, wisps dissipate
 *
 * All visuals are original procedural gradients drawn on canvas.
 */
export function hollowPurple({ system, ctx }) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const maxR = Math.hypot(W, H) / 2;

  const T_SEED = 450;
  const T_EXPAND = 850;
  const T_PEAK = 600;
  const T_RECEDE = 700;

  // ---- Palette (deep indigo → violet plasma → blue-white core) ----
  const COL = {
    coreHot:   'rgba(220, 210, 255, 0.98)', // arc-white, plasma core
    coreEdge:  'rgba(170, 140, 255, 0.55)',
    plasma:    'rgba(90, 45, 210, 0.75)',
    plasmaMid: 'rgba(60, 25, 160, 0.45)',
    plasmaLo:  'rgba(30, 8, 90, 0.35)',
    spark:     'rgba(190, 160, 255, 0.9)',
    bolt:      'rgba(220, 200, 255, 0.85)',
    wisp:      'rgba(4, 2, 14, 0.6)',   // cursed-energy black
    vignette:  'rgba(24, 6, 70, 0.62)',
  };

  // === SEED PHASE =====================================================
  // Bright arc-white pinpoint that ramps up smoothly.
  system.add({
    kind: 'plasma',
    x: cx, y: cy, vx: 0, vy: 0,
    color: COL.coreEdge,
    mid: COL.plasmaMid,
    core: COL.coreHot,
    size: (t) => 4 + Math.pow(t, 0.7) * 44,
    layers: 2,
    age: 0, life: T_SEED, alpha: 1,
  });

  // Inward-drawn sparks feeding the seed
  for (let i = 0; i < 16; i++) {
    setTimeout(() => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 80;
      const life = 220 + Math.random() * 120;
      system.add({
        kind: 'spark',
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * (dist / life) * 1.3,
        vy: -Math.sin(angle) * (dist / life) * 1.3,
        color: COL.spark,
        trail: 6, width: 1.3,
        age: 0, life,
        alpha: 0.9,
      });
    }, Math.random() * (T_SEED - 80));
  }

  // === EXPAND PHASE ===================================================
  setTimeout(() => {
    // Volumetric plasma orb that grows from ~40px to maxR.
    // Ease-out ~ Math.pow(1-t, 2.6) for a decisive but not linear inflate.
    system.add({
      kind: 'plasma',
      x: cx, y: cy, vx: 0, vy: 0,
      color: COL.plasma,
      mid: COL.plasmaMid,
      core: COL.coreHot,
      size: (t) => {
        const e = 1 - Math.pow(1 - t, 2.6);
        return 40 + e * (maxR - 40);
      },
      layers: 3,
      age: 0, life: T_EXPAND, alpha: 1,
    });

    // Secondary softer halo that lingers slightly ahead of the core
    system.add({
      kind: 'plasma',
      x: cx, y: cy, vx: 0, vy: 0,
      color: COL.plasmaLo,
      mid: COL.plasmaLo,
      size: (t) => {
        const e = 1 - Math.pow(1 - t, 2.2);
        return 60 + e * (maxR * 1.15);
      },
      layers: 2,
      age: 0, life: T_EXPAND, alpha: 0.85,
    });

    // Fractal-branching bolts radiating outward from center
    for (let i = 0; i < 7; i++) {
      setTimeout(() => {
        const angle = Math.random() * Math.PI * 2;
        const reach = maxR * (0.55 + Math.random() * 0.5);
        system.add({
          kind: 'bolt',
          x: cx, y: cy,
          tx: cx + Math.cos(angle) * reach,
          ty: cy + Math.sin(angle) * reach,
          vx: 0, vy: 0,
          color: COL.bolt,
          width: 1.6,
          age: 0, life: 180,
          alpha: 1,
        });
      }, 40 + i * 70);
    }

    // Radial sparks — fewer, faster, with real drag so they slow naturally
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2 + Math.random() * 0.12;
      const speed = 0.9 + Math.random() * 1.9;
      system.add({
        kind: 'spark',
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        drag: 0.015,
        color: COL.spark,
        trail: 6, width: 1.8,
        age: 0, life: 600 + Math.random() * 400,
        alpha: 0.95,
      });
    }

  }, T_SEED);

  // === PEAK PHASE =====================================================
  setTimeout(() => {
    // Screen-edge vignette peaks with the technique
    system.add({
      kind: 'vignette',
      x: 0, y: 0, vx: 0, vy: 0,
      color: COL.vignette,
      blend: 'source-over',
      age: 0, life: T_PEAK + 300, alpha: 1,
    });

    // Slow bolt lattice — internal cursed lightning holding the volume
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const a1 = Math.random() * Math.PI * 2;
        const a2 = a1 + Math.PI + (Math.random() - 0.5) * 0.7;
        const r1 = maxR * (0.35 + Math.random() * 0.55);
        const r2 = maxR * (0.35 + Math.random() * 0.55);
        system.add({
          kind: 'bolt',
          x: cx + Math.cos(a1) * r1,
          y: cy + Math.sin(a1) * r1,
          tx: cx + Math.cos(a2) * r2,
          ty: cy + Math.sin(a2) * r2,
          vx: 0, vy: 0,
          color: COL.bolt,
          width: 1.6,
          age: 0, life: 220,
          alpha: 0.9,
        });
      }, Math.random() * T_PEAK);
    }

    // A gentle plasma sustain to keep the peak lit
    system.add({
      kind: 'plasma',
      x: cx, y: cy, vx: 0, vy: 0,
      color: COL.plasma,
      mid: COL.plasmaMid,
      core: COL.coreEdge,
      size: () => maxR * 0.95,
      layers: 2,
      age: 0, life: T_PEAK, alpha: 0.75,
    });

  }, T_SEED + T_EXPAND);

  // === RECEDE PHASE ===================================================
  setTimeout(() => {
    // Collapsing plasma — starts at full screen and contracts smoothly.
    system.add({
      kind: 'plasma',
      x: cx, y: cy, vx: 0, vy: 0,
      color: COL.plasma,
      mid: COL.plasmaMid,
      core: COL.coreEdge,
      size: (t) => maxR * Math.pow(1 - t, 1.5),
      layers: 2,
      age: 0, life: T_RECEDE, alpha: 1,
    });

    // Bright core hold at center that fades slower
    system.add({
      kind: 'plasma',
      x: cx, y: cy, vx: 0, vy: 0,
      color: COL.coreEdge,
      mid: COL.plasmaMid,
      core: COL.coreHot,
      size: (t) => 120 * Math.pow(1 - t, 1.2),
      layers: 2,
      age: 0, life: T_RECEDE, alpha: 1,
    });

    // Drifting embers left behind
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * maxR * 0.7;
      system.add({
        kind: 'glow',
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12 - 0.1,
        color: COL.spark,
        size: (t) => 10 - t * 6,
        age: 0, life: 700 + Math.random() * 500,
        alpha: 0.85,
      });
    }
  }, T_SEED + T_EXPAND + T_PEAK - 120);
}
