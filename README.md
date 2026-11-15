# 🐝 Pixel Swarm

A cute casual puzzle game for mobile and web. Tiny bugs live inside the magical **Art-Tree**: send them out, color by color, to eat pixel-art pictures. Bugs can only reach what is uncovered, so the order you pick colors in is the whole puzzle.

**▶ Play in your browser:** https://heloisatorres1.github.io/pixel-swarm/

![Pixel Swarm main menu](docs/screenshots/main-menu.png)

## About this project

Portfolio project by **[@heloisatorres1](https://github.com/heloisatorres1)**, **Senior QA / Test Lead**.

I wrote the game design document, directed the art and owned the product end to end, the way a small studio team would: from concept and level design to release on the web and a native Android build. Development was AI-assisted under my direction; quality was built in from the start, with automated checks for every system (see [Quality & testing](#quality--testing)).

## Features

- **Core loop:** tap colored blocks into a few slots; bugs fly out of the tree, eat the matching pixels and carry them home. Fill every slot with colors that can't be reached and you're out of slots.
- **87 levels:** 5 themes × 15 levels (Easy → Medium → Hard) plus a 12-level **Halloween event** with a pumpkin reward track.
- **10 puzzle mechanics**, introduced one by one with a "New Feature" card: mystery blocks, frozen blocks (ice counter), linked blocks, mystery links, pipes, keys & locks, wood blocks + hammers, cookie blockers, big pixels and hidden pixels.
- **Boosters:** Add Slot, Shuffle (never leaves you stuck), Wind, Free Pick; rewarded AD slots.
- **Meta systems:** store and speed store, daily rewards and tasks, stat-based achievements, a gallery of every level, a skins wardrobe (6 bugs × 7 looks), profile, story cutscene, guided first level, age gate and special offers.
- **Music and sound effects** synthesized live with the Web Audio API (no audio files).

## Quality & testing

The levels are generated procedurally, so "it looks fine" isn't enough: every level and mechanic is checked automatically with the game's own rules. Each check runs in the browser from a URL shortcut and also runs headless.

| Check | What it proves |
|---|---|
| `#verify_all` (level checker) | All **87 levels are solvable**: each one is played instantly in solution order with the real rules. Also reports a **careless-player win rate** per difficulty against design targets, whether each puzzle type can be placed in every level, and visual rules (e.g. never two hidden "?" blocks in one column). |
| `#pzsolve_<puzzle>` (playthroughs) | A bot plays a level with each puzzle **through the real animated game loop** until it wins. This caught a desync between the instant checker and the animated game that only showed up with the cookie blocker. |
| `#clicktest` (real taps) | Taps puzzle tiles and the skins purchase flow **through the page, like a finger**. It caught a tap-handling clash that the bots (which call game functions directly) could not see. |
| Layout probes and screenshots | Layout and "fits without scrolling" checks at several phone sizes; headless screenshots to compare screens against the design references. |
| `PSAudio.measure()` | Renders the music and effects offline and measures their loudness, to balance the mix without relying on speakers. |

Release builds turn the debug menu off; the shortcuts above are kept so the game can be tested anywhere.

## Tech

| | |
|---|---|
| Rendering | Hybrid: **PixiJS 8** (WebGL) draws the gameplay (picture board, flying bugs, effects); menus, store and pop-ups are HTML/CSS. Falls back to a 2D canvas without WebGL |
| Code | Vanilla JavaScript, no framework or bundler (~5.5k lines) |
| Audio | Web Audio API: two music loops and ~18 synthesized sound effects |
| Native | Capacitor → Android, with haptics and local notifications |
| Build & deploy | Node build scripts → `dist/`; GitHub Actions publishes to GitHub Pages on every push to `main` |
| Art | AI-generated images, art-directed and processed with the PowerShell tools in `tools/` |

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

Useful shortcuts (add to the URL): `#game`, `#game_hard`, `#events`, `#skins`, `#puzzle_key`, `#autoplay`, `#verify_all`, `#clicktest`.

## Build

```bash
npm run build          # release build → dist/
npm run package:itch   # zip for itch.io (HTML5)
npm run android:sync   # build + copy into the Android project
npm run android:open   # open in Android Studio
```

## Project structure

```
index.html, css/, js/, assets/   the game
scripts/                         build, dev server, itch packaging
tools/                           sprite cutting and slicing tools (PowerShell)
docs/                            competitor level study, screenshots
android/                         Capacitor Android project
```

## Credits

See [CREDITS.md](CREDITS.md).
