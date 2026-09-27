import { startCamera } from '../camera.js';
import { startHands } from '../hands.js';
import { startSegmenter } from '../segmentation.js';
import { toFeatureVector } from '../features.js';
import { createClassifier } from '../recognizer/classifier.js';
import { effects } from '../vfx/registry.js';
import { createParticleSystem } from '../vfx/particles.js';
import { renderPermissionCard, renderLoading, renderEmptyPlay } from '../ui/states.js';
import { drawLandmarks } from '../ui/landmarks.js';

export function mountPlay(root, ctx) {
  const anyTrained = Object.values(ctx.model.gestures).some((g) => g.samples.length >= 2);

  if (!anyTrained) {
    root.innerHTML = `<section class="screen"><div class="stage">${renderEmptyPlay()}</div></section>`;
    return () => {};
  }

  root.innerHTML = renderShell();
  const stage = root.querySelector('.play');
  const cameraFrame = root.querySelector('.camera-frame');
  const stageCanvas = root.querySelector('canvas.stage-canvas');
  const hud = root.querySelector('.play-hud');
  const nameEl = hud.querySelector('.last-gesture-name');
  const kanjiEl = hud.querySelector('.last-gesture-kanji');
  const confFill = hud.querySelector('.conf-bar-fill');
  const live = document.getElementById('live-region');

  const classifier = createClassifier(ctx.model);
  const system = createParticleSystem();

  let stopHands = null;
  let stopCam = null;
  let stopSeg = null;
  let disposed = false;
  let latestAnchors = [];
  let latestHands = [];    // raw landmarks for the current frame
  let latestMask = null;   // { canvas, width, height }
  let latestMaskAt = 0;
  let landmarksRevealUntil = 0;
  let landmarksRevealDuration = 1800;
  let video = null;
  let rafId = null;
  let idleTimer = null;
  hud.setAttribute('data-idle', 'true');

  const stageCtx = stageCanvas.getContext('2d');

  (async () => {
    try {
      cameraFrame.insertAdjacentHTML('beforeend', renderLoading('Waking the camera'));
      const cam = await startCamera();
      if (disposed) { cam.stop(); return; }
      stopCam = cam;
      video = cam.video;
      cameraFrame.querySelector('.state-loading')?.remove();

      fitStageCanvas();
      window.addEventListener('resize', fitStageCanvas);

      cameraFrame.insertAdjacentHTML('beforeend', renderLoading('Loading hand tracker'));
      const hands = await startHands({
        video,
        onLandmarks: ({ hands: handList }) => {
          if (disposed) return;
          const feature = toFeatureVector(handList);
          classifier.push(feature);
          latestHands = handList;
          latestAnchors = anchorsFromHands(
            handList,
            stageCanvas.width,
            stageCanvas.height
          );
        },
      });
      if (disposed) { hands.stop(); return; }
      stopHands = hands;
      cameraFrame.querySelector('.state-loading')?.remove();

      // Segmenter starts after hands so the initial UX shows quickly.
      cameraFrame.insertAdjacentHTML('beforeend', renderLoading('Enabling depth'));
      try {
        const seg = await startSegmenter({
          video,
          targetFps: 12,
          shouldRun: () => system.count > 0, // only segment while an effect is active
          onMask: (mask) => {
            latestMask = mask;
            latestMaskAt = performance.now();
          },
        });
        if (disposed) { seg.stop(); return; }
        stopSeg = seg;
      } catch (e) {
        console.warn('Segmentation unavailable, falling back to overlay-only', e);
      }
      cameraFrame.querySelector('.state-loading')?.remove();

      // Start the composite loop
      let last = performance.now();
      const tick = (now) => {
        if (disposed) return;
        const dt = now - last;
        last = now;

        fitStageCanvas();
        system.step(dt);
        drawScene(now, dt);

        const hit = classifier.tick(now);
        if (hit) fire(hit);

        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    } catch (err) {
      console.error(err);
      stage.innerHTML = renderPermissionCard(err);
    }
  })();

  function drawScene(now, dt) {
    const W = stageCanvas.width;
    const H = stageCanvas.height;
    stageCtx.clearRect(0, 0, W, H);

    if (!video || video.videoWidth === 0) return;

    // --- Background: mirrored camera video (bg + person visible) ---
    stageCtx.save();
    stageCtx.translate(W, 0);
    stageCtx.scale(-1, 1);
    drawCover(stageCtx, video, W, H, video.videoWidth, video.videoHeight);
    stageCtx.restore();

    // Fast path: when idle (no active VFX), just show the video and skip
    // the additive/mask compositing entirely.
    if (system.count === 0) return;

    // --- VFX layer (additive blending for realistic light emission) ---
    stageCtx.save();
    stageCtx.globalCompositeOperation = 'lighter';
    system.draw(stageCtx);
    stageCtx.restore();

    // --- Person layer on top: redraw the mirrored video, clipped by mask ---
    // Only composite when we have a recent mask (< 300 ms old). Otherwise
    // the effect just plays over the video, which still looks good.
    const maskFresh = latestMask && (now - latestMaskAt) < 300;
    if (maskFresh) {
      const person = getPersonCanvas(W, H);
      const pctx = person.getContext('2d');
      pctx.clearRect(0, 0, W, H);
      pctx.save();
      pctx.translate(W, 0);
      pctx.scale(-1, 1);
      drawCover(pctx, video, W, H, video.videoWidth, video.videoHeight);
      pctx.restore();
      pctx.save();
      pctx.globalCompositeOperation = 'destination-in';
      pctx.translate(W, 0);
      pctx.scale(-1, 1);
      drawCover(pctx, latestMask.canvas, W, H, latestMask.width, latestMask.height);
      pctx.restore();
      stageCtx.drawImage(person, 0, 0);
    }

    // --- Landmark reveal on top: brief flash of the tracked hand-skeleton
    //     when a gesture fires, as visible acknowledgement of what was
    //     recognised. Fades in ~150 ms, holds, fades out over last ~350 ms.
    const revealLeft = landmarksRevealUntil - now;
    if (revealLeft > 0 && latestHands.length > 0) {
      const total = landmarksRevealDuration;
      const t = 1 - revealLeft / total;
      let alpha = 1;
      if (t < 0.08) alpha = t / 0.08;
      else if (t > 0.8) alpha = Math.max(0, (1 - t) / 0.2);
      stageCtx.save();
      stageCtx.globalAlpha = alpha;
      drawLandmarks(stageCtx, latestHands, W, H, {
        mirror: true,
        clear: false,
        boneWidth: 3,
        tipRadius: 5,
        jointRadius: 3.4,
        glow: true,
      });
      stageCtx.restore();
    }
  }

  function fire(hit) {
    const eff = effects[hit.id];
    if (eff) {
      eff({
        system,
        anchors: latestAnchors,
        ctx: stageCtx,
      });
    }
    const composed = hit.character ? `${hit.character} — ${hit.label}` : hit.label;
    nameEl.textContent = composed;
    kanjiEl.textContent = hit.kanji || '';
    confFill.style.width = `${Math.round(hit.score * 100)}%`;
    hud.setAttribute('data-idle', 'false');
    if (live) live.textContent = `${composed} triggered`;
    // Reveal current landmarks briefly, matching the effect duration
    landmarksRevealUntil = performance.now() + landmarksRevealDuration;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => hud.setAttribute('data-idle', 'true'), 3000);
  }

  function fitStageCanvas() {
    // Cap at 1 DPR — the video source is 720p-ish so extra pixels are
    // wasted work, and the VFX + segmenter budget benefits from every
    // saved millisecond.
    const rect = stageCanvas.getBoundingClientRect();
    const targetW = Math.max(1, Math.round(rect.width));
    const targetH = Math.max(1, Math.round(rect.height));
    if (stageCanvas.width !== targetW) stageCanvas.width = targetW;
    if (stageCanvas.height !== targetH) stageCanvas.height = targetH;
  }

  return () => {
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    clearTimeout(idleTimer);
    window.removeEventListener('resize', fitStageCanvas);
    if (stopSeg) stopSeg.stop();
    if (stopHands) stopHands.stop();
    if (stopCam) stopCam.stop();
  };
}

// ---------------------------------------------------------------------

let _personCanvas = null;
function getPersonCanvas(w, h) {
  if (!_personCanvas) _personCanvas = document.createElement('canvas');
  if (_personCanvas.width !== w) _personCanvas.width = w;
  if (_personCanvas.height !== h) _personCanvas.height = h;
  return _personCanvas;
}

/**
 * Draw `source` into ctx at (0,0) targetW×targetH with object-fit: cover.
 * Source dimensions passed explicitly so we work for both HTMLVideoElement
 * (videoWidth/videoHeight) and other canvases.
 */
function drawCover(ctx, source, targetW, targetH, srcW, srcH) {
  const srcAR = srcW / srcH;
  const targetAR = targetW / targetH;
  let sw, sh, sx, sy;
  if (srcAR > targetAR) {
    sh = srcH;
    sw = sh * targetAR;
    sx = (srcW - sw) / 2;
    sy = 0;
  } else {
    sw = srcW;
    sh = sw / targetAR;
    sx = 0;
    sy = (srcH - sh) / 2;
  }
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, targetW, targetH);
}

function anchorsFromHands(hands, W, H) {
  const anchors = [];
  for (const h of hands) {
    const pts = h.landmarks;
    if (!pts || pts.length < 21) continue;
    const p = pts[9];
    anchors.push({
      x: (1 - p.x) * W,  // mirror x to match the mirrored stage
      y: p.y * H,
    });
  }
  return anchors;
}

function renderShell() {
  return `
    <section class="screen play" aria-label="Play screen">
      <div class="camera-frame">
        <canvas class="stage-canvas" aria-label="Camera view with technique effects"></canvas>
      </div>
      <aside class="play-hud" data-idle="true" aria-label="Last technique">
        <div class="eyebrow">Last Technique</div>
        <div class="last-gesture">
          <span class="last-gesture-name">—</span>
          <span class="kanji last-gesture-kanji"></span>
        </div>
        <div class="conf-bar" aria-hidden="true">
          <div class="conf-bar-fill"></div>
        </div>
      </aside>
    </section>
  `;
}
