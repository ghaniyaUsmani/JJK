import { startCamera } from '../camera.js';
import { startHands } from '../hands.js';
import { toFeatureVector } from '../features.js';
import { saveModel } from '../storage.js';
import { recalibrateThreshold } from '../recognizer/model.js';
import { createCaptureSession } from './captureSession.js';
import { drawLandmarks } from '../ui/landmarks.js';
import { renderPermissionCard, renderLoading } from '../ui/states.js';

const TARGET_SAMPLES = 15;

export function mountTrainer(root, ctx) {
  root.innerHTML = renderShell();

  const panel = root.querySelector('.trainer-panel');
  const cameraFrame = root.querySelector('.camera-frame');
  const statusEl = root.querySelector('.stage-status');
  const overlayHost = root.querySelector('.stage');

  let stopHands = null;
  let stopCam = null;
  let overlayCanvas = null;
  let latestFeature = null;
  let session = null;
  let selectedGestureId = firstIdWithFewestSamples(ctx.model);
  let disposed = false;

  const teardown = () => {
    disposed = true;
    if (session) session.stop();
    if (stopHands) stopHands.stop();
    if (stopCam) stopCam.stop();
  };

  renderList();

  (async () => {
    try {
      overlayHost.querySelector('.state-loading')?.remove();
      cameraFrame.insertAdjacentHTML('beforeend', renderLoading('Waking the camera'));
      const { video, stop } = await startCamera();
      if (disposed) { stop(); return; }
      stopCam = { stop };
      cameraFrame.querySelector('.state-loading')?.remove();
      cameraFrame.prepend(video);

      overlayCanvas = document.createElement('canvas');
      overlayCanvas.className = 'overlay';
      overlayCanvas.width = video.videoWidth || 1280;
      overlayCanvas.height = video.videoHeight || 720;
      cameraFrame.appendChild(overlayCanvas);
      const octx = overlayCanvas.getContext('2d');

      cameraFrame.insertAdjacentHTML('beforeend', renderLoading('Loading hand tracker'));
      const hands = await startHands({
        video,
        onLandmarks: ({ hands: handList }) => {
          if (disposed) return;
          const feature = toFeatureVector(handList);
          latestFeature = feature;
          drawLandmarks(octx, handList, overlayCanvas.width, overlayCanvas.height);

          if (session) session.pushFrame(feature);
        },
      });
      if (disposed) { hands.stop(); return; }
      stopHands = hands;
      cameraFrame.querySelector('.state-loading')?.remove();
    } catch (err) {
      console.error(err);
      overlayHost.innerHTML = renderPermissionCard(err);
    }
  })();

  // event delegation for record / clear
  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.closest('.gesture-card').dataset.id;
    if (btn.dataset.action === 'record') startRecording(id);
    else if (btn.dataset.action === 'clear') clearGesture(id);
    else if (btn.dataset.action === 'stop') stopRecording();
  });

  panel.addEventListener('click', (e) => {
    const card = e.target.closest('.gesture-card');
    if (!card || e.target.closest('button')) return;
    selectedGestureId = card.dataset.id;
    renderList();
  });

  // Keyboard: Space = record selected; Esc = stop
  const onKey = (e) => {
    if (e.target.closest('input, textarea, [contenteditable]')) return;
    if (e.code === 'Space' && !session) {
      e.preventDefault();
      startRecording(selectedGestureId);
    } else if (e.code === 'Escape' && session) {
      e.preventDefault();
      stopRecording();
    }
  };
  window.addEventListener('keydown', onKey);

  function startRecording(gestureId) {
    if (session) return;
    selectedGestureId = gestureId;
    cameraFrame.setAttribute('data-recording', 'true');
    setStatus({ visible: true, kind: 'countdown', text: '3' });
    session = createCaptureSession({
      gestureId,
      target: TARGET_SAMPLES,
      framesPerSample: 22,
      onCountdown: ({ remainingMs, completed, target }) => {
        const n = Math.max(1, Math.ceil(remainingMs / 400));
        setStatus({
          visible: true,
          kind: 'countdown',
          text: String(n),
          sub: `${completed} / ${target} captured`,
        });
      },
      onRecording: ({ progress, completed, target }) => {
        const pct = Math.round(progress * 100);
        setStatus({
          visible: true,
          kind: 'recording',
          text: `Recording sample ${completed + 1} of ${target}`,
          sub: `${pct}%`,
        });
      },
      onSample: ({ gestureId, sample }) => {
        const g = ctx.model.gestures[gestureId];
        g.samples.push(sample);
        recalibrateThreshold(g);
        saveModel(ctx.model);
        renderList();
      },
      onDone: ({ completed, target, aborted }) => {
        session = null;
        cameraFrame.removeAttribute('data-recording');
        setStatus({
          visible: true,
          kind: 'done',
          text: aborted ? 'Stopped' : 'Training complete',
          sub: `${completed} / ${target} samples`,
        });
        setTimeout(() => setStatus({ visible: false }), 1800);
        renderList();
      },
    });
    renderList();
  }

  function stopRecording() {
    if (session) session.stop();
  }

  function clearGesture(id) {
    const g = ctx.model.gestures[id];
    g.samples = [];
    g.threshold = null;
    saveModel(ctx.model);
    renderList();
  }

  function renderList() {
    const gestures = Object.values(ctx.model.gestures);
    panel.querySelector('.gesture-list').innerHTML = gestures
      .map((g) => renderCard(g, {
        selected: g.id === selectedGestureId,
        recording: session && session.state.gestureId === g.id,
        target: TARGET_SAMPLES,
      }))
      .join('');
  }

  function setStatus({ visible, kind, text, sub }) {
    if (!visible) {
      statusEl.setAttribute('data-visible', 'false');
      return;
    }
    statusEl.setAttribute('data-visible', 'true');
    statusEl.className = 'stage-status' + (kind === 'countdown' ? ' countdown' : '');
    statusEl.innerHTML =
      kind === 'countdown'
        ? `<div class="countdown-num">${text}</div>${sub ? `<div>${sub}</div>` : ''}`
        : kind === 'recording'
          ? `<span class="rec-dot"></span><span>${text}</span>${sub ? `<span>· ${sub}</span>` : ''}`
          : `<span>${text}</span>${sub ? `<span>· ${sub}</span>` : ''}`;
  }

  return () => {
    window.removeEventListener('keydown', onKey);
    teardown();
  };
}

function renderShell() {
  return `
    <section class="screen trainer" aria-label="Train screen">
      <aside class="trainer-panel" aria-label="Techniques">
        <div class="panel-heading">
          <div class="eyebrow">Techniques</div>
          <div class="eyebrow" title="Space to record · Esc to stop">⎵ · Esc</div>
        </div>
        <ul class="gesture-list"></ul>
      </aside>
      <div class="stage">
        <div class="camera-frame"></div>
        <div class="stage-status" data-visible="false"></div>
      </div>
    </section>
  `;
}

function renderCard(g, { selected, recording, target }) {
  const dots = Array.from({ length: target }, (_, i) =>
    `<span class="dot" data-filled="${i < g.samples.length}"></span>`
  ).join('');
  return `
    <li>
      <article class="gesture-card"
               data-id="${g.id}"
               data-selected="${selected ? 'true' : 'false'}"
               data-recording="${recording ? 'true' : 'false'}"
               tabindex="0"
               aria-label="${g.label}">
        <header class="gesture-name">
          <span>${g.label}</span>
          <span class="kanji">${g.kanji}</span>
        </header>
        <div class="gesture-meta">
          <span>${g.character}</span>
          <span>${g.samples.length} / ${target}</span>
        </div>
        <div class="sample-dots" aria-hidden="true">${dots}</div>
        <div class="gesture-actions">
          ${recording
            ? `<button class="btn btn-danger" data-action="stop">Stop</button>`
            : `<button class="btn btn-primary" data-action="record">Record</button>`}
          <button class="btn btn-ghost" data-action="clear" ${g.samples.length === 0 ? 'disabled' : ''}>Clear</button>
        </div>
      </article>
    </li>
  `;
}

function firstIdWithFewestSamples(model) {
  const gestures = Object.values(model.gestures);
  gestures.sort((a, b) => a.samples.length - b.samples.length);
  return gestures[0].id;
}
