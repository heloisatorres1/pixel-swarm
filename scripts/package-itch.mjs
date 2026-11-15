// Zips dist/ for itch.io (index.html must be at the ROOT of the zip — the most common itch upload mistake).
import { mkdirSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const outDir = join(root, 'release');
const zip = join(outDir, `pixel-swarm-itch-v${version}.zip`);
mkdirSync(outDir, { recursive: true });
rmSync(zip, { force: true });

if (process.platform === 'win32') {
  // Windows' own tar (bsdtar) writes zip paths with forward slashes. PowerShell 5.1's Compress-Archive writes
  // backslashes (assets\bg\menu.jpg), which itch.io's servers don't treat as folders: the game loads without its art.
  const tar = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
  execFileSync(tar, ['-a', '-c', '-f', zip, ...readdirSync(dist)], { cwd: dist, stdio: 'inherit' });
} else {
  execFileSync('zip', ['-r', zip, '.'], { cwd: dist, stdio: 'inherit' });
}
console.log(`itch.io package ready: release/pixel-swarm-itch-v${version}.zip`);
