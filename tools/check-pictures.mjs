// Checks the level pictures (js/pictures.js) and renders a preview sheet.
//   node tools/check-pictures.mjs [themeId|all] [out.png]
// Checks: square grids of the right size (12 for Easy/Medium, 18 for Hard), only picture colors, color count per
// difficulty, no two colors that look alike (CIELAB ΔE < 25) and none close to the board color.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const ctx = { window: {}, document: { createElement: () => ({}) } };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('js/pictures.js', root), 'utf8'), ctx);
vm.runInContext(readFileSync(new URL('js/data.js', root), 'utf8'), ctx);
const D = ctx.window.PS_DATA, PICS = D.PICTURES, LV = ctx.window.PS_LEVELS;
const BG = new Set('DIJLHCTEKFMUVWXZ'.split(''));
const MAX = { easy: 5, medium: 7, hard: 9 }, SIZE = { easy: 12, medium: 12, hard: 18 };

const want = process.argv[2] || 'all', out = process.argv[3];
const groups = [];
for (const [theme, levels] of Object.entries(LV)) {
  if (want !== 'all' && want !== theme) continue;
  if (Array.isArray(levels)) levels.forEach((id, i) => groups.push([theme, D.eventDiff(i), id]));
  else for (const d of ['easy', 'medium', 'hard']) levels[d].forEach((id) => groups.push([theme, d, id]));
}
let problems = 0;
const seen = new Map();
// a new picture must not reuse the name (id) of a built-in picture in js/data.js (it would replace it)
const builtIn = vm.runInContext('Object.keys(window.PS_DATA.PICTURES)', ctx).filter((id) => !(id in ctx.window.PS_PICTURES));
const dataSrc = readFileSync(new URL('js/data.js', root), 'utf8');
for (const id of Object.keys(ctx.window.PS_PICTURES)) {
  if (new RegExp(`\\n    ${id}: \\{ name:`).test(dataSrc)) { console.log(`✗ "${id}" in js/pictures.js replaces the built-in picture with the same name`); problems++; }
}
void builtIn;
for (const [theme, diff, id] of groups) {
  const p = PICS[id], err = [];
  if (!p) { console.log(`✗ ${theme}/${diff}: missing picture "${id}"`); problems++; continue; }
  if (seen.has(id)) err.push(`also used in ${seen.get(id)}`);
  seen.set(id, `${theme}/${diff}`);
  const g = p.grid, n = SIZE[diff];
  if (g.length !== n) err.push(`${g.length} rows (want ${n})`);
  g.forEach((r, y) => { if (r.length !== n) err.push(`row ${y} has ${r.length} chars`); });
  const colors = [...new Set(g.join('').replace(/\./g, ''))];
  colors.forEach((c) => { if (!D.PALETTE[c] || BG.has(c)) err.push(`bad color "${c}"`); });
  if (colors.length > MAX[diff]) err.push(`${colors.length} colors (max ${MAX[diff]})`);
  const ok = colors.filter((c) => D.PALETTE[c] && !BG.has(c));
  for (let i = 0; i < ok.length; i++) {
    if (D.deltaE(ok[i], 'Z') < 25) err.push(`"${ok[i]}" too close to the board`);
    for (let j = i + 1; j < ok.length; j++) if (D.deltaE(ok[i], ok[j]) < 25) err.push(`"${ok[i]}"~"${ok[j]}" ΔE ${D.deltaE(ok[i], ok[j]).toFixed(0)}`);
  }
  const empty = g.join('').split('').filter((c) => c === '.').length / (g.length * g[0].length);
  console.log(`${err.length ? '✗' : '✓'} ${theme}/${diff} ${id} "${p.name}" ${colors.length} colors, ${Math.round(empty * 100)}% background${err.length ? ' — ' + err.join('; ') : ''}`);
  if (err.length) problems++;
}
console.log(`${groups.length} pictures, ${problems} with problems`);

// preview: each picture as it looks in its level (size, shading, background), 6 per row
if (out) {
  const tiles = groups.filter(([, , id]) => PICS[id]).map(([, d, id]) => D.levelGrid(id, d));
  const T = 180, pad = 8, cols = 6, rows = Math.ceil(tiles.length / cols);
  const W = cols * (T + pad) + pad, H = rows * (T + pad) + pad, px = Buffer.alloc(W * H * 3, 245);
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  tiles.forEach((g, i) => {
    const ox = pad + (i % cols) * (T + pad), oy = pad + Math.floor(i / cols) * (T + pad), cell = Math.floor(T / g.length);
    g.forEach((row, y) => [...row].forEach((ch, x) => {
      const c = hex(D.PALETTE[ch] || '#30543c');
      for (let dy = 0; dy < cell - (cell > 4 ? 1 : 0); dy++) for (let dx = 0; dx < cell - (cell > 4 ? 1 : 0); dx++) {
        const o = ((oy + y * cell + dy) * W + ox + x * cell + dx) * 3; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
      }
    }));
  });
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) px.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  console.log('preview:', out, `(${tiles.length} pictures, order as listed above)`);
}
