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
    await Promise.race([PIXI.Assets.load(textureUrls), new Promise((ok) => setTimeout(ok, 8000))]);
    app.ticker.add((tk) => stepFx(tk.deltaMS));
    document.body.classList.add('pixi-on'); // CSS hides the HTML fallback board
  }
  const NO_BEE = { set() {}, carry() {}, destroy() {} };
  // explicit redraw (keeps things correct even when the browser skips animation frames)
  function frame() { if (app) app.render(); }
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
  // look (from js/app.js boardLook): hide(k) / tint(k) per cell + puzzle items drawn on top
  function syncBoard(cells, look) {
    if (!app) return;
    sprites.forEach((row, y) => row.forEach((s, x) => {
      if (!s) return;
      const k = y * cols + x, ch = look ? look.color(k, cells[y][x]) : cells[y][x];
      s.visible = !!ch && !(look && look.hide(k));
      if (s.visible) s.tint = hex((look && look.tint(k)) || pal[ch]);
    }));
    if (look) drawItems(look);
    frame();
  }
  function txt(text, size, opts = {}) {
    const t = new PIXI.Text({ text, style: { fontFamily: '"Lilita One", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
      fontSize: Math.round(size), fill: opts.fill || 0xffffff, stroke: opts.stroke ? { color: opts.stroke, width: Math.max(2, size / 5) } : undefined } });
    t.anchor.set(0.5);
    t.resolution = Math.max(2, window.devicePixelRatio || 1);
    return t;
  }
  // puzzle pieces; rebuilt only when something about them changed
  function drawItems(look) {
    const key = JSON.stringify(look.items) + look.hiddenMark + (look.hiddenMark ? sprites.flat().filter((s) => s && s.visible && s.tint === hex('#6b6380')).length : '');
    if (key === lastItems) return;
    lastItems = key;
    overC.removeChildren().forEach((o) => o.destroy({ children: true }));
    const c = cellPx, g0 = gapPx;
    // "?" on hidden pixels (only when the pixels are big enough to read it)
    if (look.hiddenMark) sprites.forEach((row, y) => row.forEach((s, x) => {
      if (s && s.visible && s.tint === hex('#6b6380')) { const t = txt('?', c * 0.7, { fill: 0xd9d2f0 }); t.position.set(x * c + (c - g0) / 2, y * c + (c - g0) / 2); overC.addChild(t); }
    }));
    look.items.forEach((it) => {
      const x = it.x * c, y = it.y * c, w = (it.w || 1) * c - g0, h = (it.h || 1) * c - g0;
      if (it.kind === 'crate') {
        const gr = new PIXI.Graphics();
        gr.roundRect(x, y, w, h, c * 0.12).fill(0xc0823f).stroke({ color: 0x6b3a14, width: Math.max(1, c * 0.12) });
        gr.moveTo(x + w * 0.15, y + h * 0.5).lineTo(x + w * 0.85, y + h * 0.5).stroke({ color: 0x8a5226, width: Math.max(1, c * 0.1) });
        overC.addChild(gr);
      } else if (it.kind === 'cookie') {
        const gr = new PIXI.Graphics();
        gr.circle(x + w / 2, y + h / 2, Math.min(w, h) / 2).fill(0xe0a95c).stroke({ color: 0x7a4514, width: Math.max(2, c * 0.3) });
        // chocolate chips
        [[0.25, 0.3], [0.7, 0.25], [0.4, 0.7], [0.8, 0.7], [0.15, 0.65]].forEach(([fx, fy]) =>
          gr.circle(x + w * fx, y + h * fy, Math.max(1.5, Math.min(w, h) * 0.08)).fill(0x5a2f12));
        overC.addChild(gr);
        const t = txt(it.text, Math.max(13, Math.min(w, h) * 0.5), { stroke: 0x4a2408 }); t.position.set(x + w / 2, y + h / 2); overC.addChild(t);
      } else if (it.kind === 'big') {
        const gr = new PIXI.Graphics();
        // one big glossy tile with a dark outline + how many bites are left
        gr.roundRect(x - 1, y - 1, w + 2, h + 2, c * 0.45).fill(0x2a1606);
        gr.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, c * 0.4).fill(hex(it.color)).stroke({ color: 0xffffff, width: Math.max(1.5, c * 0.22), alpha: 0.9 });
        gr.roundRect(x + w * 0.15, y + h * 0.12, w * 0.7, h * 0.16, c * 0.15).fill({ color: 0xffffff, alpha: 0.45 });
        overC.addChild(gr);
        const t = txt(it.text, Math.max(11, Math.min(w, h) * 0.6), { stroke: 0x2a1606 }); t.position.set(x + w / 2, y + h / 2 + 1); overC.addChild(t);
      } else if (it.kind === 'icon') {
        // white badge so the key / hammer stands out on any color
        const r = Math.max(11, c * 1.2), cx = x + (c - g0) / 2, cy = y + (c - g0) / 2;
        const gr = new PIXI.Graphics();
        gr.circle(cx, cy, r).fill({ color: 0xfff8e6 }).stroke({ color: 0x8a4a1a, width: Math.max(2, r * 0.18) });
        overC.addChild(gr);
        const t = txt(it.text, r * 1.25); t.position.set(cx, cy + 1); overC.addChild(t);
      }
    });
  }

  // ---------- bugs ----------
  function spawnBee(textureUrl, size, carryColor, carrySize) {
    if (!app) return NO_BEE;
    const c = new PIXI.Container();
    const body = new PIXI.Sprite(PIXI.Texture.from(textureUrl));
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

  return { init, frame, resize, setBoard, syncBoard, spawnBee, clearBees, wind, get ready() { return !!app; } };
})();
