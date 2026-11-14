/* ===================== Pixel Swarm — game data =====================
   Pixel-art pictures, themes and levels. Edit freely:
   - each picture is a grid of characters; every character is a color from PALETTE ('.' = empty)
   - each theme lists its pictures; levels cycle through them
*/
window.PS_DATA = (function () {
  'use strict';

  const PALETTE = {
    k: '#3b1f0b', // dark outline
    r: '#e8343a', R: '#ff8a8a', // red, light red
    g: '#3f9a1f', G: '#8fe04a', // green, light green
    y: '#ffd21c', Y: '#fff08a', // yellow, light yellow
    o: '#ff8a1c', O: '#ffc04a', // orange, light orange
    p: '#ff5fa2', P: '#ffb3d6', // pink, light pink
    b: '#2f8fe0', B: '#8fd8ff', // blue, light blue
    n: '#8a5226', N: '#d39a5a', // brown, light brown
    v: '#8c4ce0', s: '#8a919a', S: '#e6eaee', w: '#ffffff', // grays kept far apart so they don't look alike
    // darker shades (used by Hard pictures)
    q: '#a8161c', h: '#24680c', u: '#d9a400', z: '#c45a00', m: '#c4307a', c: '#1a56a8', l: '#5a3010', a: '#6a7078',
    // background colors (sky / ground behind the pictures)
    D: '#9fd6ff', I: '#d4f0ff', J: '#e8c58a', L: '#a8723f', H: '#ffcfae', C: '#fff1c9', T: '#d9a066',
    E: '#bff0cf', K: '#a9d86a', F: '#ddd0ff', M: '#ffe0ee', U: '#4fb0e6', V: '#a8e4f8', W: '#f2dd9a',
    X: '#33246b', // Halloween night sky
    Z: '#30543c', // the BOARD background (not used in pictures): every pixel color must stay far from it
  };
  const BOARD = 'Z';
  // Background of each theme: one sky + ground + deep ground. Each slot lists candidates in order of
  // preference; the first one that is clearly different from the picture's colors is used.
  // Easy uses sky + ground; Medium and Hard also add the deep ground.
  const BACKGROUNDS = {
    flowers: { sky: ['D', 'I', 'E'], ground: ['J', 'W', 'C'], deep: ['L', 'T'] },
    fruits:  { sky: ['H', 'C', 'I'], ground: ['T', 'J'],      deep: ['L', 'n'] },
    animals: { sky: ['E', 'I', 'D'], ground: ['K', 'J'],      deep: ['L', 'T'] },
    sweets:  { sky: ['F', 'M', 'I'], ground: ['C', 'W'],      deep: ['T', 'L'] },
    ocean:   { sky: ['U', 'V', 'D'], ground: ['W', 'J'],      deep: ['J', 'L', 'T'] },
    halloween: { sky: ['X', 'F'],    ground: ['K', 'J'],      deep: ['L', 'T'] },
  };
  // ---- color distance (CIELAB ΔE76): colors closer than MIN_DE look "the same" to players ----
  const MIN_DE = 25; // clearly different at a glance (raised after playtest: 18–20 still looked alike)
  const BG_POOL = ['D', 'I', 'E', 'K', 'F', 'M', 'C', 'H', 'W', 'J', 'T', 'L', 'U', 'V', 'S', 'w'];
  function hexToLab(hex) {
    const n = parseInt(hex.slice(1), 16);
    const lin = (c) => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; };
    const r = lin(n >> 16), g = lin((n >> 8) & 255), b = lin(n & 255);
    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, y = r * 0.2126 + g * 0.7152 + b * 0.0722, z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  }
  const labCache = {};
  function deltaE(a, b) {
    const A = labCache[a] || (labCache[a] = hexToLab(PALETTE[a])), B = labCache[b] || (labCache[b] = hexToLab(PALETTE[b]));
    return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
  }
  // light / dark variant of each base color (used to add detail in Medium / Hard)
  const LIGHT = { r: 'R', g: 'G', y: 'Y', o: 'O', p: 'P', b: 'B', n: 'N', s: 'S' };
  const DARK  = { r: 'q', g: 'h', y: 'u', o: 'z', p: 'm', b: 'c', n: 'l', s: 'a', R: 'r', G: 'g', Y: 'y', O: 'o', P: 'p', B: 'b', N: 'n', S: 's' };

  // ---------------- difficulty design ----------------
  // Based on Pixel-Hunt-style games: harder = bigger picture, more colors, fewer slots, more puzzles.
  const DIFFICULTY = {
    // bgBands: 2 = sky + ground, 3 = sky + ground + deep ground
    easy:   { scale: 1, shade: 'none', bgBands: 2, maxColors: 7,  slots: 4, blockMin: 8,  blockMax: 15, beesPerLaunch: 1, mystery: 0,    frozen: 0,    walls: false },
    medium: { scale: 2, shade: 'both', bgBands: 3, maxColors: 10, slots: 4, blockMin: 14, blockMax: 24, beesPerLaunch: 2, mystery: 0.15, frozen: 0,    walls: false },
    hard:   { scale: 3, shade: 'both', bgBands: 3, maxColors: 12, slots: 3, blockMin: 20, blockMax: 30, beesPerLaunch: 4, mystery: 0.2,  frozen: 0.12, walls: true },
  };
  // Puzzles (design doc: "in the medium and hard levels some puzzles will show").
  // number = level (0-based, in each theme) where the puzzle is introduced — it always appears there and
  // may appear (45%) in the later levels. -1 = no introduction here, appears now and then (25%).
  // Medium level 1 introduces Mystery blocks and Hard level 1 Frozen blocks (see mystery / frozen above).
  DIFFICULTY.medium.puzzles = { hidden: 1, linked: 2, big: 3, pipe: 4 };
  DIFFICULTY.hard.puzzles = { key: 1, wood: 2, cookie: 3, mlinked: 4, hidden: -1, linked: -1, big: -1, pipe: -1 };
  const MIN_CELLS_PER_COLOR = 4;
  const AD_SLOTS = 2; // extra slots per level that the player can open by watching a video ad

  const PICTURES = {
    flower: { name: 'Pink Flower', grid: [
      '....pppp....', '...pPPPPp...', '.pppPyyPppp.', 'pPPPyyyyPPPp', 'pPPPyyyyPPPp', '.pppPyyPppp.',
      '...pPPPPp...', '....pppp....', '.....gg.....', '..GG.gg.....', '...GGgg.....', '.....gg.....'] },
    tulip: { name: 'Red Tulip', grid: [
      '............', '...r.rr.r...', '...rrrrrr...', '...rRrrRr...', '...rrrrrr...', '....rrrr....',
      '.....gg.....', '..g..gg..g..', '..gg.gg.gg..', '...gggggg...', '.....gg.....', '.....gg.....'] },
    cherry: { name: 'Cherries', grid: [
      '........gg..', '.......ggG..', '......kk....', '.....k..k...', '....k....k..', '...k.....k..',
      '.rrr....rrr.', 'rRrrr..rRrrr', 'rrrrr..rrrrr', 'rrrrr..rrrrr', '.rrr....rrr.', '............'] },
    apple: { name: 'Apple', grid: [
      '.....n......', '.....nGG....', '..rrr.rrr...', '.rRrrrrrrr..', 'rRrrrrrrrrr.', 'rrrrrrrrrrr.',
      'rrrrrrrrrrr.', 'rrrrrrrrrrr.', '.rrrrrrrrr..', '.rrrrrrrrr..', '..rrr.rrr...', '............'] },
    cat: { name: 'Kitty', grid: [
      '.s........s.', 'sPs......sPs', 'sPPs....sPPs', 'ssssssssssss', 'sskksssskkss', 'ssssssssssss',
      'sssssppsssss', 'ssSSkkkkSSss', 'ssssssssssss', '.ssssssssss.', '..ssssssss..', '............'] },
    chick: { name: 'Chick', grid: [
      '............', '....yyyy....', '...yyyyyy...', '...ykyyky...', '...yyooyy...', '..yyyyyyyy..',
      '.yyYYyyyyyy.', '.yyYYyyyyyy.', '..yyyyyyyy..', '...yyyyyy...', '....o..o....', '...oo..oo...'] },
    cupcake: { name: 'Cupcake', grid: [
      '.....r......', '....PPP.....', '..PPPPPPP...', '.PPpPPPpPP..', 'PPPPPPPPPPP.', 'PPPPPPPPPPP.',
      '.NnNnNnNnN..', '.nNnNnNnNn..', '..NnNnNnN...', '..nNnNnNn...', '...NnNnN....', '............'] },
    donut: { name: 'Donut', grid: [
      '...pppppp...', '.ppPpppPppp.', 'pppppPpppPpp', 'ppPpp..ppppp', 'pppp....pPpp', 'pPpp....pppp',
      'ppppp..ppPpp', 'NpPpppppppPN', 'NNppPppppNNN', '.NNNNNNNNNN.', '...NNNNNN...', '............'] },
    fish: { name: 'Blue Fish', grid: [
      '............', '....bbbb....', '..bbBBBBb..b', '.bBBBBBBBbbb', 'bBwkBBBBBBbb', 'bBkkBBBBBbbb',
      'bBBBBBBBBBbb', '.bBBBBBBBbbb', '..bbBBBBb..b', '....bbbb....', '............', '............'] },
    star: { name: 'Starfish', grid: [
      '.....o......', '....ooo.....', '....oOo.....', 'oooooOooooo.', '.ooOkOOkOo..', '..oOOOOOo...',
      '..ooOOOoo...', '.oooo.oooo..', '.ooo...ooo..', 'ooo.....ooo.', '............', '............'] },
    ghost: { name: 'Little Ghost', grid: [
      '....wwww....', '...wwwwww...', '..wwwwwwww..', '..wkkwwkkw..', '..wkkwwkkw..', '..wwwwwwww..',
      '..wwwkkwww..', '..wwwkkwww..', '..wwwwwwww..', '..wwwwwwww..', '..ww.ww.ww..', '..w..w..w...'] },
    bat: { name: 'Bat', grid: [
      '............', '.v........v.', '.vv..vv..vv.', '.vvv.vv.vvv.', 'vvvvvvvvvvvv', 'vvvvyvvyvvvv',
      'vvvvvvvvvvvv', '.vvv.vv.vvv.', '..v..vv..v..', '.....vv.....', '............', '............'] },
    candy: { name: 'Candy Corn', grid: [
      '.....yy.....', '.....yy.....', '....yyyy....', '....oooo....', '...oooooo...', '...oooooo...',
      '..oooooooo..', '..wwwwwwww..', '.wwwwwwwwww.', '.wwwwwwwwww.', '............', '............'] },
    hat: { name: 'Witch Hat', grid: [
      '.......v....', '......vv....', '.....vvv....', '.....vvvv...', '....vvvvv...', '....vvvvvv..',
      '...vvvvvvv..', '...kkkykkk..', '...vvvvvvvv.', 'vvvvvvvvvvvv', '.vvvvvvvvvv.', '............'] },
    pumpkin: { name: 'Pumpkin', grid: [
      '.....gn.....', '....gn......', '..oooooooo..', '.oOooOOooOo.', 'ooOoOOOOoOoo', 'ookkoOOokkoo',
      'ooOkoOOokOoo', 'ooOoOOOOoOoo', 'oookkkkkkooo', '.ooOkokokOo.', '..oooooooo..', '............'] },
  };

  const THEMES = [
    { id: 'flowers', name: 'Flowers', pictures: ['flower', 'tulip'] },
    { id: 'fruits',  name: 'Fruits',  pictures: ['cherry', 'apple'] },
    { id: 'animals', name: 'Animals', pictures: ['cat', 'chick'] },
    { id: 'sweets',  name: 'Sweets',  pictures: ['cupcake', 'donut'] },
    { id: 'ocean',   name: 'Ocean',   pictures: ['fish', 'star'] },
  ];
  // Event: 12 special levels on a path. Levels 1–4 Easy, 5–8 Medium, 9–12 Hard. Each first win = pumpkins.
  const EVENT = { id: 'halloween', name: 'Halloween', title: 'Halloween Hunt', levels: 12,
    pictures: ['pumpkin', 'ghost', 'bat', 'candy', 'hat'] };
  const eventDiff = (i) => (i < 4 ? 'easy' : i < 8 ? 'medium' : 'hard');
  const DIFFICULTIES = ['easy', 'medium', 'hard'];
  const LEVELS_PER_DIFFICULTY = 5;

  // Draws a picture to a canvas and returns a data URL (cached). Gaps between pixels give the mosaic look.
  const cache = {};
  function pictureURL(id, cell = 10, opts = {}) {
    const key = id + cell + (opts.silhouette ? 's' : '');
    if (cache[key]) return cache[key];
    const grid = PICTURES[id].grid, h = grid.length, w = grid[0].length;
    const c = document.createElement('canvas');
    c.width = w * cell; c.height = h * cell;
    const ctx = c.getContext('2d');
    const gap = Math.max(1, Math.round(cell / 10));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = grid[y][x];
      if (ch === '.' || !PALETTE[ch]) continue;
      ctx.fillStyle = opts.silhouette ? '#7a5a3e' : PALETTE[ch];
      ctx.fillRect(x * cell, y * cell, cell - gap, cell - gap);
      if (!opts.silhouette) { // small highlight on each pixel
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        ctx.fillRect(x * cell, y * cell, cell - gap, Math.max(1, Math.round(cell / 4)));
      }
    }
    return (cache[key] = c.toDataURL());
  }

  // level picture for a theme / difficulty / index (levels cycle through the theme's pictures)
  function levelPicture(themeId, diff, index) {
    if (themeId === EVENT.id) return EVENT.pictures[index % EVENT.pictures.length];
    const t = THEMES.find((x) => x.id === themeId);
    return t.pictures[(DIFFICULTIES.indexOf(diff) + index) % t.pictures.length];
  }

  // ---------------- bigger pictures for Medium / Hard ----------------
  // Scale2x / Scale3x: pixel-art upscalers that round diagonal edges instead of making plain big squares.
  const at = (g, x, y) => (y < 0 || y >= g.length || x < 0 || x >= g[0].length ? '.' : g[y][x]);
  function scale2x(g) {
    const H = g.length, W = g[0].length, out = Array.from({ length: H * 2 }, () => []);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const P = g[y][x], A = at(g, x, y - 1), B = at(g, x + 1, y), C = at(g, x - 1, y), D = at(g, x, y + 1);
      out[2 * y][2 * x]         = C === A && C !== D && A !== B ? A : P;
      out[2 * y][2 * x + 1]     = A === B && A !== C && B !== D ? B : P;
      out[2 * y + 1][2 * x]     = D === C && D !== B && C !== A ? C : P;
      out[2 * y + 1][2 * x + 1] = B === D && B !== A && D !== C ? D : P;
    }
    return out.map((r) => r.join(''));
  }
  function scale3x(g) {
    const H = g.length, W = g[0].length, out = Array.from({ length: H * 3 }, () => []);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const A = at(g, x - 1, y - 1), B = at(g, x, y - 1), C = at(g, x + 1, y - 1);
      const D = at(g, x - 1, y), E = g[y][x], F = at(g, x + 1, y);
      const G = at(g, x - 1, y + 1), Hh = at(g, x, y + 1), I = at(g, x + 1, y + 1);
      const px = [E, E, E, E, E, E, E, E, E];
      if (B !== Hh && D !== F) {
        px[0] = D === B ? D : E;
        px[1] = (D === B && E !== C) || (B === F && E !== A) ? B : E;
        px[2] = B === F ? F : E;
        px[3] = (D === B && E !== G) || (D === Hh && E !== A) ? D : E;
        px[5] = (B === F && E !== I) || (Hh === F && E !== C) ? F : E;
        px[6] = D === Hh ? D : E;
        px[7] = (D === Hh && E !== I) || (Hh === F && E !== G) ? Hh : E;
        px[8] = Hh === F ? F : E;
      }
      for (let k = 0; k < 9; k++) out[3 * y + Math.floor(k / 3)][3 * x + (k % 3)] = px[k];
    }
    return out.map((r) => r.join(''));
  }
  // adds a light edge on top/left of shapes and (for Hard) a dark edge on bottom/right → more colors & decisions
  function shade(g, mode) {
    if (mode === 'none') return g;
    const base = g.map((r) => [...r]), out = g.map((r) => [...r]);
    for (let y = 0; y < base.length; y++) for (let x = 0; x < base[0].length; x++) {
      const ch = base[y][x];
      if (ch === '.') continue;
      const topEdge = at(base, x, y - 1) !== ch || at(base, x - 1, y) !== ch;
      const botEdge = at(base, x, y + 1) !== ch || at(base, x + 1, y) !== ch;
      if (topEdge && LIGHT[ch]) out[y][x] = LIGHT[ch];
      else if (mode === 'both' && botEdge && DARK[ch]) out[y][x] = DARK[ch];
    }
    return out.map((r) => r.join(''));
  }
  // keeps the rules: every added color has at least 4 pixels and the picture stays under maxColors
  function tidyColors(g, original, maxColors) {
    const cells = g.map((r) => [...r]);
    const count = () => { const c = {}; cells.forEach((r) => r.forEach((ch) => { if (ch !== '.') c[ch] = (c[ch] || 0) + 1; })); return c; };
    const origColors = new Set(original.join('').replace(/\./g, ''));
    const revert = (ch) => cells.forEach((r, y) => r.forEach((v, x) => {
      if (v === ch) r[x] = Object.keys(LIGHT).find((k) => LIGHT[k] === ch && origColors.has(k))
        || Object.keys(DARK).find((k) => DARK[k] === ch && origColors.has(k)) || ch;
    }));
    let c = count();
    Object.keys(c).forEach((ch) => { if (c[ch] < MIN_CELLS_PER_COLOR && !origColors.has(ch)) revert(ch); });
    c = count();
    // added shades that look too similar to another color in the picture are merged back
    Object.keys(c).filter((ch) => !origColors.has(ch)).forEach((ch) => {
      const others = Object.keys(count()).filter((o) => o !== ch).concat(BOARD);
      if (others.some((o) => deltaE(ch, o) < MIN_DE)) revert(ch);
    });
    c = count();
    while (Object.keys(c).length > maxColors) {
      const added = Object.keys(c).filter((ch) => !origColors.has(ch)).sort((a, b) => c[a] - c[b]);
      if (!added.length) break;
      const before = Object.keys(c).length;
      revert(added[0]); c = count();
      if (Object.keys(c).length >= before) origColors.add(added[0]); // could not merge it: keep it, avoid looping
    }
    return cells.map((r) => r.join(''));
  }
  // fills the empty cells with the theme background: sky on top, ground (and deep ground) at the bottom.
  // Each background color is chosen so it is clearly different from the picture and the other background colors.
  function addBackground(g, themeId, bands) {
    const opts = BACKGROUNDS[themeId], H = g.length;
    const used = [...new Set(g.join('').replace(/\./g, ''))].concat(BOARD); // also stay away from the board color
    const minDist = (c) => Math.min(...used.map((u) => deltaE(c, u)));
    const pick = (list) => {
      // 1) the theme's preferred colors, 2) any background color that is far enough, 3) the most different one
      let ok = list.find((c) => minDist(c) >= MIN_DE) || BG_POOL.find((c) => !used.includes(c) && minDist(c) >= MIN_DE);
      if (!ok) ok = BG_POOL.filter((c) => !used.includes(c)).sort((a, b) => minDist(b) - minDist(a))[0];
      used.push(ok); return ok;
    };
    const sky = pick(opts.sky), ground = pick(opts.ground), deep = bands >= 3 ? pick(opts.deep) : null;
    return g.map((row, y) => [...row].map((ch) => {
      if (ch !== '.') return ch;
      const f = y / H;
      if (deep && f >= 0.92) return deep;
      if (f >= 0.8) return ground;
      return sky;
    }).join(''));
  }
  const themeOfPicture = (picId) => (EVENT.pictures.includes(picId) ? EVENT.id
    : (THEMES.find((t) => t.pictures.includes(picId)) || THEMES[0]).id);
  const gridCache = {};
  function levelGrid(picId, diff) {
    const key = picId + '|' + diff;
    if (gridCache[key]) return gridCache[key];
    const src = PICTURES[picId].grid, d = DIFFICULTY[diff];
    const big = d.scale === 3 ? scale3x(src) : d.scale === 2 ? scale2x(src) : src;
    // picture colors get (maxColors - background colors); then the background is added
    const picture = tidyColors(shade(big, d.shade), src, d.maxColors - (d.bgBands >= 3 ? 3 : 2));
    return (gridCache[key] = addBackground(picture, themeOfPicture(picId), d.bgBands));
  }
  // draws any grid (used for the bigger level pictures)
  function gridURL(grid, cell) {
    const c = document.createElement('canvas');
    c.width = grid[0].length * cell; c.height = grid.length * cell;
    const ctx = c.getContext('2d'), gap = Math.max(1, Math.round(cell / 10));
    grid.forEach((row, y) => [...row].forEach((ch, x) => {
      if (!PALETTE[ch]) return;
      ctx.fillStyle = PALETTE[ch]; ctx.fillRect(x * cell, y * cell, cell - gap, cell - gap);
    }));
    return c.toDataURL();
  }

  return { AD_SLOTS, PALETTE, PICTURES, THEMES, EVENT, eventDiff, DIFFICULTIES, DIFFICULTY, LEVELS_PER_DIFFICULTY, pictureURL, levelPicture, levelGrid, gridURL, deltaE };
})();
