/* Generated sound effects (Web Audio). No sound files needed. */
(function () {
  let ctx = null;
  let muted = false;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, to = null, dur = 0.15, type = 'sine', vol = 0.18, delay = 0, attack = 0.01 }) {
    if (muted) return;
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.2, vol = 0.12, delay = 0, freq = 800 }) {
    if (muted) return;
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime + delay;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = a.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(a.destination);
    src.start(t0);
  }

  const sfx = {
    unlock: () => ac(),
    get muted() { return muted; },
    setMuted(m) { muted = m; },
    tap: () => tone({ freq: 660, dur: 0.06, type: 'triangle', vol: 0.08 }),
    step: () => tone({ freq: 140 + Math.random() * 30, dur: 0.04, type: 'square', vol: 0.025 }),
    open: () => { tone({ freq: 400, to: 800, dur: 0.18, type: 'triangle', vol: 0.12 }); noise({ dur: 0.25, vol: 0.05, freq: 1500 }); },
    back: () => tone({ freq: 700, to: 350, dur: 0.16, type: 'triangle', vol: 0.1 }),
    good: () => { tone({ freq: 660, dur: 0.12, type: 'triangle' }); tone({ freq: 990, dur: 0.18, type: 'triangle', delay: 0.09 }); },
    bad: () => { tone({ freq: 220, to: 150, dur: 0.22, type: 'sawtooth', vol: 0.08 }); },
    ping: () => { tone({ freq: 1800, to: 1200, dur: 0.12, type: 'sine', vol: 0.15 }); },
    echo: (delay) => tone({ freq: 1300, to: 1000, dur: 0.08, type: 'sine', vol: 0.06, delay }),
    bubble: () => tone({ freq: 300 + Math.random() * 300, to: 900, dur: 0.09, type: 'sine', vol: 0.08 }),
    gulp: () => { tone({ freq: 500, to: 200, dur: 0.1, type: 'square', vol: 0.06 }); },
    breath: () => { noise({ dur: 0.45, vol: 0.14, freq: 2400 }); },
    hurt: () => { tone({ freq: 300, to: 90, dur: 0.35, type: 'sawtooth', vol: 0.1 }); noise({ dur: 0.2, vol: 0.08, freq: 600 }); },
    hint: () => { tone({ freq: 880, dur: 0.1, type: 'sine', vol: 0.1 }); tone({ freq: 1175, dur: 0.14, type: 'sine', vol: 0.1, delay: 0.08 }); },
    songNote(long) {
      if (long) tone({ freq: 220, to: 330, dur: 0.55, type: 'sine', vol: 0.22, attack: 0.08 });
      else tone({ freq: 880, to: 1320, dur: 0.14, type: 'sine', vol: 0.18 });
    },
    solve() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.25, type: 'triangle', vol: 0.15, delay: i * 0.1 }));
      tone({ freq: 1568, dur: 0.5, type: 'sine', vol: 0.1, delay: 0.42 });
    },
    escape() {
      const notes = [392, 523, 659, 784, 659, 784, 1047];
      notes.forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.16, delay: i * 0.13 }));
      noise({ dur: 1.2, vol: 0.08, delay: 0.2, freq: 900 });
    },
  };

  window.ER.sfx = sfx;
})();
