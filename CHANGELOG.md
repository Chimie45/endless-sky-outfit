# Changelog — Drydock (Endless Sky Outfit Builder)

Versioning: **v1.0.0** = first public release. The **second number** groups one
update (a batch of related work); the **third number** is an individual change
within that update. (Pre-1.0 we are still in the 0.x line.)

Drydock's app version is shown in the header; the Endless Sky game-data version
it was built against is shown next to it (currently ES data v0.11.0).

---

## v0.3 — UX overhaul update

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
