/* ===================== Pixel Swarm — PixiJS gameplay renderer =====================
   Draws the gameplay with PixiJS (WebGL/WebGPU): the picture board, the flying bugs with the pixels
   they carry home, and the wind effect. Menus, store and pop-ups stay in HTML.
   The game logic (js/app.js) calls this module; coordinates are CSS pixels relative to #screen-game.
*/
window.PSRender = (function () {
  'use strict';
  let app = null, host = null, boardC, beeLayer, fxLayer, pixelTex = null, sprites = [];
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
    app = new PIXI.Application();
    await app.init({ backgroundAlpha: 0, resizeTo: hostEl, resolution: window.devicePixelRatio || 1, autoDensity: true, antialias: true });
    app.canvas.className = 'pixi-layer';
    hostEl.appendChild(app.canvas);
    boardC = new PIXI.Container(); beeLayer = new PIXI.Container(); fxLayer = new PIXI.Container();
    app.stage.addChild(boardC, beeLayer, fxLayer);
    pixelTex = makePixelTexture();
    await PIXI.Assets.load(textureUrls);
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
    sprites = [];
    const dpr = window.devicePixelRatio || 1, r = boardEl.getBoundingClientRect(), h = host.getBoundingClientRect();
    boardC.position.set(Math.round((r.left - h.left) * dpr) / dpr, Math.round((r.top - h.top) * dpr) / dpr);
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
  // show/hide pixels to match the game state (eaten pixels disappear)
  function syncBoard(cells) {
    sprites.forEach((row, y) => row.forEach((s, x) => { if (s) s.visible = !!cells[y][x]; }));
    frame();
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
