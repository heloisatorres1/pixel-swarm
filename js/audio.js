/* ===================== Pixel Swarm — music & sound effects =====================
   Everything is synthesized live with the Web Audio API: no audio files, no licences, nothing to download.
   - PSAudio.sfx(name)        play a sound effect (see SFX below)
   - PSAudio.music('menu' | 'game' | null)   switch the background music (cross-fades)
   - PSAudio.setMusic(on) / PSAudio.setSfx(on)  follow the Settings switches
   Browsers only allow sound after the player's first tap: the engine starts itself on that tap.
*/
window.PSAudio = (function () {
  'use strict';
  let ctx = null, master, musicBus, sfxBus, noiseBuf = null;
  let musicOn = true, sfxOn = true, wanted = null, current = null, timer = null;
  const VOL = { music: 0.32, sfx: 0.55 };

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    // gentle compressor so stacked sounds never clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    master.connect(comp).connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? VOL.music : 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? VOL.sfx : 0; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  // first tap anywhere: start (or resume) the audio and the music that was asked for
  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (wanted && wanted !== current) startMusic(wanted);
  }
  ['pointerdown', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // ---------- small synth voices ----------
  // tone: oscillator with an attack/decay envelope (+ optional pitch slide)
  function tone(bus, { type = 'sine', freq = 440, to, t = ctx.currentTime, dur = 0.15, vol = 0.3, attack = 0.005, release, filter, detune = 0 }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const rel = release === undefined ? dur : release;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + rel);
    let node = o;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = filter.type || 'lowpass'; f.frequency.value = filter.freq; f.Q.value = filter.q || 0.7; o.connect(f); node = f; }
    node.connect(g).connect(bus);
    o.start(t); o.stop(t + attack + rel + 0.05);
  }
  // noise: filtered white noise burst (whoosh, crack, shaker)
  function noise(bus, { t = ctx.currentTime, dur = 0.2, vol = 0.2, type = 'bandpass', freq = 2000, to, q = 1, attack = 0.005 }) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t); if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  // marimba-ish pluck (sine + soft overtone, quick decay)
  function pluck(bus, midi, t, vol = 0.22, dur = 0.5) {
    tone(bus, { type: 'sine', freq: hz(midi), t, dur, vol, attack: 0.004 });
    tone(bus, { type: 'sine', freq: hz(midi) * 4, t, dur: dur * 0.25, vol: vol * 0.18, attack: 0.002 });
  }

  // ---------- SOUND EFFECTS ----------
  const last = {}, played = {}; // played: counts per sound (see PSAudio.debug)
  const SFX = {
    tap:     (t) => tone(sfxBus, { type: 'triangle', freq: 900, to: 1200, t, dur: 0.06, vol: 0.18 }),
    pick:    (t) => { tone(sfxBus, { type: 'triangle', freq: 520, to: 980, t, dur: 0.09, vol: 0.28 }); pluck(sfxBus, 84, t + 0.05, 0.12, 0.2); },
    eat:     (t) => tone(sfxBus, { type: 'sine', freq: 1300 + Math.random() * 500, to: 2200, t, dur: 0.05, vol: 0.07 }),
    slot:    (t) => { pluck(sfxBus, 79, t, 0.2, 0.35); pluck(sfxBus, 84, t + 0.07, 0.18, 0.4); },
    error:   (t) => tone(sfxBus, { type: 'square', freq: 180, to: 140, t, dur: 0.16, vol: 0.08, filter: { freq: 900 } }),
    coin:    (t) => { tone(sfxBus, { type: 'square', freq: hz(88), t, dur: 0.07, vol: 0.08, filter: { freq: 4000 } }); tone(sfxBus, { type: 'square', freq: hz(93), t: t + 0.07, dur: 0.18, vol: 0.08, filter: { freq: 4000 } }); },
    booster: (t) => { [72, 76, 79, 84].forEach((m, i) => pluck(sfxBus, m, t + i * 0.05, 0.16, 0.3)); },
    wind:    (t) => noise(sfxBus, { t, dur: 0.9, vol: 0.35, freq: 400, to: 3000, q: 0.8, attack: 0.25 }),
    ice:     (t) => { noise(sfxBus, { t, dur: 0.18, vol: 0.4, type: 'highpass', freq: 3000 }); tone(sfxBus, { type: 'triangle', freq: 2400, to: 1400, t, dur: 0.12, vol: 0.12 }); },
    hammer:  (t) => { tone(sfxBus, { type: 'sine', freq: 160, to: 60, t, dur: 0.18, vol: 0.5 }); noise(sfxBus, { t, dur: 0.12, vol: 0.3, freq: 1200 }); },
    crack:   (t) => { noise(sfxBus, { t, dur: 0.35, vol: 0.45, freq: 900, to: 300, q: 0.6 }); tone(sfxBus, { type: 'sine', freq: 120, to: 50, t, dur: 0.25, vol: 0.4 }); },
    key:     (t) => { [84, 88, 91, 96].forEach((m, i) => pluck(sfxBus, m, t + i * 0.06, 0.13, 0.35)); },
    unlock:  (t) => { tone(sfxBus, { type: 'square', freq: 700, t, dur: 0.04, vol: 0.12, filter: { freq: 2500 } }); [79, 83, 86, 91].forEach((m, i) => pluck(sfxBus, m, t + 0.08 + i * 0.07, 0.16, 0.45)); },
    star:    (t) => { pluck(sfxBus, 91, t, 0.2, 0.5); tone(sfxBus, { type: 'sine', freq: hz(103), t, dur: 0.3, vol: 0.05 }); },
    win:     (t) => {
      [72, 76, 79, 84].forEach((m, i) => pluck(sfxBus, m, t + i * 0.11, 0.24, 0.6));
      [84, 88, 91].forEach((m) => tone(sfxBus, { type: 'triangle', freq: hz(m), t: t + 0.5, dur: 1.1, vol: 0.09, attack: 0.03 }));
      noise(sfxBus, { t: t + 0.5, dur: 0.6, vol: 0.06, type: 'highpass', freq: 7000 });
    },
    lose:    (t) => { [67, 64, 60, 55].forEach((m, i) => tone(sfxBus, { type: 'triangle', freq: hz(m), to: hz(m) * 0.97, t: t + i * 0.2, dur: 0.32, vol: 0.18, filter: { freq: 1800 } })); },
    whoosh:  (t) => noise(sfxBus, { t, dur: 0.3, vol: 0.18, freq: 800, to: 2500, q: 0.7, attack: 0.08 }),
  };
  // limits so fast repeats (bugs eating many pixels) never pile up into noise
  const GAP = { eat: 0.045, tap: 0.04, error: 0.15 };
  function sfx(name) {
    if (!sfxOn || !SFX[name] || !ensure() || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    if (GAP[name] && last[name] && t - last[name] < GAP[name]) return;
    last[name] = t;
    try { SFX[name](t + 0.005); played[name] = (played[name] || 0) + 1; } catch (e) { /* ignore */ }
  }

  // ---------- BACKGROUND MUSIC: a cozy forest loop, composed live ----------
  // Two moods share one engine: 'menu' (calm) and 'game' (a little brighter and busier).
  // Chords loop through 4 bars; the melody uses a fixed motif (A A B A over 16 bars) so it sounds composed, not random.
  const SONGS = {
    menu: { bpm: 84, chords: [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 65]], // Cmaj7 Am7 Fmaj7 G7
      motifs: [[76, null, 79, 76, 74, null, 72, null], [72, null, 74, 76, 79, null, 76, null], [81, 79, 76, null, 74, 76, 72, null], [74, null, 72, null, 67, null, null, null]],
      shaker: false, lead: 0.11 },
    game: { bpm: 104, chords: [[48, 55, 64, 72], [43, 50, 59, 67], [45, 52, 60, 69], [41, 48, 57, 65]], // C G Am F
      motifs: [[72, 76, 79, null, 76, 79, 81, 79], [76, null, 74, 72, 74, 76, null, null], [79, 81, 84, 81, 79, 76, 74, 76], [72, null, 74, null, 72, null, null, null]],
      shaker: true, lead: 0.1 },
  };
  const FORM = [0, 0, 1, 0, 2, 2, 3, 0]; // which motif each half-phrase uses (A A B A, C C D A)
  let song = null, step = 0, nextTime = 0, gainNode = null;

  function scheduleStep(s, i, t, out) {
    const beat = 60 / s.bpm, eighth = beat / 2, bar = Math.floor(i / 8), pos = i % 8;
    const chord = s.chords[bar % 4];
    // pad: soft chord at the start of each bar
    if (pos === 0) chord.slice(1).forEach((m) => {
      tone(out, { type: 'triangle', freq: hz(m), t, dur: beat * 4, vol: 0.035, attack: 0.35, release: beat * 3.6, filter: { freq: 1400 } });
      tone(out, { type: 'sine', freq: hz(m + 12), t, dur: beat * 4, vol: 0.012, attack: 0.5, release: beat * 3.4, detune: 6 });
    });
    // bass on beats 1 and 3
    if (pos === 0 || pos === 4) tone(out, { type: 'sine', freq: hz(chord[0] - 12 + (pos === 4 ? 7 : 0)), t, dur: beat * 1.6, vol: 0.13, attack: 0.01 });
    // melody
    const motif = s.motifs[FORM[Math.floor(i / 8) % FORM.length]], note = motif[pos];
    if (note) pluck(out, note, t, s.lead, eighth * 3);
    // light shaker on off-beats (game only)
    if (s.shaker && pos % 2 === 1) noise(out, { t, dur: 0.05, vol: 0.025, type: 'highpass', freq: 6000 });
    // little sparkle every 4 bars
    if (pos === 0 && bar % 4 === 3) pluck(out, chord[3] + 24, t + beat * 3, 0.05, 1.2);
  }
  function loop() {
    if (!song || !ctx) return;
    while (nextTime < ctx.currentTime + 0.25) {
      scheduleStep(song, step, nextTime, gainNode); played.musicSteps = (played.musicSteps || 0) + 1;
      nextTime += 60 / song.bpm / 2; step = (step + 1) % (8 * FORM.length);
    }
    timer = setTimeout(loop, 60);
  }
  function startMusic(name) {
    current = name;
    clearTimeout(timer);
    const old = gainNode;
    if (old) { old.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25); setTimeout(() => old.disconnect(), 1500); }
    if (!name) { song = null; gainNode = null; return; }
    song = SONGS[name]; step = 0; nextTime = ctx.currentTime + 0.1;
    gainNode = ctx.createGain(); gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    gainNode.gain.setTargetAtTime(1, ctx.currentTime + 0.05, 0.4); // fade in
    gainNode.connect(musicBus);
    loop();
  }
  function music(name) {
    wanted = name;
    if (!ctx || ctx.state !== 'running') return; // starts on the first tap
    if (name !== current) startMusic(name);
  }

  function setMusic(on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? VOL.music : 0, ctx.currentTime, 0.15); }
  function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? VOL.sfx : 0, ctx.currentTime, 0.05); }

  // debug: what has played so far (used by the dev test #audiotest)
  const debug = () => ({ state: ctx ? ctx.state : 'none', music: current, played: { ...played } });
  return { sfx, music, setMusic, setSfx, unlock, debug };
})();
