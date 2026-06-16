# AGENTS.md — Endless Sky Outfit Builder ("Drydock")

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
  template.html                 ← HTML shell (markers /*__CSS__*/ and /*__JS__*/)
  app.css                       ← all styles
  app.js                        ← all logic (holds the /*__DATA__*/{} data placeholder)
  build.py                      ← stitches shell+css+js and injects data → index.html
  parse_endless_sky.py          ← parses Endless Sky data files → endless-sky-data.json
images/                         ← bundled ship/outfit thumbnails (CC-BY-SA-4.0)
.nojekyll
```

## Build rule (important)
`index.html` is GENERATED: `build.py` inlines `app.css` into the `/*__CSS__*/` marker
and `app.js` into the `/*__JS__*/` marker of `template.html`, then injects
`data/endless-sky-data.json` into the `/*__DATA__*/{}` placeholder inside the JS.
**Never edit `index.html` directly.** To change the app:
1. Edit the relevant source: `pipeline/app.css` (styles), `pipeline/app.js` (logic),
   or `pipeline/template.html` (page structure).
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
Stat engine (validated), real bundled sprite art (ships + outfits, `images/`), race -> model
ship picker (uses each ship's `display name`), hardpoint schematic (toggle on the ship card),
ship variants exposed as clickable loadout presets, two-column UI (ship + stats + installed
loadout on the left, outfitter art-grid on the right), drag-and-drop, search + category filter,
spoiler/tech gate, empty/stock presets, and "where to buy" per outfit.

## Roadmap / next ideas
- "Where to loot" (needs NPC fleet definitions, not in the buy index yet).
- Shareable build URLs (encode ship + outfits + tier in the URL hash) — not yet implemented.
- DPS / combat detail; A/B build comparison; mobile polish.
- Variant attribute/sprite overrides (today a variant only swaps its outfit loadout; the rare
  variants that change hull attributes or sprite are approximated by the base hull).

## Bundled images (CC-BY-SA-4.0)
`images/` holds ship/outfit thumbnails pulled from Endless Sky v0.11.0 (same relative paths as
the game's `images/` tree). They are NOT injected into index.html — the app references them at
`images/<path>.png`. The parser keeps the `thumbnail`/`sprite` path strings; `pipeline/` does not
download images. To refresh art for a new release, re-pull the thumbnails referenced by the data.
Art stays under CC-BY-SA-4.0 — keep `images/CREDITS.md` and attribution.

## Versioning / patch notes
v1.0.0 = first public release. **Bundle work into batches: each +0.0.1 release should carry ~7–10
related changes — don't bump the version for every small change.** While a batch is in progress,
keep accumulating it under the current version (append to its notes); only roll to the next +0.0.1
once the batch is full / shipped. Named updates (e.g. v0.6.0 "Thorndeux update") group a theme.

The user-facing changelog is the **in-app patch-notes tracker**: `PATCH_NOTES` at the top of
`pipeline/app.js` (newest entry first; `notes` = shipped items, optional `soon` = roadmap for the
current batch). Add/append there. A "new" dot shows on the gear + Patch notes button until the user
opens it (keyed on `LATEST_PATCH` vs `localStorage drydock-seen-patch`).

Also: bump the header version string in `pipeline/template.html` and keep `CHANGELOG.md` (the
dev-facing log) in sync with the same batch.

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
