import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';

let segmenterPromise = null;

async function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      return ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
    })();
  }
  return segmenterPromise;
}

/**
 * Start a per-frame segmenter over a video source. Each frame, the
 * callback receives a Uint8Array mask (personness per pixel; non-zero
 * = person) plus its width/height. Caller is responsible for the
 * mask's canvas compositing.
 */
export async function startSegmenter({ video, onMask, targetFps = 15, shouldRun = () => true }) {
  const segmenter = await getSegmenter();
  let running = true;
  let lastTs = -1;
  const frameInterval = 1000 / targetFps;
  let nextAllowedAt = 0;

  // Reusable ImageData buffer to avoid allocations
  let personMaskCanvas = document.createElement('canvas');
  let personCtx = personMaskCanvas.getContext('2d', { willReadFrequently: true });
  let cachedW = 0;
  let cachedH = 0;
  let imageData = null;

  const tick = () => {
    if (!running) return;
    const now = performance.now();
    if (video.readyState >= 2 && now > lastTs && now >= nextAllowedAt && shouldRun()) {
      lastTs = now;
      nextAllowedAt = now + frameInterval;
      try {
        segmenter.segmentForVideo(video, now, (result) => {
          if (!running) return;
          const mask = result.categoryMask;
          if (!mask) return;
          const w = mask.width;
          const h = mask.height;
          const bytes = mask.getAsUint8Array();

          if (w !== cachedW || h !== cachedH) {
            personMaskCanvas.width = w;
            personMaskCanvas.height = h;
            imageData = personCtx.createImageData(w, h);
            cachedW = w;
            cachedH = h;
          }

          // Selfie segmenter (binary): pixel value 0 == person, non-zero == background.
          // Some model versions invert this. We treat value < 128 as person by convention;
          // if the mask is inverted visually, flip the comparison.
          const data = imageData.data;
          for (let i = 0, j = 0; i < bytes.length; i++, j += 4) {
            const isPerson = bytes[i] < 128;
            data[j] = 255;
            data[j + 1] = 255;
            data[j + 2] = 255;
            data[j + 3] = isPerson ? 255 : 0;
          }
          personCtx.putImageData(imageData, 0, 0);

          try { mask.close(); } catch (_) { /* older versions may not need close */ }

          onMask({ canvas: personMaskCanvas, width: w, height: h });
        });
      } catch (e) {
        // transient errors during resize / stream restart
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return {
    stop() { running = false; },
  };
}
