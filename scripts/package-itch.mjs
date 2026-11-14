// Zips dist/ for itch.io (index.html must be at the ROOT of the zip — the most common itch upload mistake).
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const outDir = join(root, 'release');
const zip = join(outDir, `pixel-swarm-itch-v${version}.zip`);
mkdirSync(outDir, { recursive: true });
rmSync(zip, { force: true });

if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${join(root, 'dist')}\\*' -DestinationPath '${zip}'`], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-r', zip, '.'], { cwd: join(root, 'dist'), stdio: 'inherit' });
}
console.log(`itch.io package ready: release/pixel-swarm-itch-v${version}.zip`);
