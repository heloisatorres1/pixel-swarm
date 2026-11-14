# Pixel Swarm — How competitors build levels & pictures

Study date: 2026-11-13. Sources: app-store listings, fan level guides/walkthroughs, and the public design notes of an open-source Pixel-Hunt-style game. Board sizes are **not published** by any commercial game; numbers marked "≈" are estimates from descriptions ("hundreds of colored blocks").

## 1. The games

| Game | Developer | Levels | Notes |
|---|---|---|---|
| **Colony Flow!** (named in our design doc) | ABI Games | 3,000+ (walkthroughs past 2,700) | 5 slots (7 with booster), hard / super-hard levels mixed in |
| **Food Hunt: Pixel Puzzle** (doc: "Food Hunter") | FUNFINITY | 200+ | "hundreds of colored blocks"; near level 400 every 3–4 levels is hard/extreme |
| **Pixel Hunt: Ant Puzzle** | Shycheese | 90+ | ants only take blocks from the bottom edge; players complain of a difficulty spike at level 19 |
| **Ants Flow: Pixel Puzzle** | Estoty | ~900 | ~100 levels added per update; many obstacle types |
| **Ant Out: Pixel Block** | — | "hundreds" | hidden color layers revealed as ants dig deeper |
| **pixel-hunt (open source)** | saadiq | 50 scenes | publishes its full difficulty rules (below) |

## 2. Core rules — them vs. us

| Topic | Competitors | Pixel Swarm now | Gap |
|---|---|---|---|
| **Which pixels bugs can reach** | Ants enter from the nest at the bottom and **tunnel through eaten gaps** (also sideways). Strategy guides: "peel in rings", "the outermost color is the only one reachable at the start" | A pixel is reachable only when **its whole column below is empty** (no sideways tunnelling) | ⚠ Ours is stricter and less "organic". Switching to tunnelling would match the genre and create the ring-peeling strategy |
| Reachable hint | Colony Flow: **white ring on boxes whose color is reachable now**; pixel-hunt: press-and-hold preview | none | ⚠ Easy, very helpful aid to add |
| Slots | Colony Flow 5 (→7 with booster); pixel-hunt Easy 4–5 / Medium 3–4 / Hard 3 | Easy 4 / Medium 4 / Hard 3 | ✔ in range |
| Box number | number of ants / pixels it will take | pixels to eat | ✔ same |
| Box queue | stacks/trays below the board; hidden boxes under the top layer | 3 columns, 2 visible per column | ✔ similar |
| Lose condition | all slots full and no ant can move | same | ✔ |
| Level generation | pixel-hunt deals boxes **from a recorded winning order** → every deal winnable | same approach | ✔ |
| Difficulty check | pixel-hunt measures "mindless win rate" (≤0.85 Medium, ≤0.55 Hard) and decisions per board (6+ / 14+) | bot tests: careless loses Medium & Hard, careful wins | ✔ (could add the numeric checks) |
| Taps per board | pixel-hunt: Easy 30–60, Medium 60–90, Hard 90–150 (smaller squads) | Easy ≈12, Medium ≈30, Hard ≈52 blocks | ⚠ we have fewer, bigger blocks |

## 3. Pictures

| Topic | Competitors | Pixel Swarm now |
|---|---|---|
| Art | **Hand-crafted** pixel art per level, full rectangle with background | 10 hand grids, enlarged for Medium/Hard, + generated sky/ground background |
| Colors per picture | Colony Flow example (lv 354): **5** colors; pixel-hunt rule: **max 9, each ≥ 4 cells, every pair clearly different (CIEDE2000 ≥ 12)**, readable at 64 px | Easy 5–7, Medium 8–10, Hard 8–12 — includes **light/dark shades of the same color** |
| Size | ≈ "hundreds of blocks" | Easy 144, Medium 576, Hard 1,296 |
| Variety | hundreds–thousands of different pictures | 10 pictures (each reused 7–8 times) |
| Design rule | open pictures with little enclosed art → Easy/Medium; frames/enclosures create the hard decisions | Hard adds a wall frame (visual only) |

⚠ Our extra shades are *similar* colors (pink vs light pink). Competitors keep colors **clearly distinct** so the player can tell them apart at a glance. More colors should come from **new, distinct colors in the art**, not shades.

## 4. Obstacles / puzzles

| Competitor mechanic | Where | In our doc? | Built? |
|---|---|---|---|
| "?" mystery box (color hidden until in a slot) | Colony Flow | Mystery blocks | ✔ (we reveal at the front of the column) |
| Locked box (can't tap while a box is above) | Colony Flow | Locked / frozen colors | ✔ frozen (different rule) |
| Linked boxes (joined, go together) | Colony Flow lv 53, 140 | Double blockers | ✘ |
| Key & lock | Colony Flow lv 342 | Key and lock | ✘ |
| Second nest hole | Colony Flow (later) | — | ✘ |
| Hidden color layers / fog | Ant Out, Ants Flow (fog) | Hidden pixels | ✘ |
| Rocks + hammer | Ants Flow | Wood block + hammer | ✘ |
| Leaf piles + fan, vines + shears, spiders + arrow ants | Ants Flow | — | ✘ |
| Super Cave | Food Hunt | — | ✘ |
| Walls | — | Walls in Hard | visual only |

## 5. Boosters & player aids

| Competitors | Ours |
|---|---|
| Extra Slot (up to 7), Shuffle, **Pick Up** (slot → back to stack), Vacuum (clear a color), Gun | Add Slot ✔, Shuffle ✔, Wing Help (= Vacuum) ✔, Free Pick ✔ |
| Permanent speed upgrade, temporary 2x, "Remove Ads + 2x speed" purchase | 2x toggle (free) |
| 3 undos, 1 rewind when stuck, free restart with new deal | Restart (same deal) |

## 6. Economy & player complaints (what to avoid)

- Coins per level: Colony Flow ≈20, Food Hunt 40 "regardless of difficulty" (criticised). **Ours 30/45/60 by difficulty ✔**
- Boosters too expensive (1,200 coins ≈ 30–60 levels) — common complaint.
- Ads after every level — most common complaint. **Ours: every 2 wins ✔**
- "Ants painfully slow" (Food Hunt) — slow 1x must not feel like a punishment.
- Difficulty walls that feel impossible without ads (Pixel Hunt lv 19, Ant Out).
- Players ask for a **gallery** of finished art and **level replay** (Ants Flow). **Ours ✔ both**.

## 7. Recommendations (priority order)

1. **Tunnelling reachability** (bugs reach pixels through eaten gaps, entering from the bottom) — genre standard, enables "peel in rings" strategy.
2. **Reachable indicator** on blocks (ring/glow when its color can be eaten now).
3. **Distinct colors instead of shades** in Medium/Hard; keep ≤ 9 clearly different colors per picture (art should add them).
4. **More pictures** — target 20–30 hand-made pictures (a ChatGPT/pixel-art pass), with Hard pictures that have *enclosed* areas (frames, windows, faces) which create real decisions.
5. Smaller blocks in Hard to approach 60–90 taps, or keep blocks and add obstacles.
6. Next obstacles from our doc that competitors validate: **Linked blocks**, **Key & lock**, **Hidden pixels**.
7. Player aids: 1 free **undo** per level, and **Pick Up** booster.
8. Sawtooth curve inside each theme (a harder level every 3–4) instead of a smooth ramp.
