# Changelog — Drydock (Endless Sky Outfit Builder)

Versioning: **v1.0.0** = first public release. The **second number** groups one
update (a batch of related work); the **third number** is an individual change
within that update. (Pre-1.0 we are still in the 0.x line.)

Drydock's app version is shown in the header; the Endless Sky game-data version
it was built against is shown next to it (currently ES data v0.11.0).

---

## v0.3 — UX overhaul update

### v0.3.50 — 2026-06-11
- Fleet panel polish: added a "Fleet Stats" title with the ship count (blue) and total buy price
  (gold) directly under it; removed the now-redundant Total ships stat row. Shrunk the fleet-name
  selector and tightened the action buttons so they fit. Fleet ship icons now show 8 across (was 10).

### v0.3.49 — 2026-06-11
- Fleet panel relayout: the fleet name + New/Rename/Delete moved into the right column above the
  action buttons, and the stats column now extends to the top of the section for more room.
- Added fleet-wide health rows beside Jump: Moving (✗ N can't move), Drone bays (✗ N lack bay),
  Power (⚠ N lack power), Heat (⚠ N overheat) — each shows a green ✓ when the whole fleet is fine.
  These recompute on every edit (drive type included), so a ship's badge and the totals update live.
- The fleet count is now styled: ship count in blue, "to buy" price in bold gold.

### v0.3.48 — 2026-06-11
- Fixed: editing a ship that's selected in the fleet now writes through to that fleet entry, so
  its icon badges and the fleet totals reflect what you see. (Before, emptying or re-outfitting a
  selected fleet ship left the saved entry — and thus its drive/warning badge — stale.) Picking a
  different hull from the ship picker detaches, so you don't overwrite the selected entry. The
  warning logic itself was already correct (an empty hull audits as red — no thrust/steering).

### v0.3.47 — 2026-06-11
- Warning badge is now just the ⚠ symbol (no circle/background), forced to monochrome so the
  colour shows: red for serious issues, yellow for risks, with a dark outline for legibility.

### v0.3.46 — 2026-06-11
- Importing a fleet now adds it as a new named fleet (carrying the shared fleet's name) instead
  of overwriting the active one; a name clash gets a numeric suffix (e.g. "Raiders 2"). The
  fleet name is included in Share links. Opening a shared link clears the URL hash afterward so
  reloading doesn't keep re-importing. Old (nameless) share codes still import.

### v0.3.45 — 2026-06-11
- Drive badge restyled: no background, just a bold letter with a dark outline for legibility —
  bright green for H/S (hyperdrive / scram), blue for J (jump drive). Warning badge made larger
  and higher-contrast.

### v0.3.44 — 2026-06-11
- Fleet ships now show two corner badges on their icon: a drive type top-left (H hyperdrive,
  S scram, J jump) and a status warning bottom-right — red for a broken ship (no thrust /
  no steering), yellow for a risk (will run out of power, or will overheat).
- "Flagship" button (under Copy Ship) marks one ship as the ship you pilot; it gets a blue
  glow. Only one flagship at a time (click again to clear).
- New "Jump" total reports the fleet's shared travel: "Jump drive" if every ship has one,
  "Hyperlink" if all can at least follow links, or a red "N can't jump" if any ship has no
  drive. Added a "Firepower" (total DPS) total too. (Endless Sky has no per-ship jump-range
  number in the data — range is a fixed game constant — so this shows shared drive capability.)
- Fighters / drones total turns red when small craft outnumber total bays, and yellow when a
  craft can't be loaded for lack of the right bay type (e.g. a drone with only fighter bays).
- Multiple named fleets: a dropdown to switch, plus New / Rename / Delete. Existing single
  fleet is migrated automatically. Per-ship rename/label via double-click. Hover a ship for a
  card with cost, crew, cargo, firepower and drive. Share/Import now carry labels and the flagship.

### v0.3.43 — 2026-06-11
- Fleet panel now grows to fill the leftover space below the ship card (the ship list scrolls
  inside it) instead of a fixed height. Fleet totals restyled to match the ship stat pills
  (label left, value pill right) and expanded to: Total ships, Total cargo, Total crew, Daily
  cost, and Fighters / drones (count of fighter/drone hulls out of the fleet's total bays).

### v0.3.42 — 2026-06-11
- Install lock now also guards cargo space (and fuel capacity) from going negative, matching
  the game. Previously cargo-converting outfits like "Outfits Expansion" could push cargo to
  negative values; now they're blocked (with the beep + notice) once cargo would drop below 0,
  in both manual installs and the Max crew auto-fill.

### v0.3.41 — 2026-06-11
- Added the Fleet tracker below the ship card. Left side shows live totals (Total cargo,
  Total crew, Total daily cost = 100 cr/day per crew, pilot unpaid); the middle lists fleet
  ships as 40x40 icons with names (up to 10 across, scrolls beyond that); the right has
  Import, Share, Clear, Remove and Copy Ship. Click a ship to select it and load it into the
  builder; Remove/Copy act on the selection. The fleet persists in your browser. Share copies
  a link with the whole fleet encoded in the URL (#f=) and Import reads a pasted link or code;
  opening a fleet link restores it automatically. (Replaces the small roster from v0.3.39.)

### v0.3.40 — 2026-06-11
- Corrected the v0.3.39 layout: the status alerts (Thrust / Steering / Energy / Heat) move
  back beside the ship name. The six action buttons now live under Energy & heat in a 2x3
  grid: Empty hull, Stock, Max cargo, Max crew, + Add to Fleet, Share.
- The "Variants" section in the loadout panel now lists only the ship's actual factory
  variants (e.g. Cosmic Devil, Hai Engines); it shows "No factory variants" when a hull
  has none. Presets are no longer mixed in there.

### v0.3.39 — 2026-06-11
- Loadout panel header renamed "Variants"; the quick status tags (Thrust / Steering /
  Energy / Heat) moved out of the ship-name row to sit under the Energy & heat stats.
- Presets trimmed and clarified: removed "Max DPS" (not meaningfully knowable); presets
  are now Empty hull, Stock, Max cargo, Max crew. Max cargo / Max crew now fit engines but
  no reactor or cooling on purpose (they maximise one stat, so the hull is power-starved
  and won't actually fly). Max crew also converts spare cargo into outfit space via
  "Outfits Expansion" so it can stack more bunk rooms (e.g. Star Barge 3 -> 27 bunks).
- Added "+ Add to Fleet" and "Share" buttons under the presets. Add to Fleet saves the
  current ship + loadout to a fleet list kept in your browser, shown as a roster with
  combined cost / crew / cargo totals; click a saved build to reload it, x to remove.
  Share copies a link with the whole build encoded in the URL; opening that link rebuilds it.

### v0.3.38 — 2026-06-11
- Fixed the Energy alert reading "OK" on an empty hull. The check now requires an
  actual generation source (reactor / solar / fuel cell) in addition to a non-negative
  idle energy balance — a ship with no way to make power now correctly flags Energy x.
  Documented the energy and heat sustainability breakpoints inline. Stock builds are
  unaffected (still pass).

### v0.3.37 — 2026-06-11
- Top-down ship sprite: dialed back the edge blur and lightened the grayscale fill a
  touch (less blur, less darkness) per feedback that it was slightly over-blurred and dark.

### v0.3.20 — 2026-06-11
- Stats restyled to "label outside, value(s) in pill boxes" across Capacity, Movement,
  Energy & Heat, and the cost/crew/cargo/fuel quick-stats (Energy & Heat show two value
  pills per row). Reduced number font sizes throughout. Left art now matches the pill
  column width. Race/Type/Name header shrunk and kept to a single line (long ship names
  like "Korsmanath A'awoj" no longer wrap).

### v0.3.19 — 2026-06-11
- Recombined Energy & Heat into one group (E and H side by side per row) with a divider
  separating the two columns so they no longer touch. Reduced the stat-pill number font
  sizes so everything fits more comfortably.

### v0.3.18 — 2026-06-11
- Header reordered to Race / Type / Name. Energy and Heat split into separate pill
  columns (label left, value right). Removed the duplicated Speed/Shields/Hull/Bays from
  the left; moved Capacity to the left column (left = Cost/Crew/Cargo/Fuel + Capacity;
  right = Movement & Defense, Energy, Heat).

### v0.3.17 — 2026-06-11
- Ship card relayout: ship name now sits inline with its faction/class; the
  Gun/Turret/Engine/Bay key is overlaid inside the (skinnier, centered) top-down image;
  and Capacity / Movement & Defense / Energy & Heat are shown as pill boxes to the right
  of the image (matching the cost/speed/shields style). Presets re-labeled "Loadout" and
  tidied. Frees the area below the card for the fleet tracker.

### v0.3.16 — 2026-06-11
- Reverted the v0.3.13 and v0.3.15 left-column layout experiments (stats-in-narrow-column
  and image-centerpiece) back to the v0.3.12 layout. Kept the ship picker and the computed
  preset loadouts.

### v0.3.15 — 2026-06-11
- Reverted the cramped left-column experiment. The top-down ship image is now a small,
  centered centerpiece; the redundant angled thumbnail was removed; quick stats sit as a
  tidy row beneath it; and Capacity / Movement & Defense / Energy & Heat return as
  readable columns below the card. Fixes the off-screen overflow.

### v0.3.14 — 2026-06-11
- Added computed preset loadouts beside Empty/Stock/variants: **Max DPS** (fills gun &
  turret mounts with the highest-DPS weapons that fit), **Max cargo**, and **Max crew**
  (greedy fills that respect all install limits). These are naive "max-metric" builds
  (no power/engine balancing) for quick comparison.

### v0.3.13 — 2026-06-11
- Moved Capacity, Movement & Defense, and Energy & Heat into the left info column
  (alongside cost/speed/etc.), narrowed the ship display, and freed the area below the
  card for the preset loadout buttons.

### v0.3.12 — 2026-06-11
- Ship picker reworked: race filters are now a **left-hand tab column**, the search box
  moved to the **bottom**, and the oversized "Close" bar became a small corner ✕.
- Picker now hides **"Model N" automata and ships with no artwork** (334 → 294 ships).
- Settings modal close also switched to the corner ✕.

### v0.3.11 — 2026-06-11
- Replaced the Race + Ship-model dropdowns with a **visual ship picker**: the header
  shows the current ship (art + name + race/class) and opens a gallery modal with a
  search box, race filter chips, and thumbnail cells grouped by class. Respects the
  unreleased toggle. Esc closes modals.
- Moved the spoiler/tech-access tier into Settings to declutter the header.

### v0.3.10 — 2026-06-11
- Alerts collapse to a single row; removed the redundant "Loadout" label line.
- Tightened stat spacing (meters, Energy & Heat, movement rows) so Energy & Heat no
  longer clips; Capacity fills its column so the last meter bottoms out with the stat
  stack and the loadout panel.

### v0.3.9 — 2026-06-11
- Fixed the page overflowing the viewport: the body is now a fixed-height flex column,
  so the layout fills exactly one screen (right catalog and loadout scroll internally).
- Variant/loadout chips squared off to match the alert buttons (no pills).
- Alert buttons now show live values (net energy /s, heat over/under dissipation,
  thruster/steering checks).
- Faction moved to the left above the category and ship name.
- Outfits can now also be dragged onto the Installed Loadout panel, not just the ship.

### v0.3.8 — 2026-06-11
- Status alerts moved under the faction label inside the ship card (frees the row at
  the top, lifts everything up).
- Ship display height now matches the info column (top of the art down to the Bays row).
- Capacity and Movement/Energy columns forced to equal height, and the stat block now
  bottom-aligns with the installed-loadout panel.

### v0.3.7 — 2026-06-11
- Installed loadout is now its own full-height panel occupying the right 1/3 of the
  left column (top of the ship card down to the bottom of Energy & Heat), separate
  from the ship display. The ship card + Capacity/Movement/Energy fill the left 2/3.
- Top-down sprite shrunk further (≤280px tall, well under the 400px cap) so the hull
  diagram is more compact.
- Hardpoint labels pulled in close to the hull edges (short lead lines) instead of
  pinned to the panel edges.

### v0.3.6 — 2026-06-11
- Top-down ship sprite shrunk and capped (max 600px / ~84% of the display) so it no
  longer fills the frame, leaving room for hardpoint labels.
- Ship display restyled toward the in-game outfitter look: a dark "screen" backdrop,
  ES-blue hardpoint lead lines with small node dots, and brighter labels.

### v0.3.5 — 2026-06-11
- The ship display now shows the **real top-down sprite** with gun/turret/engine/bay
  hardpoints drawn directly on the hull (weapon name or `[empty]` per mount), like the
  in-game outfitter. Coordinates map 1:1 to the bundled sprite. Ships whose sprite is
  animated/unavailable fall back to the schematic ellipse. Bundles 313 top-down ship
  sprites (~19 MB).

### v0.3.4 — 2026-06-11
- Installed loadout moved back to a column on the right of the ship card (beside the
  faction), full card height with its own scroll.
- Capacity and Movement/Energy stat blocks are now equal width; ship display enlarged.
- Variant loadout chips right-aligned to the bottom of the card.
- Restyled the Race / Ship-model / Spoiler controls (uniform 36px height, custom
  dropdown arrow); Reset and the new gear button are the same size (gear is square).
- Sticky outfitter search bar is now solid (no more see-through overlap on scroll);
  category filter buttons squared off (no pills).

### v0.3.3 — 2026-06-11
- **Left column now fits without scrolling** — it's a fixed flex column and only the
  installed-loadout list scrolls internally.
- Ship card compacted: a 130px info column (art + Cost / Max speed / Shields / Hull /
  Crew / Cargo / Fuel / Bays) beside the wireframe; both art and wireframe shown.
- **Status alerts (Thrusters / Steering / Energy / Heat) moved above the ship.**
- Stats regrouped: Capacity on the left; Movement & Defense with Energy & Heat stacked
  beneath it on the right.
- **Installed loadout** is now a full-width section at the bottom, separate from the
  wireframe.
- New defaults: spoiler/tech access starts at **Human**; loadout starts at **Stock**.
- **Settings gear** button (next to Reset) opens a modal holding Theme and the
  Show-unreleased toggle, decluttering the header.

### v0.3.2 — 2026-06-11
- **Unreleased/unobtainable filter.** The parser now flags any ship or outfit
  referenced only by its own definition (no shipyard, fleet, variant, mission, or
  default loadout) as unreleased — e.g. the Emperor Beetle and 4 other ships, plus
  ~79 unused outfits. A header **"Show unreleased"** toggle (default off, persisted)
  reveals them when you want.

### v0.3.1 — 2026-06-11
- **Ship card rebuilt**: 130×130 art window under the ship name; the hardpoint
  schematic is now the always-on display (Art/Hardpoints toggle removed); the
  installed loadout moved to a scrolling vertical column to the right of the
  display. The 3-column stats now stay put instead of being pushed to the bottom
  as you add outfits.
- **Theme toggle** in the header: Blue (default), Dark, and Light — remembered
  across reloads.
- **Outfitter capped at ~4 columns** so the left side gets more room; catalog
  image boxes standardized with uniform padding; outfits with no bundled art are
  hidden.
- **Square pills** (8px radius) and more color throughout.

## v0.2 — first build-out update

### v0.2.5 — 2026-06-11
- Reworked the version numbering: one update = a second-number group, individual
  changes = third-number bumps. Renumbered all prior entries to match.

### v0.2.4 — 2026-06-11
- **Split the source** into `pipeline/template.html` (HTML shell) + `app.css` +
  `app.js`; `build.py` stitches them and injects the data into the self-contained
  `index.html` (markers `/*__CSS__*/`, `/*__JS__*/`, `/*__DATA__*/{}`).
- **Outfit install limits enforced** — adds that would exceed gun ports, turret
  mounts, or outfit/weapon/engine capacity are blocked with a beep and an
  "Outfit Limit Reached" notice. Stock/variant presets are exempt.

### v0.2.3 — 2026-06-11
- Ship card defaults to the **labeled hardpoint wireframe** (weapon name or
  `[empty]` per mount); Art view available via toggle.
- **Quick-stat overlay** on the ship image and **status pills** (crew, cargo,
  fuel, bays, thruster/steering/energy/heat alerts).
- **Capacity / Movement & Defense / Energy & Heat** reflowed into three columns;
  installed loadout moved directly under the ship card.

### v0.2.2 — 2026-06-11
- **Real sprite art**: bundled 996 ship & outfit thumbnails from Endless Sky
  v0.11.0 under `images/` (CC-BY-SA-4.0, see `images/CREDITS.md`).
- **Display-name fix**: parser reads each ship's `display name`, so codenamed
  hulls show their real names (e.g. "Ikfar A'awoj").
- **Ship variants** parsed and attached to their base hull as selectable loadout
  presets.
- **UI redesign**: two-column layout (ship + stats + loadout left, outfitter
  art-grid right) and a race -> model ship picker.

### v0.2.1 — 2026-06-11
- Repo restructure: moved the project from the nested `Endless_Sky_Outfit/`
  subfolder to the repository root so GitHub Pages (deploy-from-branch `main`,
  `/ (root)`) serves the site correctly. Added `CLAUDE.md`.

### v0.2.0 — initial prototype (baseline)
- Client-side outfit builder: validated stat engine (heat/energy/thrust/
  capacity), hardpoint schematic from real coordinates, drag-and-drop outfitter
  with search + category filter, spoiler/tech tier gate, empty/stock presets,
  and per-outfit "where to buy".
