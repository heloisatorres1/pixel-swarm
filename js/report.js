/* ===================== Pixel Swarm — in-game report tool =====================
   Players and testers report a problem without leaving the game. A report holds:
   - what the reporter writes: type, how bad it is, title, what happened, what they expected, steps to reproduce;
   - a screenshot of the moment (the HTML interface plus the PixiJS gameplay layer), which can be marked by drawing on it;
   - attached automatically: game state (screen, level, slots, pixels left…), device and build, performance numbers,
     the last actions (used to pre-fill the steps) and the last errors, plus, optionally, a save code so the
     team can load the exact progress.
   No personal information is collected. Sending is simulated (there is no server): Send builds the full report,
   writes a line to the log (Debug › Logs) and keeps the last report in PSReport.lastReport. */
window.PSReport = (function () {
  'use strict';
  const MAX_CRUMBS = 40, MAX_ERRORS = 20, MAX_LOG = 300, LOG_KEY = 'pixelswarm.log';
  const crumbs = [], errors = [];
  const t0 = Date.now();
  let cfg = null, shot = null, shotCanvas = null, ink = null, current = null;
  // ---------- the log: errors, warnings, info and player actions ----------
  // Kept in local storage (the last 300 lines), so after a crash or reload the previous session's log is still there.
  const stamp = () => { const s = Math.round((Date.now() - t0) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  let log = [], saveTimer = 0, logListener = null;
  try { log = (JSON.parse(localStorage.getItem(LOG_KEY)) || []).map((l) => ({ ...l, prev: true })); } catch (e) { log = []; }
  function addLog(level, msg, kind) {
    const text = String(msg).slice(0, 600), last = log[log.length - 1];
    if (last && !last.prev && last.level === level && last.msg === text) last.n = (last.n || 1) + 1; // repeated line: "×5"
    else log.push({ time: new Date().toISOString(), at: stamp(), level, kind: kind || level, msg: text });
    if (log.length > MAX_LOG) log.splice(0, log.length - MAX_LOG);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveLog, level === 'error' ? 0 : 1000); // errors are saved at once (the page may be about to die)
    if (logListener) logListener();
  }
  function saveLog() { try { localStorage.setItem(LOG_KEY, JSON.stringify(log.map(({ prev, ...l }) => l))); } catch (e) { /* ignore */ } }
  window.addEventListener('pagehide', saveLog);
  function crumb(kind, text) {
    addLog('action', text, kind);
    const last = crumbs[crumbs.length - 1];
    if (last && last.kind === kind && last.text === text) { last.n = (last.n || 1) + 1; return; } // "tap block ×5"
    crumbs.push({ at: stamp(), kind, text });
    if (crumbs.length > MAX_CRUMBS) crumbs.shift();
  }
  function logError(kind, msg, level = 'error') {
    addLog(level, msg, kind);
    errors.push({ at: stamp(), kind, msg: String(msg).slice(0, 400) });
    if (errors.length > MAX_ERRORS) errors.shift();
  }
  const str = (a) => (a instanceof Error ? `${a.message}${a.stack ? ' | ' + a.stack.split('\n').slice(1, 3).map((s) => s.trim()).join(' | ') : ''}`
    : typeof a === 'object' ? (() => { try { return JSON.stringify(a); } catch (e) { return String(a); } })() : String(a));
  window.addEventListener('error', (e) => logError('error', `${e.message}${e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno}:${e.colno})` : ''}`));
  window.addEventListener('unhandledrejection', (e) => logError('promise', e.reason ? str(e.reason) : 'rejected promise'));
  // console output goes to the log too (errors and warnings also to the report's "recent errors")
  [['error', 'error'], ['warn', 'warn'], ['info', 'info'], ['log', 'info']].forEach(([k, level]) => {
    const orig = console[k];
    console[k] = function (...args) {
      try {
        const text = args.map(str).join(' ');
        if (level === 'info') addLog('info', text, 'console.' + k); else logError('console.' + k, text, level);
      } catch (e) { /* ignore */ }
      return orig.apply(console, args);
    };
  });
  addLog('info', `session start · ${navigator.userAgent.replace(/^Mozilla\/5\.0 /, '')}`, 'session');

  // ---------- screenshot ----------
  // html-to-image has the browser itself draw the page (through an SVG), so shadows, gradients and rounded corners
  // look exactly as on screen. It is loaded only when the report tool opens.
  let libLoading = null;
  function loadLib() {
    if (window.htmlToImage) return Promise.resolve();
    if (!libLoading) libLoading = new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = 'js/vendor/html-to-image.min.js'; s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
    return libLoading;
  }
  // The WebGL gameplay layer can't be copied like the rest of the page: during the capture a PixiJS snapshot of it
  // sits in its place (same position and size) and the canvas itself is left out.
  async function capture() {
    const root = document.getElementById('app');
    const gl = root.querySelector('canvas.pixi-layer');
    let stand = null;
    if (gl && gl.offsetParent !== null && window.PSRender && PSRender.snapshot) {
      const url = PSRender.snapshot();
      if (url) {
        stand = document.createElement('img');
        stand.className = gl.className; stand.style.cssText = gl.style.cssText; stand.alt = '';
        stand.style.width = gl.style.width || gl.clientWidth + 'px'; stand.style.height = gl.style.height || gl.clientHeight + 'px';
        stand.src = url;
        try { await stand.decode(); } catch (e) { /* draw it anyway */ }
        gl.after(stand);
      }
    }
    try {
      await loadLib();
      return await window.htmlToImage.toCanvas(root, {
        pixelRatio: Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1))), backgroundColor: '#3a2412',
        // left out: the WebGL canvas, this tool, toasts, the perf overlay and images with no picture (an empty <img> makes the capture fail)
        filter: (n) => !(n === gl || n.id === 'popup-report' || n.id === 'toast' || (n.classList && n.classList.contains('perf-hud'))
          || (n.tagName === 'IMG' && (!n.complete || !n.naturalWidth))),
      });
    } catch (e) { logError('report', 'screenshot failed: ' + (e && e.message ? e.message : e)); return null; }
    finally { if (stand) stand.remove(); }
  }

  // ---------- the form ----------
  const TYPES = [['bug', 'Bug'], ['visual', 'Visual'], ['performance', 'Slow / laggy'], ['gameplay', 'Gameplay'], ['idea', 'Idea']];
  // how bad it is, in player words, mapped to the usual QA severity
  const SEVERITY = [['blocker', "Can't play", 'Blocker'], ['major', 'Big problem', 'Major'], ['minor', 'Small problem', 'Minor'], ['trivial', 'Cosmetic', 'Trivial']];
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function chips(boxId, list, value) {
    $(boxId).innerHTML = list.map(([id, label]) => `<button type="button" class="rp-chip${id === value ? ' on' : ''}" data-v="${id}">${label}</button>`).join('');
  }
  // steps pre-filled from the recent actions (the reporter can edit them)
  function suggestedSteps() {
    // (leaves out opening this tool: the Settings or Debug pop-up and the Report tap)
    const useful = crumbs.filter((c) => !(c.kind === 'popup' && /report|settings|debug/.test(c.text)) && !(c.kind === 'tap' && /report/i.test(c.text))).slice(-10);
    return useful.map((c, i) => `${i + 1}. ${c.text}${c.n ? ` (×${c.n})` : ''}`).join('\n');
  }

  async function open(opts = {}) {
    if (!cfg) return;
    current = { type: opts.type || 'bug', severity: opts.severity || 'minor', context: cfg.context(), at: new Date() };
    // the screenshot shows the moment before the report opened
    cfg.toast('Taking a screenshot…');
    shotCanvas = await capture();
    cfg.openPopup('popup-report');
    chips('rp-type', TYPES, current.type);
    chips('rp-sev', SEVERITY, current.severity);
    $('rp-title').value = ''; $('rp-what').value = ''; $('rp-expected').value = '';
    $('rp-steps').value = suggestedSteps();
    $('rp-shot-on').checked = !!shotCanvas; $('rp-shot-on').disabled = !shotCanvas;
    $('rp-save-on').checked = true;
    $('rp-msg').textContent = '';
    setupInk();
    renderIncluded();
    crumb('report', 'opened the report tool');
  }

  // draw on the screenshot to point at the problem
  function setupInk() {
    const c = $('rp-shot');
    c.hidden = !shotCanvas; $('rp-shot-tools').hidden = !shotCanvas;
    if (!shotCanvas) return;
    c.width = shotCanvas.width; c.height = shotCanvas.height;
    const g = c.getContext('2d');
    g.drawImage(shotCanvas, 0, 0);
    ink = { g, drawing: false, last: null, marks: 0 };
    g.strokeStyle = '#ff2d55'; g.lineWidth = Math.max(4, c.width / 90); g.lineCap = g.lineJoin = 'round';
  }
  function inkPoint(e) {
    const c = $('rp-shot'), r = c.getBoundingClientRect();
    return [(e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)];
  }
  function clearInk() { if (shotCanvas) setupInk(); }

  // ---------- building the report ----------
  function build() {
    const sev = SEVERITY.find((s) => s[0] === current.severity), type = TYPES.find((t) => t[0] === current.type);
    const d = current.at, pad = (n) => String(n).padStart(2, '0');
    const id = `PS-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return {
      id, createdAt: d.toISOString(),
      type: type[1], severity: sev[2],
      title: $('rp-title').value.trim() || '(no title)',
      whatHappened: $('rp-what').value.trim(), expected: $('rp-expected').value.trim(), steps: $('rp-steps').value.trim(),
      build: { version: cfg.version, build: cfg.build, url: location.origin + location.pathname, platform: cfg.platform() },
      device: { userAgent: navigator.userAgent, language: navigator.language, viewport: `${innerWidth}×${innerHeight}`,
        screen: `${screen.width}×${screen.height}`, pixelRatio: window.devicePixelRatio, cores: navigator.hardwareConcurrency || null,
        memoryGB: navigator.deviceMemory || null, touch: 'ontouchstart' in window, online: navigator.onLine },
      game: current.context,
      performance: window.PSPerf && PSPerf.snapshot ? PSPerf.snapshot() : null,
      recentActions: crumbs.slice(), recentErrors: errors.slice(),
      save: $('rp-save-on').checked ? cfg.saveCode() : null,
    };
  }
  const screenshotURL = () => (shotCanvas && $('rp-shot-on').checked ? $('rp-shot').toDataURL('image/png') : null);

  // ---------- sending ----------
  function needTitle() {
    if ($('rp-title').value.trim()) return false;
    $('rp-msg').textContent = 'Add a short title first';
    $('rp-title').focus();
    return true;
  }
  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  // Send (simulated): the report is built exactly as it would be uploaded, then logged instead of sent
  let lastReport = null, sending = false;
  function send() {
    if (sending || needTitle()) return;
    sending = true;
    const r = build();
    r.screenshot = screenshotURL() ? 'attached (PNG)' : 'none';
    lastReport = r;
    const btn = document.querySelector('#popup-report [data-send]');
    btn.disabled = true; btn.querySelector('span').textContent = 'Sending…';
    setTimeout(() => {
      addLog('info', `report ${r.id} sent (simulated): [${r.type} · ${r.severity}] "${r.title}"`, 'report');
      crumb('report', `sent report ${r.id}`);
      $('rp-msg').textContent = `Report sent! Reference ${r.id}`;
      btn.querySelector('span').textContent = 'Sent ✓';
      cfg.toast('Thanks for the report!');
      setTimeout(() => { btn.disabled = false; btn.querySelector('span').textContent = 'Send'; sending = false; cfg.closePopup(); }, 1400);
    }, 700);
  }

  // what gets attached, shown before sending
  function renderIncluded() {
    const c = current.context || {};
    $('rp-included').textContent = [
      `Game: ${c.screen || '-'}${c.level ? ', level ' + c.level : ''}`,
      `Build: v${cfg.version} (${cfg.build}, ${cfg.platform()})`,
      `Device: ${innerWidth}×${innerHeight} @${window.devicePixelRatio}x, ${navigator.language}`,
      `Last ${crumbs.length} actions, ${errors.length} errors, performance numbers`,
      'No name, email or other personal data',
    ].join('\n');
  }

  function bind() {
    const pop = $('popup-report');
    pop.addEventListener('click', (e) => {
      const chip = e.target.closest('.rp-chip');
      if (chip) {
        const box = chip.parentElement;
        box.querySelectorAll('.rp-chip').forEach((b) => b.classList.toggle('on', b === chip));
        if (box.id === 'rp-type') current.type = chip.dataset.v; else current.severity = chip.dataset.v;
        return;
      }
      if (e.target.closest('[data-send]')) { send(); return; }
      if (e.target.closest('#rp-clear-ink')) clearInk();
    });
    const c = $('rp-shot');
    c.addEventListener('pointerdown', (e) => { if (!ink) return; ink.drawing = true; ink.last = inkPoint(e); c.setPointerCapture(e.pointerId); e.preventDefault(); });
    c.addEventListener('pointermove', (e) => {
      if (!ink || !ink.drawing) return;
      const p = inkPoint(e);
      ink.g.beginPath(); ink.g.moveTo(...ink.last); ink.g.lineTo(...p); ink.g.stroke();
      ink.last = p; ink.marks++;
    });
    const end = () => { if (ink) ink.drawing = false; };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  }

  // ---------- log viewer (Debug pop-up › Logs tab) ----------
  const clockTime = (iso) => new Date(iso).toLocaleTimeString('en-GB'); // local time, 24h
  const LOG_FILTERS = [['all', 'All'], ['error', 'Errors'], ['warn', 'Warnings'], ['info', 'Info'], ['action', 'Actions']];
  let logFilter = 'all';
  const shown = () => log.filter((l) => logFilter === 'all' || l.level === logFilter);
  const logLine = (l) => `${clockTime(l.time)} [${l.level.toUpperCase()}]${l.kind !== l.level ? ` ${l.kind}:` : ''} ${l.msg}${l.n ? ` (×${l.n})` : ''}${l.prev ? '  (previous session)' : ''}`;
  const counts = () => { const c = { error: 0, warn: 0 }; log.forEach((l) => { if (!l.prev && c[l.level] !== undefined) c[l.level] += l.n || 1; }); return c; };
  function logText() {
    const lines = shown().map(logLine);
    return [`Pixel Swarm log · v${cfg.version} (${cfg.build}, ${cfg.platform()}) · ${new Date().toISOString()} · filter: ${logFilter} · ${lines.length} lines`, ...lines].join('\n');
  }
  function renderLogs() {
    const box = $('lg-list');
    if (!box || $('popup-debug').hidden || $('dbg-pane-logs').hidden) return;
    const c = counts();
    $('lg-filters').innerHTML = LOG_FILTERS.map(([id, label]) => {
      const n = id === 'all' ? log.length : log.filter((l) => l.level === id).length;
      return `<button type="button" class="rp-chip${id === logFilter ? ' on' : ''}" data-f="${id}">${label} <b>${n}</b></button>`;
    }).join('');
    $('lg-summary').textContent = `This session: ${c.error} errors, ${c.warn} warnings · kept: last ${MAX_LOG} lines`;
    const rows = shown();
    box.innerHTML = rows.length ? rows.slice().reverse().map((l) => `<li class="lg-${l.level}${l.prev ? ' prev' : ''}"><span class="lg-t">${clockTime(l.time)}</span>
      <span class="lg-lv">${l.level}</span><span class="lg-m">${l.kind !== l.level ? `<i>${esc(l.kind)}</i> ` : ''}${esc(l.msg)}${l.n ? ` <b>×${l.n}</b>` : ''}</span></li>`).join('')
      : '<li class="lg-empty">Nothing here</li>';
  }
  function showTab(tab) {
    ['tools', 'logs'].forEach((t) => {
      $('dbg-pane-' + t).hidden = t !== tab;
      $('dbg-tab-' + t).setAttribute('aria-selected', String(t === tab));
    });
    renderLogs();
  }
  function openLogs() { cfg.openPopup('popup-debug'); showTab('logs'); }
  const LOG_SEND = {
    copy() { cfg.copyText(logText(), 'Log copied'); },
    async share() {
      const res = await cfg.share({ title: 'Pixel Swarm log', text: logText() });
      if (res === 'unsupported') LOG_SEND.download();
    },
    download() {
      const d = new Date(), pad = (n) => String(n).padStart(2, '0');
      download(`pixel-swarm-log-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.txt`, new Blob([logText()], { type: 'text/plain' }));
      cfg.toast('Log saved');
    },
    clear() { log = []; saveLog(); errors.length = 0; renderLogs(); if (logListener) logListener(); cfg.toast('Log cleared'); },
  };
  function bindLogs() {
    $('popup-debug').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-dtab]');
      if (tab) { showTab(tab.dataset.dtab); return; }
      const f = e.target.closest('[data-f]');
      if (f) { logFilter = f.dataset.f; renderLogs(); return; }
      const s = e.target.closest('[data-log]');
      if (s) LOG_SEND[s.dataset.log]();
    });
  }

  return {
    // config: { openPopup, closePopup, toast, copyText, share, context(), saveCode(), platform(), version, build }
    init(config) { cfg = config; bind(); bindLogs(); },
    open, crumb, logError, build, openLogs, logText, get lastReport() { return lastReport; },
    info: (msg) => addLog('info', msg, 'game'),
    onLog(fn) {
      logListener = () => {
        const c = counts(); fn(c); renderLogs();
        const t = $('dbg-tab-count'); if (t) { t.hidden = !c.error; t.textContent = c.error > 99 ? '99+' : c.error; }
      };
      logListener();
    },
    get log() { return log.slice(); },
    get crumbs() { return crumbs.slice(); }, get errors() { return errors.slice(); }, get hasShot() { return !!shotCanvas; },
  };
})();
