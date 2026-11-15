/* ===================== Pixel Swarm — in-game report tool =====================
   Players and testers report a problem without leaving the game. A report holds:
   - what the reporter writes: type, how bad it is, title, what happened, what they expected, steps to reproduce;
   - a screenshot of the moment (the HTML interface plus the PixiJS gameplay layer), which can be marked by drawing on it;
   - attached automatically: game state (screen, level, slots, pixels left…), device and build, performance numbers,
     the last actions (used to pre-fill the steps) and the last errors, plus, optionally, a save code so the
     team can load the exact progress.
   No personal information is collected. The report can be shared (share sheet), downloaded as a single HTML file
   (readable anywhere, with the data embedded as JSON), copied as Markdown or opened as a GitHub issue. */
window.PSReport = (function () {
  'use strict';
  const MAX_CRUMBS = 40, MAX_ERRORS = 20;
  const crumbs = [], errors = [];
  const t0 = Date.now();
  let cfg = null, shot = null, shotCanvas = null, ink = null, current = null, h2cLoading = null;

  // ---------- recent actions ("breadcrumbs") and errors, kept from the start ----------
  const stamp = () => { const s = Math.round((Date.now() - t0) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function crumb(kind, text) {
    const last = crumbs[crumbs.length - 1];
    if (last && last.kind === kind && last.text === text) { last.n = (last.n || 1) + 1; return; } // "tap block ×5"
    crumbs.push({ at: stamp(), kind, text });
    if (crumbs.length > MAX_CRUMBS) crumbs.shift();
  }
  function logError(kind, msg) {
    errors.push({ at: stamp(), kind, msg: String(msg).slice(0, 400) });
    if (errors.length > MAX_ERRORS) errors.shift();
  }
  window.addEventListener('error', (e) => logError('error', `${e.message}${e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : ''}`));
  window.addEventListener('unhandledrejection', (e) => logError('promise', e.reason && e.reason.message ? e.reason.message : e.reason));
  ['error', 'warn'].forEach((k) => {
    const orig = console[k];
    console[k] = function (...args) {
      try { logError('console.' + k, args.map((a) => (a instanceof Error ? a.message : typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')); } catch (e) { /* ignore */ }
      return orig.apply(console, args);
    };
  });

  // ---------- screenshot ----------
  function loadH2C() {
    if (window.html2canvas) return Promise.resolve();
    if (!h2cLoading) h2cLoading = new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = 'js/vendor/html2canvas.min.js'; s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
    return h2cLoading;
  }
  // The WebGL layer can't be read by html2canvas: draw a fresh frame, copy it right away and put the copy in its place.
  async function capture() {
    const root = document.getElementById('app');
    const gl = root.querySelector('canvas.pixi-layer');
    let glURL = null;
    if (gl && gl.offsetParent !== null && window.PSRender) { PSRender.frame(); try { glURL = gl.toDataURL('image/png'); } catch (e) { /* ignore */ } }
    try {
      await loadH2C();
      return await window.html2canvas(root, {
        backgroundColor: '#3a2412', logging: false, scale: Math.min(1.5, window.devicePixelRatio || 1),
        ignoreElements: (el) => el.id === 'popup-report' || el.id === 'toast' || (el.classList && el.classList.contains('perf-hud')),
        onclone: (doc) => {
          const c = doc.querySelector('canvas.pixi-layer');
          if (!c) return;
          if (!glURL) { c.remove(); return; }
          const img = doc.createElement('img');
          img.src = glURL; img.className = c.className; img.style.cssText = c.style.cssText;
          img.style.width = gl.style.width || gl.clientWidth + 'px'; img.style.height = gl.style.height || gl.clientHeight + 'px';
          c.replaceWith(img);
        },
      });
    } catch (e) { logError('report', 'screenshot failed: ' + (e && e.message)); return null; }
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

  function table(obj) {
    return Object.entries(obj || {}).filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `| ${k} | ${typeof v === 'object' ? JSON.stringify(v) : v} |`).join('\n');
  }
  function markdown(r, { short = false } = {}) {
    const out = [
      `**${r.type} · ${r.severity}** · Report ${r.id} · v${r.build.version} (${r.build.build}, ${r.build.platform})`, '',
      '### What happened', r.whatHappened || '_not filled in_', '',
      '### Expected', r.expected || '_not filled in_', '',
      '### Steps to reproduce', r.steps || '_not filled in_', '',
      '### Game state', '| | |', '|---|---|', table(r.game), '',
      '### Device', '| | |', '|---|---|', table(r.device), '',
    ];
    if (r.performance) out.push('### Performance', '| | |', '|---|---|', table(r.performance), '');
    out.push('### Recent errors', r.recentErrors.length ? r.recentErrors.map((e) => `- \`${e.at}\` ${e.kind}: ${e.msg}`).join('\n') : 'None', '');
    const acts = short ? r.recentActions.slice(-15) : r.recentActions;
    out.push('### Recent actions', acts.map((c) => `- \`${c.at}\` ${c.text}${c.n ? ` ×${c.n}` : ''}`).join('\n') || 'None', '');
    if (r.save && !short) out.push('<details><summary>Save code (Settings › Restore loads this progress)</summary>', '', '```', r.save, '```', '</details>');
    return out.join('\n');
  }
  // one self-contained file: readable report + screenshot + the raw data as JSON
  function htmlFile(r, img) {
    const sec = (h, body) => `<h2>${h}</h2>${body}`;
    const rows = (o) => `<table>${Object.entries(o || {}).filter(([, v]) => v !== null && v !== '').map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</td></tr>`).join('')}</table>`;
    const pre = (t) => `<pre>${esc(t || 'not filled in')}</pre>`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(r.id)} ${esc(r.title)}</title><style>
body{margin:0;background:#f6efe4;color:#3a2412;font:15px/1.5 system-ui,sans-serif}main{max-width:900px;margin:0 auto;padding:20px 16px}
h1{margin:0 0 4px;font-size:24px}h2{margin:26px 0 8px;font-size:17px;border-bottom:2px solid #e2c99f;padding-bottom:4px}
.tag{display:inline-block;margin-right:6px;padding:2px 10px;border-radius:12px;background:#c47a35;color:#fff;font-size:13px;font-weight:600}
.tag.sev{background:#b3261e}.meta{color:#7a5a3a;font-size:13px}.grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:20px}
@media(max-width:700px){.grid{grid-template-columns:1fr}}img{width:100%;border-radius:10px;border:2px solid #e2c99f}
pre{white-space:pre-wrap;background:#fff;padding:10px 12px;border-radius:8px;margin:0;font:14px/1.45 system-ui,sans-serif}
table{border-collapse:collapse;width:100%;background:#fff;border-radius:8px;font-size:13px}th,td{text-align:left;vertical-align:top;padding:5px 10px;border-bottom:1px solid #f0e3cc}
th{width:30%;color:#7a5a3a;font-weight:600}td{word-break:break-word}ol{margin:0;padding-left:20px;background:#fff;border-radius:8px;padding:8px 8px 8px 32px;font-size:13px}
code{font-size:12px;color:#7a5a3a}textarea{width:100%;height:80px;font:11px monospace;box-sizing:border-box}</style></head><body><main>
<p class="meta">Pixel Swarm report ${esc(r.id)} · ${esc(new Date(r.createdAt).toLocaleString())} · v${esc(r.build.version)} (${esc(r.build.build)}, ${esc(r.build.platform)})</p>
<h1>${esc(r.title)}</h1><p><span class="tag">${esc(r.type)}</span><span class="tag sev">${esc(r.severity)}</span></p>
<div class="grid"><div>
${sec('What happened', pre(r.whatHappened))}${sec('Expected', pre(r.expected))}${sec('Steps to reproduce', pre(r.steps))}
${sec('Game state', rows(r.game))}${r.performance ? sec('Performance', rows(r.performance)) : ''}${sec('Device', rows(r.device))}
${sec('Recent errors', r.recentErrors.length ? `<ol>${r.recentErrors.map((e) => `<li><code>${esc(e.at)}</code> ${esc(e.kind)}: ${esc(e.msg)}</li>`).join('')}</ol>` : '<p>None</p>')}
${sec('Recent actions', `<ol>${r.recentActions.map((c) => `<li><code>${esc(c.at)}</code> ${esc(c.text)}${c.n ? ` ×${c.n}` : ''}</li>`).join('')}</ol>`)}
${r.save ? sec('Save code', '<p class="meta">Paste in Settings › Restore to load this progress.</p><textarea readonly>' + esc(r.save) + '</textarea>') : ''}
</div><div>${img ? sec('Screenshot', `<img src="${img}" alt="Screenshot">`) : ''}</div></div>
<script type="application/json" id="report-data">${JSON.stringify(r).replace(/</g, '\\u003c')}</script>
</main></body></html>`;
  }

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
  const fileName = (r) => `pixel-swarm-report-${r.id}.html`;
  const done = (how) => { $('rp-msg').textContent = how; cfg.toast('Thanks for the report!'); crumb('report', how); };

  const SEND = {
    download() {
      const r = build();
      download(fileName(r), new Blob([htmlFile(r, screenshotURL())], { type: 'text/html' }));
      done(`Saved ${fileName(r)}`);
    },
    async copy() {
      const r = build();
      cfg.copyText(`## ${r.title}\n\n${markdown(r)}`, 'Report copied');
      done('Copied as Markdown (screenshot not included: use Download)');
    },
    async share() {
      const r = build();
      const res = await cfg.share({ title: `Pixel Swarm report: ${r.title}`, text: `${r.title}\n\n${markdown(r, { short: true })}`,
        image: $('rp-shot-on').checked ? $('rp-shot') : null, fileName: `${r.id}.png` });
      if (res === 'shared') done('Shared');
      else if (res === 'unsupported') SEND.download();
    },
    github() {
      const r = build();
      let body = markdown(r, { short: true }) + '\n\n_Screenshot: attach the file from the report tool’s Download button._';
      if (body.length > 6000) body = body.slice(0, 6000) + '\n…(cut: use Download for the full report)';
      const url = `${cfg.issuesUrl}?title=${encodeURIComponent(`[${r.type}][${r.severity}] ${r.title}`)}&body=${encodeURIComponent(body)}`;
      window.open(url, '_blank', 'noopener');
      done('Opened a GitHub issue');
    },
  };

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
      const send = e.target.closest('[data-send]');
      if (send) { if (send.dataset.send === 'copy' || !needTitle()) SEND[send.dataset.send](); return; }
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

  return {
    // config: { openPopup, toast, copyText, share, context(), saveCode(), platform(), version, build, issuesUrl }
    init(config) { cfg = config; bind(); },
    open, crumb, logError, build, markdown, htmlFile,
    get crumbs() { return crumbs.slice(); }, get errors() { return errors.slice(); }, get hasShot() { return !!shotCanvas; },
  };
})();
