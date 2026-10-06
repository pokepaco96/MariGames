import { useEffect, useRef, useState } from 'react';
import { baselineFrom, createNoiseMonitor, levelFromRms, rms, thresholdsFor } from './engine.js';
import { micErrorKind, microphoneSupported, startMicrophone } from './microphone.js';

const TICK_MS = 50; // 20 readings per second
const CALIBRATION_MS = 3000;
const COMPLETE_MESSAGE_MS = 3000;

const ZONE_UI = {
  green: { label: 'Quiet', face: '😊', hint: 'Nice and quiet!' },
  yellow: { label: 'Getting loud', face: '😮', hint: 'Softer voices, please' },
  red: { label: 'Too loud!', face: '🙉', hint: 'Shhh... quiet voices' },
};

const MESSAGES = {
  unsupported: {
    title: 'Microphone not available',
    text: "This browser can't use the microphone here. Please open this page in an up-to-date Chrome, Edge, Safari or Firefox.",
  },
  denied: {
    title: 'Microphone access is blocked',
    text: 'To use the noise meter, allow microphone access for this site in your browser (look for the 🔒 or 🎤 icon next to the address), then try again.',
  },
  'no-mic': {
    title: 'No microphone found',
    text: 'Connect a microphone (or check that no other app is using it), then try again.',
  },
  error: {
    title: 'The microphone could not start',
    text: 'Something went wrong while starting the microphone. Please try again.',
  },
};

// Classroom noise traffic light: microphone level -> green / yellow / red.
// Status: idle | starting | calibrating | active | stopped | unsupported | denied | no-mic | error
export default function NoiseMeter() {
  const [status, setStatus] = useState(() => (microphoneSupported() ? 'idle' : 'unsupported'));
  const [progress, setProgress] = useState(0);
  const [reading, setReading] = useState({ level: 0, zone: 'green' });
  const [thresholds, setThresholds] = useState(null);
  const [justCalibrated, setJustCalibrated] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenMissing, setFullscreenMissing] = useState(false);

  const mic = useRef(null);
  const loop = useRef(null);
  const messageTimer = useRef(null);
  const attempt = useRef(0); // a start that resolves after stop/leaving is discarded

  const stopLoop = () => {
    clearInterval(loop.current);
    loop.current = null;
  };

  const readLevel = () => levelFromRms(rms(mic.current.readSamples()));

  // Stops everything: loop, timers, microphone tracks and audio nodes.
  const release = () => {
    attempt.current++;
    stopLoop();
    clearTimeout(messageTimer.current);
    mic.current?.stop();
    mic.current = null;
  };

  // Leaving the screen always turns the microphone off.
  useEffect(() => () => release(), []);

  const monitor = (limits) => {
    const meter = createNoiseMonitor(limits);
    setReading({ level: 0, zone: 'green' });
    setStatus('active');
    setJustCalibrated(true);
    messageTimer.current = setTimeout(() => setJustCalibrated(false), COMPLETE_MESSAGE_MS);
    loop.current = setInterval(() => setReading(meter.update(readLevel(), performance.now())), TICK_MS);
  };

  const calibrate = () => {
    stopLoop();
    clearTimeout(messageTimer.current);
    setJustCalibrated(false);
    setProgress(0);
    setStatus('calibrating');
    const levels = [];
    const start = performance.now();
    loop.current = setInterval(() => {
      levels.push(readLevel());
      const done = Math.min(1, (performance.now() - start) / CALIBRATION_MS);
      setProgress(done);
      if (done >= 1) {
        stopLoop();
        const limits = thresholdsFor(baselineFrom(levels));
        setThresholds(limits);
        monitor(limits);
      }
    }, TICK_MS);
  };

  const enable = async () => {
    release();
    const id = attempt.current;
    setStatus('starting');
    try {
      const started = await startMicrophone();
      if (id !== attempt.current) {
        started.stop(); // the teacher left or pressed stop meanwhile
        return;
      }
      mic.current = started;
      started.onEnded(() => {
        // e.g. the microphone was unplugged
        if (mic.current !== started) return;
        release();
        setStatus('stopped');
      });
      calibrate();
    } catch (error) {
      if (id === attempt.current) setStatus(micErrorKind(error));
    }
  };

  const stop = () => {
    release();
    setStatus('stopped');
  };

  // Full screen (for projecting on the board). Works without it too.
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
      return;
    }
    const page = document.documentElement;
    if (!document.fullscreenEnabled || !page.requestFullscreen) {
      setFullscreenMissing(true);
      return;
    }
    page.requestFullscreen().catch(() => setFullscreenMissing(true));
  };

  const zone = ZONE_UI[reading.zone];
  const level = Math.round(reading.level);
  const message = MESSAGES[status];

  return (
    <div className={`noise-meter is-${status}`}>
      <h1 className="nm-title">Classroom Noise Monitor</h1>

      {(status === 'idle' || status === 'starting' || status === 'stopped') && (
        <div className="nm-panel">
          <div className="nm-big-icon" aria-hidden="true">🚦</div>
          <p className="nm-text">
            {status === 'stopped'
              ? 'The microphone is off.'
              : 'Shows how loud the classroom is: green, yellow or red.'}
          </p>
          <button type="button" className="big-btn big-btn-play" onClick={enable} disabled={status === 'starting'}>
            <span aria-hidden="true">🎤</span> {status === 'starting' ? 'Waiting for permission…' : 'Enable microphone'}
          </button>
        </div>
      )}

      {message && (
        <div className="nm-panel nm-message" role="alert">
          <h2 className="nm-message-title">{message.title}</h2>
          <p className="nm-text">{message.text}</p>
          {status !== 'unsupported' && (
            <button type="button" className="big-btn big-btn-play" onClick={enable}>
              <span aria-hidden="true">🎤</span> Try again
            </button>
          )}
        </div>
      )}

      {status === 'calibrating' && (
        <div className="nm-panel">
          <h2 className="nm-message-title">Calibrate the classroom</h2>
          <p className="nm-text">Stay quiet for a few seconds…</p>
          <div
            className="nm-progress"
            role="progressbar"
            aria-label="Calibration"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      {status === 'active' && (
        <div className="nm-active">
          <div className="nm-light" data-zone={reading.zone} role="status" aria-label={zone.label}>
            <span className="nm-face" aria-hidden="true">{zone.face}</span>
            <span className="nm-label">{zone.label}</span>
          </div>
          <div className="nm-side">
            <p className="nm-hint">{zone.hint}</p>
            <div className="nm-lamps" aria-hidden="true">
              {['green', 'yellow', 'red'].map((z) => (
                <span key={z} className={`nm-lamp nm-lamp-${z} ${reading.zone === z ? 'is-lit' : ''}`} />
              ))}
            </div>
            <div className="nm-level">
              <div className="nm-level-head">
                <span>Noise level</span>
                <span className="nm-level-value">{level}%</span>
              </div>
              <div
                className="nm-bar"
                data-zone={reading.zone}
                role="meter"
                aria-label="Noise level"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={level}
              >
                <span className="nm-bar-fill" style={{ width: `${reading.level}%` }} />
                {thresholds && (
                  <>
                    <span className="nm-mark nm-mark-yellow" style={{ left: `${thresholds.yellow}%` }} />
                    <span className="nm-mark nm-mark-red" style={{ left: `${thresholds.red}%` }} />
                  </>
                )}
              </div>
            </div>
            {justCalibrated && (
              <p className="nm-done" role="status">
                ✅ Calibration complete!
              </p>
            )}
            <div className="nm-buttons">
              <button type="button" className="big-btn nm-btn" onClick={calibrate}>
                <span aria-hidden="true">🔄</span> Recalibrate
              </button>
              <button type="button" className="big-btn nm-btn nm-btn-stop" onClick={stop}>
                <span aria-hidden="true">⏹️</span> Stop microphone
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="nm-footer">
        <button type="button" className="big-btn nm-btn" onClick={toggleFullscreen}>
          <span aria-hidden="true">🖥️</span> {fullscreen ? 'Exit full screen' : 'Full screen'}
        </button>
        {fullscreenMissing && <p className="nm-small" role="status">Full screen is not available on this device.</p>}
        <p className="nm-small">
          🔒 Audio stays on this device. Nothing is recorded or uploaded.
          <br />
          The noise level is relative to your classroom, not decibels.
        </p>
      </div>
    </div>
  );
}
