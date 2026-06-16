# Drydock — Session Handover

**Project:** Drydock, a static client-side Endless Sky ship/fleet outfit builder.
**Current version:** v0.3.74 (ES game data v0.11.0).
**Last session focus:** UX overhaul — header tabs, side-drawer panels, Outfitters/Shipyards browse.

> Read `AGENTS.md` first — it is the source of truth for architecture and the build rule.
> This file is a snapshot of *where things stand* and *how to keep working*.

---

## How it's built (don't skip this)

`index.html` is **generated** — never hand-edit it. The pipeline is:

- `pipeline/template.html` — HTML shell with markers `/*__CSS__*/` and `/*__JS__*/`
- `pipeline/app.css` — all styles
- `pipeline/app.js` — all logic (holds the `/*__DATA__*/{}` data placeholder)
- `data/endless-sky-data.json` — parsed game data (ships, outfits, buy locations)
- `python3 pipeline/build.py` → stitches them into `index.html` (~1.66 MB, data embedded)

**Editing workflow that works in this repo:**

1. Make source edits with **python `rep()` heredocs run through bash**, not the Edit tool —
   the Edit/Read tools truncate these large files. Pattern:
   ```python
   def rep(path,o,n,c=1):
       s=open(path,encoding="utf-8").read()
       assert s.count(o)==c
       open(path,"w",encoding="utf-8").write(s.replace(o,n))
   ```
2. `node --check pipeline/app.js` to catch JS syntax errors.
3. `python3 pipeline/build.py`.
4. Smoke-test with jsdom in `/tmp` (reinstall `jsdom` after a VM restart):
   load `index.html` with `runScripts:"dangerously"`, click tabs, assert on the DOM.
5. Bump the version in `pipeline/template.html` (the `Drydock vX.Y.Z` string) and add a
   `CHANGELOG.md` entry.

**Do not tell the user to redeploy.** Deploy is the user's Netlify drag-folder step; git pushes
are done by the user. Just make the change and report it.

---

## Architecture cheat-sheet

**Panels** are driven by `document.body.dataset.panel` = `"" | "ship" | "parts" | "shop" | "yard"`.
CSS reveals a panel with `body[data-panel="X"] #panelId{transform:none}`. Closing uses
`delete document.body.dataset.panel` (an empty-string `[data-panel]` selector still matches — that
bug bit us once, in v0.3.66/67).

Four side drawers (`.sidepanel`, right-docked overlays) live after `</main>` in `template.html`:

- `#outfitter` — **Add Parts**: search + race `#partsFac` + rail `#catbar` + grid `#catalog` (drag enabled)
- `#shipPicker` — **Add Ship**: `#pickerSearch` + rail `#pickerFac` + grid `#pickerGrid` (click to select)
- `#outfitters` — **Outfitters**: `#shopSearch` + rail `#shopRail` + grid `#shopGrid` (browse-only)
- `#shipyards` — **Shipyards**: `#yardSearch` + rail `#yardRail` + grid `#yardGrid` (browse-only)

Tabs are in the existing `<header>` (`.headtabs` / `.toptab`), styled as real attached tabs.

**Key JS functions:** `ocardHTML(o, drag=true)` (outfit card; `drag=false` for Outfitters),
`shipcellHTML(s)` (ship cell), `openPanel/closePanels/togglePanel`, `buildShopMap/buildYardMap`
(invert each outfit/ship's `soldAt` → station→items map; `_stKey(loc)` = `"Planet · System"`),
`renderShop/renderYard`. Drag-to-install is scoped: cards are draggable only in `#catalog`; drop
targets are `#shipcard` and `.loadpanel`.

**Spoiler tiers** gate outfits/ships by faction via `factionTier()` + `state.tier`
(0 human · 1 hai/quarg/pug · 2 wanderer/korath/remnant/coalition · 3 everything).

**The stat engine** (`computeStats`, `eff`, `capacity`, `coolingEfficiency` in `template.html`) is
ported verbatim from the game source and validated to the digit. Do not "fix" the formulas without
checking against the game first.

---

## What was done this session (v0.3.66 → v0.3.74)

- Fleet "Issues" warnings corrected (dropped impossible Crew/Fuel checks → Weapons/Shields) with hover text.
- Responsive/resolution audit + reflow fixes; big-number formatting (e.g. 21.2k); fixed left-column spacing.
- Outfit cards made uniform fixed size; outfitter turned into a collapsible side drawer (overlay, no page push).
- Unified Add Ship + Add Parts as side drawers (search on top, left sort rail).
- Add Parts gained finer sections via `series` (Coolers, Batteries, …) and a race filter.
- Slimmer scrollbars; removed reflow-on-select; flagship ring made inset; wider ship-card stat columns.
- Tabs moved **into the header** and restyled from pills to real tabs (v0.3.73).
- Added **Outfitters** and **Shipyards** browse panels (station → items/ships for sale), built from `soldAt`.
- **v0.3.74 (latest):** widened side panels (660px; Outfitters/Shipyards 900px; full-width on phones)
  and disabled drag-and-drop in Outfitters/Shipyards (browse-only; drag stays in Add Parts).

---

## Roadmap / open ideas (nothing in progress)

- Weapon/engine type keyword filter (Laser / Pulse / Photon / Missile; Ion / Atomic …) — deferred:
  there's no clean data field for it yet.
- Shareable build URLs (encode ship + outfits + tier in the URL hash). *Note: a `Share` button and
  `fleetShare` exist in the UI — confirm what they currently do before building this.*
- Combat detail / DPS; A/B build comparison.
- Smart-outfitter: affordability / won't-fit hints.
- "Where to loot" (needs NPC fleet definitions, not in the buy index yet).
- Group the Outfitters/Shipyards station rails by system or government.
- Variant attribute/sprite overrides (today a variant only swaps its outfit loadout).
- More mobile polish.

---

## Gotchas learned the hard way

- Edit/Read tools **truncate** the big source files — always edit via python `rep()` in bash.
- Closing a panel must `delete` the dataset key, not set it to `""`.
- `.statpills` flex can defeat `column-count` — fleet totals needed a higher-specificity rule.
- The build VM occasionally boots slowly ("Workspace still starting") — retry after a few seconds.
- Never paste the full `index.html` back into chat (~1.66 MB).
- Bundled art under `images/` is CC-BY-SA-4.0 — keep attribution; don't hotlink external copyrighted art.

---

## Resume prompt (paste into a fresh session)

> I'm continuing work on **Drydock**, my static Endless Sky outfit builder in
> `C:\Users\Admin\Desktop\Endless Sky Outfits`. Read `AGENTS.md` and `HANDOVER.md` first — they
> explain the build pipeline and current state (we're at v0.3.74).
>
> Important working rules: edit only the `pipeline/` sources (never `index.html` directly) using
> python `rep()` heredocs through bash (the Edit tool truncates these large files); run
> `node --check pipeline/app.js`, then `python3 pipeline/build.py`; bump the version in
> `pipeline/template.html` and add a `CHANGELOG.md` entry; jsdom-smoke-test in `/tmp`. Don't tell
> me to redeploy — I handle Netlify and git myself.
>
> Next I want to: **<describe the task>**.
