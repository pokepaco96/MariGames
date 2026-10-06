// Browser glue for the noise meter: microphone -> AnalyserNode -> RMS.
// Audio is only analysed here, in memory: nothing is recorded, stored or sent anywhere.
// The analyser is not connected to the speakers, so nothing is played back either.

export function microphoneSupported() {
  return Boolean(
    navigator.mediaDevices?.getUserMedia && (window.AudioContext || window.webkitAudioContext)
  );
}

// Why the microphone could not start, for a friendly message.
export function micErrorKind(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
    case 'NotReadableError':
      return 'no-mic';
    default:
      return 'error';
  }
}

// Asks for the microphone and returns { readSamples, stop, onEnded }.
// Browser processing (auto gain, noise suppression) is turned off when possible,
// otherwise it would flatten exactly the loudness we want to see.
export async function startMicrophone() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx;
  try {
    ctx = new AC();
    if (ctx.state === 'suspended') await ctx.resume();
  } catch (error) {
    stream.getTracks().forEach((t) => t.stop());
    throw error;
  }
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const samples = new Float32Array(analyser.fftSize);

  let stopped = false;
  return {
    readSamples() {
      analyser.getFloatTimeDomainData(samples);
      return samples;
    },
    onEnded(callback) {
      stream.getTracks().forEach((t) => t.addEventListener('ended', callback));
    },
    stop() {
      if (stopped) return;
      stopped = true;
      stream.getTracks().forEach((t) => t.stop());
      source.disconnect();
      if (ctx.state !== 'closed') ctx.close().catch(() => {});
    },
  };
}
