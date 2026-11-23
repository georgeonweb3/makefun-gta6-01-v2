// Sound, synthesized live with WebAudio — no audio files, no network.
// Engine hum follows the car's speed, sirens wail at wanted level 2+,
// and a little bass loop keeps the Strip feeling alive.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = 0;
  let musicStep = 0;
  const BASS = [55, 55, 65.41, 49, 55, 55, 73.42, 65.41];

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(g); g.connect(master);
    src.start(t);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    get muted() { return muted; },
    blip() { tone(880, 0.12, 'square', 0.15, 1320); },
    jingle() {
      tone(523, 0.14, 'square', 0.18);
      setTimeout(() => tone(659, 0.14, 'square', 0.18), 130);
      setTimeout(() => tone(784, 0.3, 'square', 0.2), 260);
    },
    gunshot() { noise(0.14, 0.4); tone(180, 0.1, 'square', 0.25, 60); },
    punch() { noise(0.08, 0.25); },
    crash() { noise(0.25, 0.35); tone(90, 0.2, 'sawtooth', 0.2, 40); },
    pickup() { tone(660, 0.1, 'sine', 0.2, 990); },
    phone() { tone(1200, 0.12, 'sine', 0.15); setTimeout(() => tone(1200, 0.12, 'sine', 0.15), 180); },
    update(dt, speed, wanted) {
      if (!ctx) return;
      if (engineGain) {
        engineGain.gain.value = speed > 20 ? 0.05 + Math.min(0.09, speed / 6000) : 0;
        engineOsc.frequency.value = 45 + Math.abs(speed) * 0.22;
      }
      if (sirenGain) {
        if (wanted >= 2) {
          sirenGain.gain.value = 0.045;
          sirenOsc.frequency.value = 650 + Math.sin(ctx.currentTime * 4) * 180;
        } else {
          sirenGain.gain.value = 0;
        }
      }
      // A slow bass loop, one note every half second.
      musicTimer += dt;
      if (musicTimer > 0.5) {
        musicTimer = 0;
        musicStep = (musicStep + 1) % BASS.length;
        tone(BASS[musicStep], 0.45, 'triangle', 0.07);
      }
    },
  };
}
