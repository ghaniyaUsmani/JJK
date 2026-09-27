/**
 * Manage the overlay canvas + rAF loop for a particle system.
 * The caller supplies the canvas and the particle system.
 */
export function startVfxLoop({ canvas, system, onFrame }) {
  const ctx = canvas.getContext('2d');
  let last = performance.now();
  let running = true;

  const tick = (now) => {
    if (!running) return;
    const dt = now - last;
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    system.step(dt);
    system.draw(ctx);
    if (onFrame) onFrame(now, dt);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return {
    stop() { running = false; },
  };
}

export function fitCanvasToVideo(canvas, video) {
  const w = video.videoWidth || canvas.clientWidth;
  const h = video.videoHeight || canvas.clientHeight;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
}
