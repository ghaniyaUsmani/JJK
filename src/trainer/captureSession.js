/**
 * Multi-sample capture loop.
 *
 * A single "session" records N samples of a given gesture, with a
 * countdown before each. Each sample is a fixed-length sequence of
 * feature vectors captured over ~0.7 s.
 *
 * Public API:
 *   const session = createCaptureSession({ gestureId, target, framesPerSample,
 *                                          onCountdown, onRecording, onSample, onDone });
 *   session.pushFrame(feature);  // called every frame from the trainer UI
 *   session.stop();
 */
export function createCaptureSession({
  gestureId,
  target = 15,
  framesPerSample = 22,
  countdownMs = 1200,
  cooldownMs = 500,
  onCountdown = () => {},
  onRecording = () => {},
  onSample = () => {},
  onDone = () => {},
}) {
  const state = {
    gestureId,
    target,
    completed: 0,
    phase: 'countdown', // countdown | recording | rest | done
    recordingBuf: [],
    phaseStart: performance.now(),
    stopped: false,
  };

  onCountdown({ remainingMs: countdownMs, completed: 0, target });

  return {
    pushFrame(feature, now = performance.now()) {
      if (state.stopped) return;

      const elapsed = now - state.phaseStart;

      if (state.phase === 'countdown') {
        const remaining = Math.max(0, countdownMs - elapsed);
        onCountdown({ remainingMs: remaining, completed: state.completed, target });
        if (elapsed >= countdownMs) {
          state.phase = 'recording';
          state.phaseStart = now;
          state.recordingBuf = [];
          onRecording({ completed: state.completed, target, progress: 0 });
        }
        return;
      }

      if (state.phase === 'recording') {
        if (feature) state.recordingBuf.push(feature.vec);
        onRecording({
          completed: state.completed,
          target,
          progress: state.recordingBuf.length / framesPerSample,
        });
        if (state.recordingBuf.length >= framesPerSample) {
          const sample = state.recordingBuf.slice();
          state.completed += 1;
          onSample({ gestureId, sample, completed: state.completed, target });
          if (state.completed >= target) {
            state.phase = 'done';
            onDone({ completed: state.completed, target });
            state.stopped = true;
            return;
          }
          state.phase = 'rest';
          state.phaseStart = now;
        }
        return;
      }

      if (state.phase === 'rest') {
        if (elapsed >= cooldownMs) {
          state.phase = 'countdown';
          state.phaseStart = now;
        }
        return;
      }
    },

    stop() {
      state.stopped = true;
      onDone({ completed: state.completed, target, aborted: true });
    },

    get state() {
      return { ...state, recordingBuf: undefined };
    },
  };
}
