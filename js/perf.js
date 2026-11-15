/* ===================== Pixel Swarm — performance debug =====================
   A live overlay (FPS, frame times, game-loop and render cost, memory, renderer and scene counts), a stress test
   (hundreds of extra flying bugs) and a benchmark that produces a report to copy into a bug ticket.
   Open it from the Debug menu, or with index.html#perf (overlay) / #perfbench / #perfstress (automatic benchmark,
   result in document.body.dataset.perf for headless runs). */
window.PSPerf = (function () {
  'use strict';
  const RING = 240;                        // frames kept for the graph and the live numbers
  const LONG_FRAME = 50;                   // ms: a frame this long is a visible hitch
  const STRESS_STEPS = [0, 300, 1000];
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } } };

  const frames = new Float32Array(RING);
  let head = 0, count = 0, last = 0, rafOn = false, longFrames = 0, longTasks = 0;
  const samples = { tick: [], render: [] }; // recent costs (ms)
  let el = null, graph = null, text = null, collapsed = false, corner = +(store.get('pixelswarm.perf.corner') || 0);
  let stressIndex = 0, bench = null, lastReport = null, infoFn = () => ({}), uiTimer = 0;

  // ---------- measuring ----------
  function loop(t) {
    if (last) {
      const dt = t - last;
      frames[head] = dt; head = (head + 1) % RING; count = Math.min(RING, count + 1);
      if (dt > LONG_FRAME) longFrames++;
      if (bench) bench.frames.push(dt);
    }
    last = t;
    const r = window.PSRender && PSRender.stats ? PSRender.stats().renderMs : undefined;
    if (r !== undefined) sample('render', r);
    if (el || bench) requestAnimationFrame(loop); else { rafOn = false; last = 0; }
  }
  function ensureLoop() { if (!rafOn) { rafOn = true; last = 0; requestAnimationFrame(loop); } }
  try { // the browser's own "this task blocked the page for 50 ms+" report (Chromium)
    new PerformanceObserver((list) => { longTasks += list.getEntries().length; if (bench) bench.longTasks += list.getEntries().length; })
      .observe({ type: 'longtask', buffered: false });
  } catch (e) { /* not supported */ }

  // cost of one piece of work (the game calls sample('tick', ms) for every game-loop step)
  function sample(name, ms) {
    const a = samples[name] || (samples[name] = []);
    a.push(ms); if (a.length > 120) a.shift();
    if (bench) (bench.samples[name] || (bench.samples[name] = [])).push(ms);
  }

  const recent = () => { const out = []; for (let i = 0; i < count; i++) out.push(frames[(head - count + i + RING) % RING]); return out; };
  const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
  const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  // "1% low": FPS of the slowest 1% of frames (shows stutter that an average hides)
  const low1 = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => y - x); return 1000 / avg(s.slice(0, Math.max(1, Math.ceil(s.length / 100)))); };
  const heapMB = () => (performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null);
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;

  // ---------- overlay ----------
  const CSS = `
  .perf-hud { position: fixed; z-index: 10000; width: 196px; padding: 6px 7px 7px; border-radius: 8px; background: rgba(16, 18, 24, .82);
    color: #e8ecf2; font: 11px/1.35 ui-monospace, Consolas, monospace; pointer-events: none; user-select: none; box-shadow: 0 2px 10px rgba(0,0,0,.35); }
  .perf-hud.c0 { top: calc(env(safe-area-inset-top) + 4px); left: 4px; } .perf-hud.c1 { top: calc(env(safe-area-inset-top) + 4px); right: 4px; }
  .perf-hud.c2 { bottom: calc(env(safe-area-inset-bottom) + 4px); right: 4px; } .perf-hud.c3 { bottom: calc(env(safe-area-inset-bottom) + 4px); left: 4px; }
  .perf-hud .ph { display: flex; justify-content: space-between; align-items: center; gap: 4px; pointer-events: auto; cursor: pointer; font-weight: 700; font-size: 12px; }
  .perf-hud .ph b { font-size: 15px; } .perf-hud .good { color: #7ee08a; } .perf-hud .warn { color: #ffd166; } .perf-hud .bad { color: #ff6b6b; }
  .perf-hud pre { margin: 3px 0 4px; font: inherit; white-space: pre; }
  .perf-hud canvas { display: block; width: 182px; height: 40px; border-radius: 4px; background: rgba(255,255,255,.06); }
  .perf-hud .pb { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; margin-top: 5px; pointer-events: auto; }
  .perf-hud button { padding: 4px 0; border: 0; border-radius: 5px; background: #2f3542; color: #e8ecf2; font: 600 10px ui-monospace, Consolas, monospace; cursor: pointer; }
  .perf-hud button:active { background: #4b5366; } .perf-hud button.on { background: #b5651d; }
  .perf-hud .pmsg { margin-top: 4px; color: #ffd166; white-space: pre-wrap; }
  .perf-hud.min pre, .perf-hud.min canvas, .perf-hud.min .pb, .perf-hud.min .pmsg { display: none; }`;

  function build() {
    if (!document.getElementById('perf-css')) {
      const s = document.createElement('style'); s.id = 'perf-css'; s.textContent = CSS; document.head.appendChild(s);
    }
    el = document.createElement('div');
    el.className = `perf-hud c${corner}` + (collapsed ? ' min' : '');
    el.innerHTML = `<div class="ph" title="Tap to collapse"><span>PERF</span><span><b class="pf">--</b> fps</span></div>
      <pre></pre><canvas width="364" height="80"></canvas>
      <div class="pb"><button data-p="stress">Stress</button><button data-p="bench">Bench</button>
      <button data-p="copy">Copy</button><button data-p="move">Move</button></div><div class="pmsg"></div>`;
    text = el.querySelector('pre'); graph = el.querySelector('canvas');
    el.querySelector('.ph').addEventListener('click', () => { collapsed = !collapsed; el.classList.toggle('min', collapsed); });
    el.querySelector('.pb').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      e.stopPropagation();
      ({ stress: cycleStress, bench: () => run(10), copy: copyReport, move })[b.dataset.p]();
    });
    document.body.appendChild(el);
    updateButtons();
  }
  function move() { corner = (corner + 1) % 4; el.className = `perf-hud c${corner}` + (collapsed ? ' min' : ''); store.set('pixelswarm.perf.corner', corner); }
  const msg = (m) => { if (el) el.querySelector('.pmsg').textContent = m; };
  function updateButtons() {
    if (!el) return;
    const s = el.querySelector('[data-p=stress]'), n = STRESS_STEPS[stressIndex];
    s.textContent = n ? `${n} bugs` : 'Stress'; s.classList.toggle('on', !!n);
    el.querySelector('[data-p=bench]').classList.toggle('on', !!bench);
  }

  const grade = (fps) => (fps >= 55 ? 'good' : fps >= 40 ? 'warn' : 'bad');
  function draw() {
    if (!el) return;
    const a = recent(), fps = a.length ? 1000 / avg(a) : 0, st = window.PSRender && PSRender.stats ? PSRender.stats() : {};
    const info = infoFn() || {}, heap = heapMB();
    const pf = el.querySelector('.pf'); pf.textContent = Math.round(fps); pf.className = 'pf ' + grade(fps);
    const lines = [
      `frame ${r1(avg(a))} ms  p95 ${r1(pct(a, 0.95))}`,
      `1% low ${Math.round(low1(a))} fps  hitches ${longFrames}`,
      `game tick ${r2(avg(samples.tick))} ms`,
      `render   ${st.renderMs !== undefined ? r2(avg(samples.render)) + ' ms' : 'n/a'}`,
      `heap ${heap === null ? 'n/a' : r1(heap) + ' MB'}  long tasks ${longTasks}`,
      `${st.renderer || '...'}${st.resolution ? ' @' + r1(st.resolution) + 'x' : ''}`,
      `objects ${st.objects ?? '-'}  DOM ${document.getElementsByTagName('*').length}`,
      `bugs ${info.bugs ?? 0}  fx ${st.effects ?? 0}  stress ${st.stress ?? 0}`,
      `${info.screen || ''}${info.level ? '  ' + info.level : ''}`,
    ];
    text.textContent = lines.join('\n');
    // frame-time graph: one bar per frame, green under the 60 fps budget, yellow under 30 fps, red above
    const g = graph.getContext('2d'), W = graph.width, H = graph.height, max = 50, bw = W / RING;
    g.clearRect(0, 0, W, H);
    a.forEach((v, i) => {
      g.fillStyle = v <= 17.5 ? '#7ee08a' : v <= 33.4 ? '#ffd166' : '#ff6b6b';
      const h = Math.min(H, (v / max) * H);
      g.fillRect(W - (a.length - i) * bw, H - h, Math.max(1, bw - 0.5), h);
    });
    g.fillStyle = 'rgba(255,255,255,.45)';
    g.fillRect(0, H - (16.7 / max) * H, W, 1); g.fillRect(0, H - (33.3 / max) * H, W, 1);
  }

  function show(on) {
    if (on && !el) { build(); ensureLoop(); uiTimer = setInterval(draw, 250); }
    if (!on && el) { clearInterval(uiTimer); el.remove(); el = null; if (stressIndex) setStress(0); }
    store.set('pixelswarm.perf', on ? '1' : '');
    return !!el;
  }
  const toggle = () => show(!el);

  // ---------- stress test ----------
  function setStress(n) {
    stressIndex = Math.max(0, STRESS_STEPS.indexOf(n));
    const done = window.PSRender && PSRender.stress ? PSRender.stress(n) : 0;
    updateButtons();
    return done;
  }
  function cycleStress() {
    const n = STRESS_STEPS[(stressIndex + 1) % STRESS_STEPS.length];
    if (setStress(n) === 0 && n) msg('Stress test needs the WebGL renderer');
    else msg(n ? `Stress: ${n} extra bugs` : 'Stress off');
  }

  // ---------- benchmark ----------
  function run(seconds = 10) {
    if (bench) return bench.promise;
    let done;
    bench = { frames: [], samples: {}, longTasks: 0, heap0: heapMB(), t0: performance.now(), promise: new Promise((r) => { done = r; }) };
    ensureLoop(); updateButtons();
    let left = seconds; msg(`Benchmark… ${left} s`);
    const timer = setInterval(() => { left -= 1; if (left > 0) msg(`Benchmark… ${left} s`); }, 1000);
    setTimeout(() => {
      clearInterval(timer);
      const b = bench; bench = null; updateButtons();
      lastReport = makeReport(b, seconds);
      document.body.dataset.perf = JSON.stringify(lastReport);
      const f = lastReport.fps;
      msg(`${f.avg} fps avg, ${f.low1} 1% low, ${lastReport.frameMs.p95} ms p95, ${lastReport.hitches} hitches → Copy`);
      done(lastReport);
    }, seconds * 1000);
    return bench.promise;
  }
  function makeReport(b, seconds) {
    const a = b.frames, st = window.PSRender && PSRender.stats ? PSRender.stats() : {}, info = infoFn() || {}, heap = heapMB();
    const cost = (k) => { const s = b.samples[k] || []; return { avg: r2(avg(s)), p95: r2(pct(s, 0.95)), max: r2(s.length ? Math.max(...s) : 0) }; };
    return {
      date: new Date().toISOString(), seconds, frames: a.length,
      fps: { avg: r1(a.length / ((performance.now() - b.t0) / 1000)), low1: r1(low1(a)) },
      frameMs: { avg: r1(avg(a)), p50: r1(pct(a, 0.5)), p95: r1(pct(a, 0.95)), p99: r1(pct(a, 0.99)), max: r1(a.length ? Math.max(...a) : 0) },
      hitches: a.filter((v) => v > LONG_FRAME).length, longTasks: b.longTasks,
      gameTickMs: cost('tick'), renderMs: cost('render'),
      heapMB: b.heap0 === null ? null : { start: r1(b.heap0), end: r1(heap) },
      scene: { renderer: st.renderer, size: st.size, resolution: st.resolution, objects: st.objects, stressBugs: st.stress || 0,
        domNodes: document.getElementsByTagName('*').length, ...info },
      device: { userAgent: navigator.userAgent, pixelRatio: window.devicePixelRatio, cores: navigator.hardwareConcurrency || null,
        memoryGB: navigator.deviceMemory || null, viewport: `${innerWidth}×${innerHeight}`, screen: `${screen.width}×${screen.height}` },
    };
  }
  function copyReport() {
    if (!lastReport) return msg('Run Bench first');
    const t = JSON.stringify(lastReport, null, 2);
    const ok = () => msg('Report copied');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, () => fallbackCopy(t, ok));
    else fallbackCopy(t, ok);
  }
  function fallbackCopy(t, ok) {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); ok(); } catch (e) { msg('Copy failed'); } ta.remove();
  }

  return {
    show, toggle, sample, run, setStress, copyReport,
    setInfo(fn) { infoFn = fn; },
    get on() { return !!el; }, get report() { return lastReport; },
    get wasOn() { return store.get('pixelswarm.perf') === '1'; },
  };
})();
