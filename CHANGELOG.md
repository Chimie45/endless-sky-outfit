# Changelog — Drydock (Endless Sky Outfit Builder)

Versioning: **v1.0.0** = first public release. **vX.1.0** = a major update.
**vX.X.1** = a minor release/update worth noting for future review.
(Pre-1.0 we are still in the 0.x line.)

Drydock's app version is shown in the header; the Endless Sky game-data version
it was built against is shown next to it (currently ES data v0.11.0).

## v0.2.0 — 2026-06-11 (major update)
- **Real sprite art.** Bundled 996 ship & outfit thumbnails from Endless Sky
  v0.11.0 under `images/`. Outfit cards, the installed-loadout list, the ship
  card, and the detail drawer now show the actual in-game art, with a graceful
  lettered-tile fallback for the handful of animated sprites that have no static
  thumbnail. (Art is CC-BY-SA-4.0 — see `images/CREDITS.md`.)
- **Missing ships fixed (display names).** The parser now reads each ship's
  `display name`, so 29 codenamed hulls show their real names. Notably
  "Ikfar A'awoj" (internally `Ra'at Ik 621`) is now findable.
- **Ship variants as loadout presets.** 520 variant definitions are parsed and
  attached to their base hull. Pick a base model, then click a variant chip
  (e.g. "Korsmanath A'awoj (Strike)") to load that loadout. Empty / Stock chips
  included.
- **UI redesign.** Two-column layout: left = ship art + schematic toggle +
  variant chips + live stats + installed loadout; right = the outfitter as a
  3–4 wide art grid, like the in-game shop. Search + category filter retained.
- **Race → model ship picker.** Choose the race (faction) first, then the model,
  grouped by category — replaces the single giant ship dropdown.
- Stat engine unchanged (still validated to the digit against the game).

## v0.1.1 — 2026-06-11 (minor)
- Repo restructure: moved the project from the nested `Endless_Sky_Outfit/`
  subfolder to the repository root so GitHub Pages (deploy-from-branch `main`,
  `/ (root)`) serves the site correctly. Added `CLAUDE.md`.

## v0.1.0 — initial prototype
- Client-side outfit builder: validated stat engine (heat/energy/thrust/
  capacity), hardpoint schematic from real coordinates, drag-and-drop outfitter
  with search + category filter, spoiler/tech tier gate, empty/stock presets,
  and per-outfit "where to buy".
