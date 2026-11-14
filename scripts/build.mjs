// Builds the shippable game into dist/ (only the files the game needs — no mockups, tools or docs).
// Release builds turn the debug menu off. Use `npm run build:debug` to keep it.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const debug = process.argv.includes('--debug');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const item of ['index.html', 'css', 'js', 'assets', 'CREDITS.md']) {
  const src = join(root, item);
  if (existsSync(src)) cpSync(src, join(dist, item), { recursive: true });
}

// release settings inside the built app.js (the source files stay untouched)
const appPath = join(dist, 'js', 'app.js');
let app = readFileSync(appPath, 'utf8');
app = app.replace(/const DEBUG = (true|false);/, `const DEBUG = ${debug};`);
app = app.replace(/const APP_VERSION = '[^']*';/, `const APP_VERSION = '${pkg.version}';`);
writeFileSync(appPath, app);

// cache-busting: every build gets a unique tag, so browsers and itch.io always load the newest files
const buildTag = `${pkg.version}-${Date.now().toString(36)}`;
const htmlPath = join(dist, 'index.html');
const html = readFileSync(htmlPath, 'utf8').replace(/(href|src)="(css|js)\/([^"?]+)"/g, `$1="$2/$3?v=${buildTag}"`);
writeFileSync(htmlPath, html);

console.log(`Built Pixel Swarm v${pkg.version} into dist/ (${debug ? 'DEBUG build' : 'release build, debug menu off'})`);
