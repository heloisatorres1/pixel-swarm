/* ===================== Pixel Swarm — PixiJS gameplay renderer =====================
   Draws the gameplay with PixiJS (WebGL/WebGPU): the picture board, the flying bugs with the pixels
   they carry home, and the wind effect. Menus, store and pop-ups stay in HTML.
   The game logic (js/app.js) calls this module; coordinates are CSS pixels relative to #screen-game.
*/
window.PSRender = (function () {
  'use strict';
  let app = null, host = null, boardC, overC, beeLayer, fxLayer, pixelTex = null, sprites = [];
  let pal = {}, cellPx = 1, gapPx = 0, cols = 1, lastItems = '';
  const fx = []; // running effects: { sprite, t, dur, delay, update(p) }
  let renderStart = 0, lastRenderMs = 0, stressLayer = null;

  // a white square with a bright top band; tinted per color it gives the glossy "pixel" look
  function makePixelTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#dcdcdc'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 32, 8);
    return PIXI.Texture.from(c);
  }
  const hex = (css) => parseInt(css.slice(1), 16);

  async function init(hostEl, textureUrls) {
    host = hostEl;
    const a = new PIXI.Application();
    // some devices without WebGL never finish starting — give up after 5 s and use the 2D-canvas fallback
    const timeout = new Promise((_, no) => setTimeout(() => no(new Error('PixiJS init timeout')), 5000));
    await Promise.race([a.init({ backgroundAlpha: 0, resizeTo: hostEl, resolution: window.devicePixelRatio || 1, autoDensity: true,
      antialias: true, preference: 'webgl' }), timeout]);
    app = a; // only marked ready once it really works
    app.canvas.className = 'pixi-layer';
    hostEl.appendChild(app.canvas);
    boardC = new PIXI.Container(); overC = new PIXI.Container(); beeLayer = new PIXI.Container(); fxLayer = new PIXI.Container();
    app.stage.addChild(boardC, overC, beeLayer, fxLayer);
    pixelTex = makePixelTexture();
    await Promise.race([PIXI.Assets.load(textureUrls).then(() => { lastItems = ''; }), new Promise((ok) => setTimeout(ok, 8000))]);
    app.ticker.add((tk) => stepFx(tk.deltaMS));
    // performance debug: CPU time of each PixiJS render (the render itself runs at LOW priority, between these two)
    app.ticker.add(() => { renderStart = performance.now(); }, null, PIXI.UPDATE_PRIORITY.LOW + 1);
    app.ticker.add(() => { lastRenderMs = performance.now() - renderStart; }, null, PIXI.UPDATE_PRIORITY.UTILITY);
    document.body.classList.add('pixi-on'); // CSS hides the HTML fallback board
  }
  const NO_BEE = { set() {}, carry() {}, destroy() {} };
  // explicit redraw (keeps things correct even when the browser skips animation frames)
  function frame() { if (app) app.render(); }
  // picture of the gameplay layer for screenshots (bug reports). Reading the screen canvas directly can give a blank
  // image on real GPUs (the browser may have cleared it already), so PixiJS draws the stage again into its own canvas.
  function snapshot() {
    if (!app) return null;
    try {
      const c = app.renderer.extract.canvas({ target: app.stage, frame: new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height),
        resolution: app.renderer.resolution });
      return c.toDataURL('image/png');
    } catch (e) {
      try { app.render(); return app.canvas.toDataURL('image/png'); } catch (e2) { return null; }
    }
  }
  function resize() { if (app) { app.resize(); frame(); } }

  // ---------- board ----------
  // boardEl = the layout placeholder (#g-board) whose exact size/position was set by js/app.js
  function setBoard(cells, palette, boardEl, cellCss, gapCss) {
    if (!app) return;
    resize();
    boardC.removeChildren().forEach((s) => s.destroy());
    overC.removeChildren().forEach((s) => s.destroy({ children: true })); lastItems = '';
    sprites = []; pal = palette; cellPx = cellCss; gapPx = gapCss; cols = cells[0].length;
    const dpr = window.devicePixelRatio || 1, r = boardEl.getBoundingClientRect(), h = host.getBoundingClientRect();
    boardC.position.set(Math.round((r.left - h.left) * dpr) / dpr, Math.round((r.top - h.top) * dpr) / dpr);
    overC.position.copyFrom(boardC.position);
    cells.forEach((row, y) => {
      sprites[y] = [];
      row.forEach((ch, x) => {
        if (!ch) { sprites[y][x] = null; return; }
        const s = new PIXI.Sprite(pixelTex);
        s.tint = hex(palette[ch]);
        s.position.set(x * cellCss, y * cellCss);
        s.width = s.height = cellCss - gapCss;
        boardC.addChild(s);
        sprites[y][x] = s;
      });
    });
    frame();
  }
  // show/hide pixels to match the game state (eaten pixels disappear).
  // look (from js/app.js boardLook): color / hide / hidden per cell + puzzle items drawn on top
  // a puzzle sprite once it has loaded (null until then: a plain shape is drawn instead)
  const PZ = (name) => PIXI.Assets.get(`assets/sprites/puzzles/${name}.png`) || null;
  function syncBoard(cells, look) {
    if (!app) return;
    const hidTex = look ? PZ('hidden_pixel') : null;
    sprites.forEach((row, y) => row.forEach((s, x) => {
      if (!s) return;
      const k = y * cols + x, ch = look ? look.color(k, cells[y][x]) : cells[y][x];
      s.visible = !!ch && !(look && look.hide(k));
      if (!s.visible) return;
      const hid = !!(look && look.hidden(k));
      // hidden pixels: purple "?" cube sprite instead of the colored pixel
      if (hid !== !!s.isHidden && (hidTex || !hid)) {
        s.isHidden = hid; s.texture = hid ? hidTex : pixelTex;
        s.width = s.height = cellPx - gapPx;
      }
      s.tint = hid ? (s.isHidden ? 0xffffff : 0x7b68a6) : hex(pal[ch]);
    }));
    if (look) drawItems(look);
    frame();
  }
  function txt(text, size, opts = {}) {
    const t = new PIXI.Text({ text, style: { fontFamily: '"Lilita One", sans-serif',
      fontSize: Math.round(size), fill: opts.fill || 0xffffff, stroke: { color: opts.stroke || 0x3a1d08, width: Math.max(2, size / 5) } } });
    t.anchor.set(0.5);
    t.resolution = Math.max(2, window.devicePixelRatio || 1);
    return t;
  }
  // puzzle pieces on the picture; rebuilt only when something about them changed
  function drawItems(look) {
    const key = JSON.stringify(look.items);
    if (key === lastItems) return;
    lastItems = key;
    overC.removeChildren().forEach((o) => o.destroy({ children: true }));
    const c = cellPx, g0 = gapPx;
    look.items.forEach((it) => {
      const x = it.x * c, y = it.y * c, w = (it.w || 1) * c - g0, h = (it.h || 1) * c - g0;
      if (it.kind === 'plank') {
        // wood plank / biscuit: the sprite stretched over the covered area (9-slice keeps the corners round)
        const tex = PZ(it.tex);
        if (tex) {
          const border = Math.round(Math.min(tex.width, tex.height) * 0.3);
          const sp = new PIXI.NineSliceSprite({ texture: tex, leftWidth: border, rightWidth: border, topHeight: border, bottomHeight: border });
          sp.position.set(x, y); sp.width = w; sp.height = h;
          overC.addChild(sp);
        } else {
          const gr = new PIXI.Graphics();
          gr.roundRect(x, y, w, h, c * 0.6).fill(it.tex === 'block_wood' ? 0xb97a3e : 0xe8b866).stroke({ color: 0x6b3a14, width: 2 });
          overC.addChild(gr);
        }
        const t = txt(it.text, Math.max(18, Math.min(h * 0.75, w * 0.4))); t.position.set(x + w / 2, y + h / 2); overC.addChild(t);
      } else if (it.kind === 'big') {
        // one big glossy pixel in its color + how many bugs it still needs
        const gr = new PIXI.Graphics();
        gr.roundRect(x - 1, y - 1, w + 2, h + 2, c * 0.45).fill(0x2a1606);
        gr.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, c * 0.4).fill(hex(it.color)).stroke({ color: 0x46b6ff, width: Math.max(1.5, c * 0.22) });
        gr.roundRect(x + w * 0.15, y + h * 0.12, w * 0.7, h * 0.16, c * 0.15).fill({ color: 0xffffff, alpha: 0.45 });
        overC.addChild(gr);
        const t = txt(it.text, Math.max(11, Math.min(w, h) * 0.6)); t.position.set(x + w / 2, y + h / 2 + 1); overC.addChild(t);
      } else if (it.kind === 'keycell') {
        // the key's nest inside the picture: a light tile with the key; bugs clear the pixels around it to collect it
        const gr = new PIXI.Graphics();
        gr.roundRect(x, y, w, h, c * 0.35).fill(0xfff4dc).stroke({ color: 0xe0a020, width: Math.max(1.5, c * 0.25) });
        overC.addChild(gr);
        const tex = PZ('key'), size = Math.max(24, Math.max(w, h) * 1.35);
        if (!tex) { const t = txt('🔑', size * 0.7); t.position.set(x + w / 2, y + h / 2); overC.addChild(t); return; }
        const sp = new PIXI.Sprite(tex);
        sp.anchor.set(0.5); sp.scale.set(size / Math.max(tex.width, tex.height)); sp.position.set(x + w / 2, y + h / 2);
        overC.addChild(sp);
      } else if (it.kind === 'icon') {
        // the key sprite, a bit bigger than its pixel so it's easy to spot
        const tex = PZ(it.tex), size = Math.max(28, c * 3.4);
        if (!tex) { const t = txt('🔑', size * 0.7); t.position.set(x + (c - g0) / 2, y + (c - g0) / 2); overC.addChild(t); return; }
        const sp = new PIXI.Sprite(tex);
        sp.anchor.set(0.5); sp.scale.set(size / Math.max(tex.width, tex.height));
        sp.position.set(x + (c - g0) / 2, y + (c - g0) / 2);
        overC.addChild(sp);
      }
    });
  }

  // ---------- bugs ----------
  // load sprites in the background (e.g. the bug look chosen in the Skins screen)
  function preload(urls) { if (app) PIXI.Assets.load(urls).catch(() => {}); }
  // fallbackUrl: used while textureUrl is still loading
  function spawnBee(textureUrl, size, carryColor, carrySize, fallbackUrl) {
    if (!app) return NO_BEE;
    const tex = PIXI.Assets.get(textureUrl) || (fallbackUrl && PIXI.Assets.get(fallbackUrl));
    if (!tex) { preload([textureUrl]); return NO_BEE; }
    const c = new PIXI.Container();
    const body = new PIXI.Sprite(tex);
    body.anchor.set(0.5);
    const k = size / Math.max(body.texture.width, body.texture.height);
    body.scale.set(k);
    const carry = new PIXI.Sprite(pixelTex);
    carry.anchor.set(0.5, 0);
    carry.tint = hex(carryColor);
    carry.width = carry.height = carrySize;
    carry.position.set(0, size * 0.15);
    carry.visible = false;
    c.addChild(carry, body);
    beeLayer.addChild(c);
    return {
      set(x, y, flip, scale) { c.position.set(x, y); c.scale.set(scale * flip, scale); },
      carry(on) { carry.visible = on; },
      destroy() { c.destroy({ children: true }); },
    };
  }
  function clearBees() { if (beeLayer) beeLayer.removeChildren().forEach((c) => c.destroy({ children: true })); frame(); }

  // ---------- wind effect ----------
  function stepFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.t += dt;
      const p = Math.min(1, Math.max(0, (f.t - f.delay) / f.dur));
      f.update(p);
      if (p >= 1) { f.sprite.destroy(); fx.splice(i, 1); }
    }
  }
  // removed: [[x, y, color]] in board cells; cellCss = size of one cell
  function wind(removed, palette, cellCss, cols) {
    if (!app) return;
    const bx = boardC.position.x, by = boardC.position.y, wBoard = cols * cellCss;
    const gust = new PIXI.Sprite(PIXI.Texture.from('assets/sprites/booster_wind.png'));
    gust.anchor.set(0.5); gust.scale.set(130 / gust.texture.width);
    fxLayer.addChild(gust);
    fx.push({ sprite: gust, t: 0, delay: 0, dur: 1100, update(p) {
      gust.position.set(bx - 140 + p * (wBoard + 420), by + wBoard / 2); gust.alpha = 1 - p * p;
    } });
    const step = Math.max(1, Math.ceil(removed.length / 260)); // cap the number of flying pieces
    removed.forEach(([x, y, color], i) => {
      if (i % step) return;
      const s = new PIXI.Sprite(pixelTex);
      s.tint = hex(palette[color]); s.anchor.set(0.5);
      s.width = s.height = cellCss;
      const x0 = bx + (x + 0.5) * cellCss, y0 = by + (y + 0.5) * cellCss;
      const dx = 260 + Math.random() * 220, dy = (Math.random() - 0.6) * 160, rot = Math.random() * 9, base = s.scale.x;
      s.position.set(x0, y0);
      fxLayer.addChild(s);
      fx.push({ sprite: s, t: 0, delay: (x / cols) * 350, dur: 1000, update(p) {
        const e = p * p;
        s.position.set(x0 + dx * e, y0 + dy * e); s.rotation = rot * p; s.scale.set(base * (1 - 0.6 * p)); s.alpha = 1 - p;
      } });
    });
  }

  // ---------- performance debug ----------
  function countObjects(o) { let n = 1; for (const c of o.children) n += countObjects(c); return n; }
  function stats() {
    if (!app) return { renderer: '2D canvas (fallback)' };
    const r = app.renderer;
    return {
      renderer: r.name === 'webgpu' ? 'WebGPU' : 'WebGL' + (r.context && r.context.webGLVersion ? ' ' + r.context.webGLVersion : ''),
      resolution: r.resolution, size: `${r.width}×${r.height}`,
      objects: countObjects(app.stage), bees: beeLayer.children.length,
      effects: fx.length, stress: stressLayer ? stressLayer.children.length : 0, renderMs: lastRenderMs,
    };
  }
  // stress test: n extra flying bugs drawn over the game (0 removes them)
  function stress(n) {
    if (!app) return 0;
    if (stressLayer) { app.ticker.remove(stressLayer.__step); stressLayer.destroy({ children: true }); stressLayer = null; }
    if (!n) return 0;
    const tex = PIXI.Assets.get('assets/sprites/bee_fly.png') || pixelTex;
    stressLayer = new PIXI.Container();
    app.stage.addChild(stressLayer);
    const W = app.renderer.width / app.renderer.resolution, H = app.renderer.height / app.renderer.resolution;
    for (let i = 0; i < n; i++) {
      const s = new PIXI.Sprite(tex);
      s.anchor.set(0.5); s.scale.set(28 / Math.max(tex.width, tex.height));
      s.position.set(Math.random() * W, Math.random() * H);
      s.__v = [(Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3];
      stressLayer.addChild(s);
    }
    stressLayer.__step = (tk) => {
      for (const s of stressLayer.children) {
        s.x += s.__v[0] * tk.deltaMS; s.y += s.__v[1] * tk.deltaMS;
        if (s.x < 0 || s.x > W) s.__v[0] *= -1;
        if (s.y < 0 || s.y > H) s.__v[1] *= -1;
        s.rotation = Math.sin((s.x + s.y) / 40) * 0.3;
      }
    };
    app.ticker.add(stressLayer.__step);
    return n;
  }

  return { init, preload, frame, resize, setBoard, syncBoard, spawnBee, clearBees, wind, stats, stress, snapshot, get ready() { return !!app; } };
})();
