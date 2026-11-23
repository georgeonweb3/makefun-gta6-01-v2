// Solmar Bay — gta6-01 entry program (Node 22, standard library only).
//
// What it hands in: the game in game/ (static files, plain canvas 2D, no
// library and no network request), the four screenshots in screenshots/, and
// a dossier.json the judge reads, built with the kit's vendored make.fun
// library.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// which writes out/game, out/screenshots and out/dossier.json. In the grader
// MAKEFUN_OUTPUT_DIR is unset and /output is used instead. The run is
// deterministic: the same tree always writes the same bytes.
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameOut = join(outputDir, 'game');
const shotsOut = join(outputDir, 'screenshots');

mkdirSync(outputDir, { recursive: true });
rmSync(gameOut, { recursive: true, force: true });
rmSync(shotsOut, { recursive: true, force: true });
cpSync(join(repoRoot, 'game'), gameOut, { recursive: true });
mkdirSync(shotsOut, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsOut, { recursive: true });
}

// Caps from the kit's gate (reference/gate.json): the dossier text cap shapes
// the bytes; the rest mirror what the scorer refuses — at most 4 screenshots
// of 256 KiB each, at most 993 files / 48 MiB under game/, paths under 1000
// bytes — so a bad tree fails here instead of at the gate.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
