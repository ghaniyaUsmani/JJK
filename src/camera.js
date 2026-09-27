/**
 * Wraps getUserMedia and returns { video, stop, ready }.
 * The returned video is attached to the DOM (or virtual) and playing.
 */
export async function startCamera({ width = 1280, height = 720 } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: width },
      height: { ideal: height },
      facingMode: 'user',
      frameRate: { ideal: 30 },
    },
    audio: false,
  });

  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.srcObject = stream;

  await new Promise((resolve) => {
    if (video.readyState >= 2) return resolve();
    video.addEventListener('loadeddata', () => resolve(), { once: true });
  });

  await video.play().catch(() => { /* autoplay policy may reject */ });

  return {
    video,
    stop() {
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    },
  };
}
