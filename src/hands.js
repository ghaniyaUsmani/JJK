import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let landmarkerPromise = null;

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      return HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    })();
  }
  return landmarkerPromise;
}

/**
 * Start reading hand landmarks from a <video> element on rAF.
 * onLandmarks({ hands: [{landmarks: [{x,y,z}, ×21], handedness}], timestamp })
 * Returns { stop }.
 */
export async function startHands({ video, onLandmarks }) {
  const landmarker = await getLandmarker();
  let running = true;
  let lastTs = -1;

  const tick = () => {
    if (!running) return;
    const now = performance.now();
    // Guard: mediapipe requires strictly increasing timestamps.
    if (video.readyState >= 2 && now > lastTs) {
      lastTs = now;
      let result;
      try {
        result = landmarker.detectForVideo(video, now);
      } catch (e) {
        // transient errors during resize / stream restart
        result = { landmarks: [], handednesses: [] };
      }
      const hands = (result.landmarks || []).map((landmarks, i) => ({
        landmarks,
        handedness:
          result.handednesses && result.handednesses[i] && result.handednesses[i][0]
            ? result.handednesses[i][0].categoryName
            : 'Unknown',
      }));
      onLandmarks({ hands, timestamp: now });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return {
    stop() {
      running = false;
    },
  };
}
