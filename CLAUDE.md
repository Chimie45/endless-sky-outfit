# CLAUDE.md — Endless Sky Outfit Builder ("Drydock")

Read this before any task. It's the source of truth for what this project is and how to work on it.

## What this is
A static, client-side web app for building ship loadouts in the game **Endless Sky** (stable
release). Pick a ship, add outfits, and see heat / energy / thrust / capacity update live. No
backend, no database — it runs entirely in the browser.

- **Live site:** https://chimie45.github.io/endless-sky-outfit/ (GitHub Pages)
- **Repo:** https://github.com/Chimie45/endless-sky-outfit
- **Hosting:** GitHub Pages, deploy-from-branch `main`, folder `/ (root)`. Pushing to `main`
  redeploys automatically.

## File layout
```
index.html                      ← the deployed page. GENERATED — do not hand-edit.
data/endless-sky-data.json      ← parsed game data (ships, outfits, buy locations)
pipeline/
  template.html                 ← THE APP SOURCE. Edit this for any app change.
  build.py                      ← injects data/*.json into template.html → index.html
  parse_endless_sky.py          ← parses Endless Sky data files → endless-sky-data.json
.nojekyll
```

## Build rule (important)
`index.html` is `template.html` with the JSON data injected in place of `/*__DATA__*/{}`.
**Never edit `index.html` directly.** To change the app:
1. Edit `pipeline/template.html`.
2. Run `python pipeline/build.py` (writes `index.html` at repo root).
3. Commit + push (see workflow below).

## Update to a new game release
1. Download the new **stable** release source from
   https://github.com/endless-sky/endless-sky/releases and unzip it.
2. `python pipeline/parse_endless_sky.py /path/to/endless-sky-<ver> data/endless-sky-data.json`
3. `python pipeline/build.py`
4. Commit `data/endless-sky-data.json` and `index.html`.

## The stat engine — do not casually "fix" it
The live-stat math in `template.html` (`computeStats`, `eff`, `capacity`, `coolingEfficiency`)
is ported **verbatim** from the game's own source (`ShipInfoDisplay.cpp` / `Ship.cpp`) and
**validated to the digit** against a real in-game ship-info screenshot — including the nonlinear
cooling-inefficiency S-curve. If a number looks wrong, verify against the game before changing
the formula; the formulas are correct as written.

## Spoiler / tech tiers
Outfits are gated by `faction` (the data subfolder they came from). Tier map in `template.html`:
0 = human · 1 = hai/quarg/pug · 2 = wanderer/korath/remnant/coalition · 3 = everything else.

## What's done
Stat engine (validated), hardpoint schematic from real coordinates, drag-and-drop outfitter
catalog with search + category filter, spoiler/tech gate, presets (empty / stock), "where to buy"
per outfit, and shareable build URLs (ship + outfits + tier encoded in the URL hash).

## Roadmap / next ideas
- Real sprite art (data has the image paths; assets are CC-BY-SA-4.0 — credit + same license).
- "Where to loot" (needs NPC fleet definitions, not in the buy index yet).
- Ship variants (currently base hulls only).
- DPS / combat detail; A/B build comparison; mobile polish.

## Git workflow
This is a public GitHub repo. After a change, from the repo root:
```
git add . && git commit -m "<short descriptive message>" && git push
```
Write your own descriptive commit message. If a push fails on auth, the user may need to run it
(GitHub credentials live on the host, and may not be present in an isolated VM).

## Conventions
- Keep responses/edits focused; only change files that actually changed.
- The repo folder is: `C:\Users\Admin\Desktop\Endless Sky Outfits` on the user's machine.
- `index.html` is ~1.4 MB because data is embedded — never paste its full contents back to chat.
