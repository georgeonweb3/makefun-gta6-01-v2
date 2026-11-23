# makefun-gta6-01-v2

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/georgeonweb3/makefun-gta6-01-v2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/georgeonweb3/makefun-gta6-01-v2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay — a complete open-world crime game in the spirit of GTA 6, running offline in a desktop browser from static files. No Rockstar assets: an original coastal city, original characters, original story, original art and synthesized sound.

Drive and steal cars across seven districts, run from the law under a five-star wanted system, fight on foot, and work eight story jobs for the fixer Mama Luz — from stealing your first wheels to surviving the whole city's heat and becoming King of the Bay. Traffic, pedestrians, police chases, a HUD with a live minimap, taxi fares, ten hidden packages, and a save that survives a closed tab.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

No build step, no dependencies, no network requests. WASD / arrows to move and drive, E to enter or steal a car, F to punch, G to shoot, Q to switch weapons, Shift to sprint, P to pause, M to mute. Progress saves to localStorage when you finish a job.

## What is in here

- `game/` — the playable game: `game/index.html` plus ES modules under `game/src/` (city, driving, traffic, pedestrians, police and the wanted system, combat, eight missions, HUD and minimap, synthesized WebAudio sound, saves). Pure canvas 2D, zero libraries.
- `screenshots/` — four captures of the game running (title, driving, police chase, street race).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to the output and writes `dossier.json` with the kit's vendored library. Run it with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.
- `serve.ts` — a tiny static server for local playtesting.
- `shots.json` — the four staged screenshot scenes (`?shot=start|drive|chase|mission`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=eqkgefdh&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
