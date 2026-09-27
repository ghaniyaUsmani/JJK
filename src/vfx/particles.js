/**
 * Minimal particle engine. Each effect module produces particles;
 * the runtime advances and draws them each frame.
 *
 * Particle shape (all optional except position + life):
 *   { x, y, vx, vy, ax, ay, age, life, size, color, kind, rot, vrot, alpha, drag }
 */
export function createParticleSystem() {
  const particles = [];

  return {
    add(p) { particles.push(p); },
    addMany(list) { for (const p of list) particles.push(p); },

    step(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;
        if (p.age >= p.life) {
          particles.splice(i, 1);
          continue;
        }
        p.vx += (p.ax || 0) * dt;
        p.vy += (p.ay || 0) * dt;
        if (p.drag) {
          p.vx *= Math.pow(1 - p.drag, dt / 16.666);
          p.vy *= Math.pow(1 - p.drag, dt / 16.666);
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.rot != null) p.rot += (p.vrot || 0) * dt;
      }
    },

    draw(ctx) {
      for (const p of particles) {
        const t = p.age / p.life;
        const alpha = (p.alpha != null ? p.alpha : 1) * (1 - t);
        ctx.save();
        if (p.blend) ctx.globalCompositeOperation = p.blend;
        ctx.globalAlpha = Math.max(0, alpha);
        drawParticle(ctx, p, t);
        ctx.restore();
      }
    },

    get count() { return particles.length; },
    clear() { particles.length = 0; },
  };
}

function drawParticle(ctx, p, t) {
  const size = typeof p.size === 'function' ? p.size(t) : p.size;
  const color = typeof p.color === 'function' ? p.color(t) : p.color;

  switch (p.kind) {
    case 'glow': {
      const r = size;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case 'spark': {
      ctx.strokeStyle = color;
      ctx.lineWidth = p.width || 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * (p.trail || 6), p.y - p.vy * (p.trail || 6));
      ctx.stroke();
      return;
    }
    case 'slash': {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      const len = p.length * (1 - Math.abs(t * 2 - 1));
      const grad = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = p.width || 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-len / 2, 0);
      ctx.lineTo(len / 2, 0);
      ctx.stroke();
      // subtle rim
      if (p.rim) {
        ctx.strokeStyle = p.rim;
        ctx.lineWidth = (p.width || 3) * 0.35;
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    case 'ring': {
      ctx.strokeStyle = color;
      ctx.lineWidth = p.width || 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    case 'beam': {
      // Linear beam: gradient core with additive halo.
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      const easeIn = Math.min(1, t / 0.15);
      const easeOut = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
      const len = p.length * easeIn * easeOut;
      const halfLen = len / 2;
      const w = (typeof p.width === 'function' ? p.width(t) : p.width) *
                (0.85 + Math.sin(t * 40) * 0.15);
      // outer halo
      const halo = ctx.createLinearGradient(0, -w * 2.2, 0, w * 2.2);
      halo.addColorStop(0, 'rgba(140, 60, 255, 0)');
      halo.addColorStop(0.5, p.haloColor || 'rgba(160, 80, 255, 0.7)');
      halo.addColorStop(1, 'rgba(140, 60, 255, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(-halfLen, -w * 2.2, len, w * 4.4);
      // core
      const core = ctx.createLinearGradient(0, -w, 0, w);
      core.addColorStop(0, 'rgba(255, 255, 255, 0)');
      core.addColorStop(0.5, p.coreColor || 'rgba(255, 240, 255, 0.98)');
      core.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = core;
      ctx.fillRect(-halfLen, -w, len, w * 2);
      ctx.restore();
      return;
    }
    case 'shockwave': {
      // Expanding ring with soft trailing halo
      const r = size;
      ctx.strokeStyle = color;
      ctx.lineWidth = (p.width || 4) * (1 - t);
      ctx.shadowColor = color;
      ctx.shadowBlur = 24 * (1 - t);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }
    case 'orb': {
      // Layered radial glow: dense core + soft halo. Adds an inner
      // white-hot pinpoint that grows with charge.
      const r = size;
      const core = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 0.35);
      core.addColorStop(0, 'rgba(255,255,255,1)');
      core.addColorStop(1, color);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.4, 0, Math.PI * 2);
      ctx.fill();

      const halo = ctx.createRadialGradient(p.x, p.y, r * 0.2, p.x, p.y, r);
      halo.addColorStop(0, color);
      halo.addColorStop(0.5, p.halo || color.replace(/[\d.]+\)$/, '0.4)'));
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case 'vignette': {
      // Screen-edge tint that peaks then fades. Draws a radial gradient
      // dark in the middle so the edges get colored, not the center.
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      const grad = ctx.createRadialGradient(
        w / 2, h / 2, Math.min(w, h) * 0.15,
        w / 2, h / 2, Math.hypot(w, h) / 2
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    case 'flash': {
      // Full-screen white flash
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      return;
    }
    case 'lightning': {
      // Jagged bolt from (x,y) to (tx,ty)
      ctx.strokeStyle = color;
      ctx.lineWidth = p.width || 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      const seg = 10;
      ctx.beginPath();
      let cx = p.x;
      let cy = p.y;
      ctx.moveTo(cx, cy);
      for (let i = 1; i <= seg; i++) {
        const nx = p.x + (p.tx - p.x) * (i / seg) + (Math.random() - 0.5) * 18;
        const ny = p.y + (p.ty - p.y) * (i / seg) + (Math.random() - 0.5) * 18;
        ctx.lineTo(nx, ny);
        cx = nx; cy = ny;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }
    case 'plasma': {
      // Volumetric orb: layered radial gradients with subtle per-frame
      // offsets so the shape ripples like ionised gas rather than a
      // perfect circle. Draws additively so overlapping plasma reads
      // as light emission rather than opaque paint.
      const r = size;
      const layers = p.layers || 4;
      for (let k = 0; k < layers; k++) {
        const jitter = (Math.random() - 0.5) * r * 0.08;
        const jy = (Math.random() - 0.5) * r * 0.08;
        const rk = r * (0.5 + 0.15 * k);
        const grad = ctx.createRadialGradient(
          p.x + jitter, p.y + jy, 0,
          p.x + jitter, p.y + jy, rk
        );
        grad.addColorStop(0, color);
        grad.addColorStop(0.5, p.mid || color.replace(/[\d.]+\)$/, '0.35)'));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x + jitter, p.y + jy, rk, 0, Math.PI * 2);
        ctx.fill();
      }
      // Bright hot pinpoint core
      if (p.core) {
        const cg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 0.22);
        cg.addColorStop(0, p.core);
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    case 'smoke': {
      // Organic dark wisp: offset radial dark blob with irregular shape.
      // Meant to be drawn with 'multiply' or 'source-over' to darken.
      const r = size;
      const layers = 3;
      for (let k = 0; k < layers; k++) {
        const angle = Math.random() * Math.PI * 2;
        const off = r * 0.15 * k;
        const cx = p.x + Math.cos(angle) * off;
        const cy = p.y + Math.sin(angle) * off;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * (0.7 + 0.15 * k));
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r * (0.7 + 0.15 * k), 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    case 'bolt': {
      // Fractal-branching bolt from (x,y) to (tx,ty) with sub-branches.
      const draw = (x1, y1, x2, y2, depth, width) => {
        if (depth === 0 || (Math.abs(x2 - x1) < 4 && Math.abs(y2 - y1) < 4)) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineWidth = width;
          ctx.stroke();
          return;
        }
        const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * (Math.abs(x2 - x1) + Math.abs(y2 - y1)) * 0.15;
        const my = (y1 + y2) / 2 + (Math.random() - 0.5) * (Math.abs(x2 - x1) + Math.abs(y2 - y1)) * 0.15;
        draw(x1, y1, mx, my, depth - 1, width);
        draw(mx, my, x2, y2, depth - 1, width);
        // Occasional sub-branch that dies quickly
        if (depth > 1 && Math.random() < 0.35) {
          const bx = mx + (Math.random() - 0.5) * 60;
          const by = my + (Math.random() - 0.5) * 60;
          draw(mx, my, bx, by, depth - 2, width * 0.55);
        }
      };
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      draw(p.x, p.y, p.tx, p.ty, 5, p.width || 2);
      ctx.shadowBlur = 0;
      return;
    }
    default: {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
