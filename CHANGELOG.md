# Changelog — Drydock (Endless Sky Outfit Builder)

Versioning: **v1.0.0** = first public release. The **second number** groups one
update (a batch of related work); the **third number** is an individual change
within that update. (Pre-1.0 we are still in the 0.x line.)

Drydock's app version is shown in the header; the Endless Sky game-data version
it was built against is shown next to it (currently ES data v0.11.0).

---

## v0.5 — Scale-to-fit layout

### v0.5.37 — 2026-06-13
- Removed the tonnage shown next to the Capacity heading.
- Energy & Heat heading now shows E and H aligned above their value columns.
- Max Cargo / Max Crew auto-fill now uses only real, buyable outfits (no Unique/quest items like
  Blood of Surtr) and picks a basic engine from the Engines category, so the presets are usable
  by new players.

### v0.5.36 — 2026-06-13
- Outfitters and Shipyards are no longer modal popups - they open as full-window views inside the
  Information Deck (like the Ship/Fleet editors), with a back button to the deck.

### v0.5.35 — 2026-06-13
- More vertical spacing between hardpoint labels so two-line labels no longer overlap / crowd.

### v0.5.34 — 2026-06-13
- Max Cargo / Max Crew presets now build a functional ship: they add a reactor and cooling (so the
  hull has power and stays cool) before maximising cargo/crew, instead of leaving it power-starved.

### v0.5.33 — 2026-06-13
- Hardpoint labels reworked: anchored to the overlay edges (text grows inward so it never runs off-
  screen), balanced across both sides (fixes radial ships like the Archon piling all labels on one
  side), and identical weapons sharing a hardpoint are grouped (e.g. Drak Turret x6).

### v0.5.32 — 2026-06-13
- Fixed outfit/weapon/engine capacity bars: the total was inflated by the consumed amount (e.g. a
  265t weapon hull showed /515). Total now reflects hull capacity (plus any capacity-adding outfits),
  and used = consumed. Over-capacity builds still correctly show used > total.

### v0.5.31 — 2026-06-13
- Hardpoint schematic labels now fit inside the overlay: smaller sprite for wider label gutters,
  tighter label wrapping, and smaller label font so names like "Quad Blaster Turret" no longer clip.

### v0.5.30 — 2026-06-13
- Removed Licenses and the Local Map from Add Parts (not installable on a ship).
- Sub-category labels in the parts rail are now vertically centered.

### v0.5.29 — 2026-06-13
- Build actions are now a 3-button row: Add to Fleet, Share Build (copies the link), and a new
  Import Build (paste a build link/code to load it).
- Header Share button now copies a ready-to-post message: "Check out my Endless Sky <Ship> build
  on Drydock: <url>".
- Title-cased preset buttons (Empty Hull, Max Cargo, Max Crew).

### v0.5.28 — 2026-06-13
- Outfit DPS tag rounded to whole numbers, and always shown (0 DPS for non-weapons).

### v0.5.27 — 2026-06-13
- Ship-card title: faction/name/type now grouped with even spacing (was spread out by space-between).
- Ship name fit is more reliable: skips measuring before layout, re-fits on a short delay, and shrinks
  to 9px so long names (e.g. Shield Beetle) display in full instead of truncating.

### v0.5.26 — 2026-06-13
- Variant chip labels now auto-shrink to fit (down to 8px, ellipsis only as a last resort), so long
  names like "Unfettered Shipyards" and "Tripulse Ionic Turret" no longer overflow.

### v0.5.25 — 2026-06-13
- Fleet Ship Details: swapped Capacity (now top-right, opposite Overview) and Movement & Defense
  (now bottom-left), so all four stat sections line up across the two columns.

### v0.5.24 — 2026-06-13
- Hidden the placeholder "?" outfits (Microbot Grinder, Nano Strike, Suicide Gun, and any other
  outfit with no real art).
- Licenses are no longer hidden by the obtainable filter — all in-tier licenses now show.
- Fixed outfit-card name being clipped at the bottom (flex shrink + overflow:hidden interaction).
- Fleet Editor: clicking a ship now shows the full ship-info panel (Overview, Capacity, Movement &
  Defense, Energy & Heat, Ship Alerts, Loadout). Added a Rename button to label fleet ships.

### v0.5.23 — 2026-06-13
- Outfit price is now its own tag (e.g. Price 16K, Price 2.5M); faction/price/DPS/Outfit tags are
  laid out in a tidy 2-column grid that lines up across the card.
- Tags given more vertical breathing room; dock cards made taller and the row gap tightened so the
  grid uses the previously-wasted space at the bottom.
- Fixed grid fit math to count only between-row gaps, reclaiming the trailing slack (no scrollbars).

### v0.5.22 — 2026-06-13
- Outfit card tags now use proper capitalization: faction (e.g. Human), DPS, and a renamed
  "Outfit" tag (was lowercase "space") for outfit-space cost.
- Install-limit alerts are now properly capitalized and clearer, e.g. "No free Gun Ports" and
  "Not enough Outfit Space".

### v0.5.21 — 2026-06-13
- Ship-card name now re-fits via a ResizeObserver, so names no longer get stuck truncated at a
  larger size when the title column changes width.
- Full-screen Fleet Editor: swapped the Fleet Roster (now left) and Ship Details (now right), and
  split the workspace 50/50.

### v0.5.20 — 2026-06-13
- Outfit cards: moved the faction tag up beside the price so the dps/space stat chips sit on their
  own single row - the third chip is no longer clipped at the bottom of the card.

### v0.5.19 — 2026-06-13
- Capacity panel always shows a Bays row (Bays 0 when the hull has no fighter/drone bays).

### v0.5.18 — 2026-06-13
- Ship-card name auto-shrink now goes down to 10px in 0.5px steps and re-fits after layout,
  so long names (e.g. Lampyrid-Class Transport) show in full instead of truncating.
- Saved Fleets list height now matches the Delete/Clear Fleet/Set Flagship button stack (still fits 4 fleets).

### v0.5.17 — 2026-06-13
- Saved Fleets list softened to light grey and sized to show 4 fleets at once.
- Flagship now has its own heading (aligned with Fleet Stats) and its box matches the stat-box height.
- Tightened spacing: smaller gaps under the section headings and between Fleet Stats and Fleet Issues;
  removed the divider under Fleet Stats and added one under Fleet Roster.

### v0.5.16 — 2026-06-13
- Saved Fleets is now a single white, bordered list (3px border, 10px radius) sitting beside the
  management buttons and matching their height; the "Saved Fleets" heading shares the row with "Fleet Manifest".
- Restored the Flagship panel; it sits next to Fleet Stats again (stats no longer span full width).
- Fixed the docked Fleet tab spacing so Fleet Issues sits higher and the roster gets the leftover height.

### v0.5.15 — 2026-06-13
- Fixed ship-name descenders (g, y, Q) being clipped in the ship-card header.
- Fleet Editor is now a full-size two-column workspace like the Ship Editor: fleet stats,
  issues and a clicked-ship detail panel on the left; the ship roster (flagship first) on the right.
- Clicking a ship in the roster shows its full stats and loadout in the left-hand Ship Details panel.

### v0.5.14 — 2026-06-13
- Flagship now sorts to the first position in the fleet icon list.
- Fleet management buttons made skinnier, with a clickable Saved Fleets list beside them
  (replaces the dropdown selector).

### v0.5.13 — 2026-06-12
- Fleet layout optimised: all fleet buttons merged into one grid under the title (dropped the
  'Manage Fleet' heading); Flagship and Fleet Stats now sit side-by-side below the buttons;
  Fleet Icons takes the bulk of the height (~50%).

### v0.5.12 — 2026-06-12
- Fleet panel reordered to: Fleet Manifest, Manage Fleet, Fleet Stats, Fleet Issues, Fleet Icons.
- Added a Flagship square that shows the current flagship's icon and name.

### v0.5.11 — 2026-06-12
- Ship title block now stretches to the icon's height (faction/name/type spread to fill).
- Overview gained Bunks and Mass (now 6 rows, matching Capacity).
- Widened the schematic overlay and raised the hardpoint-label wrap limit so long labels
  (e.g. 'Heavy Anti-Missile Turret') no longer truncate.

### v0.5.10 — 2026-06-12
- Ship title now stacks as faction / name / type on three lines (type moved under the name;
  fixes the truncated ship type).

### v0.5.9 — 2026-06-12
- Added a 'Fleet' tab to the dock (Add Parts / New Ship / Fleet). The fleet manifest shows in the
  dock with a compact stacked layout for quick edits while building; the full-screen Fleet Editor
  tab is unchanged. The single fleet panel is moved between the two locations as needed.

### v0.5.8 — 2026-06-12
- New Ship picker is now 3x4 (shorter ship cards) so it fills the space.
- Race rail shows all races on one page (removed the unnecessary pagination); compact rows.

### v0.5.7 — 2026-06-12
- Ship name now auto-shrinks to fit one line (stays 30px for normal names, scales down to a
  floor for long ones) instead of wrapping or truncating.

### v0.5.6 — 2026-06-12
- Catalog/picker grids top-align when not full (no more big gaps spreading a few cards).
- Standardized control heights to 34px (dock tabs, search, preset buttons, variant chips, rail rows).
- Ship card restructured: title block (icon + name + race/class) now sits in the left column with
  Overview/Capacity below it; the schematic sits at the top of the right column with a labelled
  'Ship Alerts' section (Thrust/Steering/Energy/Heat) beneath it.

### v0.5.5 — 2026-06-12
- Header: icon back to 80x80 with race/class stacked above the ship name (name 30px), beside the icon.
- Weapon categories (Guns, Turrets, Secondary Weapons, Ammunition) now expand too: sub-sections are
  derived from weapon names (Laser, Blaster, Plasma, Beam, Ion, Missile, Torpedo, ...; alien/unnamed
  types fall under 'Other', sorted last). Families are built from the tier-eligible outfits.

### v0.5.4 — 2026-06-12
- Ship-card header: icon enlarged to 124x124 with race/class above it, and the ship name set
  large (24px) across the top to the right of the icon — using the left column's spare space.

### v0.5.3 — 2026-06-12
- Parts catalog is now a 3x4 grid of shorter cards (fills the column with more items).
- Dock restructured: the search bar now sits over the grid only and the dead race selector is
  gone, so the accordion rail runs the full height with roomier rows.
- Moved the spoiler / tech-access control out of Settings into the header.

### v0.5.2 — 2026-06-12
- Ship-card header redesigned: bigger ship icon + the ship NAME (which was getting squeezed
  out) with race/type as a subtitle. Overview/Capacity shift down accordingly.
- Moved the Thrust/Steering/Energy/Heat warning pills onto the top of the schematic overlay
  (which has empty space even for the largest ships).

### v0.5.1 — 2026-06-12
- Parts rail is now an accordion: top-level categories (Guns, Turrets, Systems, Power, Engines,
  ...) expand to their sub-sections (Systems -> Shields/Cooling/Scanners/...; Power ->
  Generators/Batteries/Solar; etc.). Fills the rail and organizes browsing.
- Catalog grid now distributes rows to fill the column height (no empty space at the bottom).
- Dropped Minerals and Unique from the parts picker (commodities / mission items, not build parts).

### v0.5.0 — 2026-06-12
- Monitor layout is now designed once at a fixed 1600x900 canvas and uniformly scaled
  (CSS zoom) to fill any screen >=1101px wide, letterboxed on non-16:9 (ultrawide/16:10).
  Nothing reflows or stretches across monitor sizes; the layout is identical everywhere,
  just larger/smaller. Below 1101px the existing stacked layout still applies (tablet/mobile
  designs to come).

## v0.4 — Tabbed workspace

### v0.4.6 — 2026-06-12
- Fixed the ≤1024px layout: the Ship Editor now stacks into a single scrolling column
  (ship card, then loadout, then the picker) instead of a clipped 2-column grid with the
  dock overflowing. No more cut-off stats/variants or horizontal scrollbar at that size.

### v0.4.5 — 2026-06-12
- Ship card now fills its column top-to-bottom (the schematic grows into the space instead
  of leaving a black void below the card).
- Capped the Ship Editor's 3-column workspace at 2000px and centered it, so wide/ultrawide
  monitors get balanced side margins instead of over-stretched columns.

### v0.4.4 — 2026-06-12
- Moved Outfit space back into the Capacity stat group.
- Variants grid is now 3 across (2 rows of 3 fixed slots).
- Made the installed-loadout rows more compact.

### v0.4.3 — 2026-06-12
- Ship card reverted toward the old form: Overview + Capacity to the left of the overlay,
  a skinnier overlay, and Movement & Defense / Energy & Heat directly below it.
- Variants now show a fixed 6-slot grid (empty slots stay so the area doesn't resize).
- Installed loadout scrolls again. Docked picker grids fill the column width (no dead side
  buffer) and the rail is wider so labels aren't truncated.
- Restored drag-and-drop: drag a part (or ship) and drop anywhere outside the dock to install.

### v0.4.2 — 2026-06-12
- Ship Editor is now fully scroll-free: the catalog, ship picker, both rails, and the installed
  loadout fit the available space and paginate (prev/next) instead of scrolling.
- Moved Outfit-space into the Overview stat group so the two stat columns balance.
- Made the loadout/variants column skinnier and widened the docked picker column.
- Renamed the dock's "Add Ship" tab to "New Ship".

### v0.4.1 — 2026-06-12
- Removed the Buy Me A Coffee widget for now (to be re-added later).
- Ship Editor reworked into three columns to use the space: ship card (overlay on top, now
  smaller, with stats laid out below it) | installed loadout + variants | a docked Add Parts /
  Add Ship picker (toggle) that replaces the old pop-up modals. Ship thumbnail now sits in the
  card header.

### v0.4.0 — 2026-06-12
- Split the app into three top-level tabs: Ship Editor, Fleet Editor, Information Deck.
- Ship Editor holds the ship card / schematic / stats / loadout, with Add Ship and Add Parts
  as buttons inside it. Fleet Editor is the fleet manifest on its own full-width tab (no longer
  crammed under the ship). Information Deck currently hosts the Outfitters & Shipyards station
  browsers; the wider wiki / galaxy map / quest tracker are deferred (galaxy map needs
  system+hyperlane data, quests need mission data — neither is parsed yet).
- Removed Add Ship/Add Parts/Outfitters/Shipyards from the header; they live in their tabs now.

## v0.3 — UX overhaul update

### v0.3.93 — 2026-06-12
- Settings: tier/theme segmented boxes now hug their buttons (no empty container space);
  trimmed the menu width.
- Fleet panel: removed the scrollbars on Manage/Issues. Widened that column and laid Issues
  in 4 columns and Manage in 3 so they fit as short rows without scrolling.

### v0.3.92 — 2026-06-12
- Fixed the fleet panel's Manage/Issues and Fleet-Stats columns running off the bottom of
  the page on shorter windows (they now scroll within the panel instead of being clipped).

### v0.3.91 — 2026-06-12
- Widened the Settings dropdown so the tech-access buttons stop wrapping; shrank the
  Buy Me A Coffee button in the menu.

### v0.3.90 — 2026-06-12
- New banner-style logo asset is now shown whole (natural aspect) instead of being
  cropped by object-fit:cover.

### v0.3.89 — 2026-06-12
- Removed the logo stroke outline and outer glow (kept the larger size).

### v0.3.88 — 2026-06-12
- Removed the version text under the logo and moved it into the Settings menu (footer line).
- Enlarged the logo and gave it a thin dark stroke outline plus a subtle accent outer glow.

### v0.3.87 — 2026-06-12
- Moved the Buy Me A Coffee button out of the header toolbar into the Settings dropdown
  (under a "Support Drydock" row). Header toolbar is now just Share + Settings.

### v0.3.86 — 2026-06-12
- Swapped the custom Donate link for the official Buy Me A Coffee button widget in the header.

### v0.3.85 — 2026-06-12
- Pointed the Donate button at the Buy Me a Coffee page (buymeacoffee.com/drydock). Kept the
  toolbar's own button styling rather than embedding BMC's external widget/branded button.

### v0.3.84 — 2026-06-12
- Removed the GitHub link from the header toolbar.
- On phones the Share/Donate/Settings icons now sit on the same row as the logo instead of
  wrapping onto their own row; the nav drops to the row below.

### v0.3.83 — 2026-06-12
- Header gained an action toolbar: Share (copies a link to the current build), Donate, and
  a GitHub source link. Settings is now an anchored dropdown off the gear (theme / tech
  access / show-unreleased) instead of a full-screen modal.
- Removed the duplicate Share button from the ship card; "+ Add to Fleet" spans the preset
  row. On phones the toolbar collapses to icons.
- NOTE: the Donate link is a placeholder (https://ko-fi.com/) — swap in your real page.

### v0.3.82 — 2026-06-12
- Redesigned the header: the DRYDOCK logo image replaces the text wordmark/version line,
  and the four panels became an underline-indicator nav (no boxed tabs). Removed Total cost
  (already on the ship card + manifest) and Reset (same as the ship card's "Empty hull").

### v0.3.81 — 2026-06-12
- Redesigned the header: the DRYDOCK logo image replaces the old text wordmark/version
  line (the version now shows as a small tag beneath the logo). The four nav tabs are now
  one clean segmented control, and Total cost / Reset / Settings are grouped into a single
  tidy cluster on the right instead of floating loose.

### v0.3.80 — 2026-06-12
- Phone polish: in the pop-ups the rail now sits full-width on top with the card grid
  below (instead of a wide rail squeezing the grid to one column and truncating station
  names). Header tab labels stay on one line instead of wrapping.

### v0.3.79 — 2026-06-12
- Fixed the rail rows: flexbox was shrinking them to fit (instead of scrolling), so they
  looked scrunched and the text rode high. Each row is now a fixed height with its label
  vertically centred; the rail scrolls / paginates instead of squishing.

### v0.3.78 — 2026-06-12
- Made the Outfitters/Shipyards station rail readable: bigger, brighter text, taller rows,
  a wider rail, and a full-name tooltip on hover (long names truncate with an ellipsis).
- Added prev/next pagination to the station rail (25 per page) so it's not one giant
  scroll of hundreds of tiny entries.

### v0.3.77 — 2026-06-12
- Standardized the four pop-up windows: all open at the same (larger) size, with a
  consistent left rail and equal-sized item cards (Outfitters/Shipyards are no longer
  extra-wide). Used the extra room to widen the rail so labels sit on one line.
- Outfitters & Shipyards: station labels now show the planet name first (bold) with the
  system dimmed, and the station list is sorted alphabetically.

### v0.3.76 — 2026-06-12
- Reverted the slide-out side drawers back to centered pop-up windows (like the original
  ship picker). Add Ship / Add Parts / Outfitters / Shipyards now open as modals over a
  dimmed backdrop instead of docking on top of the installed-loadout column.
- Removed drag-to-install (a pop-up can't drop onto the page behind it). Use each card's
  "+" button, or the detail "Install" button, to add outfits.

### v0.3.75 — 2026-06-12
- Escaped fleet/ship/label text in the fleet list, hover card and fleet menu so a crafted
  shared-fleet link can't inject HTML.
- Renamed the fleet "Cost" mini-stat to "Upkeep" (it shows daily crew salary, not buy price).

### v0.3.74 — 2026-06-12
- Widened the side panels (660px; Outfitters & Shipyards 900px) so their rail + grid aren't
  cramped into tiny rows. Phones still go full-width.
- Disabled drag-and-drop in the Outfitters and Shipyards panels — those are browse-only.
  Drag-to-install now works only in Add Parts (Add Ship/Shipyards add via click).

### v0.3.73 — 2026-06-12
- Restyled the header tabs from pills into real attached tabs (top-rounded, accent when active).

### v0.3.72 — 2026-06-12
- Put the four tabs (Add Ship / Add Parts / Outfitters / Shipyards) into the existing header
  next to the logo, and removed the extra bar that v0.3.71 wrongly added.

### v0.3.71 — 2026-06-12
- Moved the panel tabs to a centered bar at the top of the page, and added the two new tabs:
  Outfitters and Shipyards. Outfitters lists every station that sells parts (search to find one)
  and shows what's on sale there — drag straight onto your ship. Shipyards does the same for
  ships (click one to load it into the builder). Both respect the spoiler/tech tier.

### v0.3.70 — 2026-06-12
- Slimmer Add Parts / Add Ship rail tabs (shorter, tighter spacing). Removed the header
  "Add Parts" button (the edge tab handles it). The side panel now overlays the right edge
  instead of pushing the page narrower, so the ship card (and the schematic's hardpoint labels)
  no longer shrink when a panel is open — you can still drag parts onto the ship.

### v0.3.69 — 2026-06-12
- Flagship highlight is now an inset ring so the flagged ship tile stays the same size as the
  others (was an outer ring that made it look bigger).
- With the freed width, widened the ship-card stat columns — the left info column +50px (130→180)
  and Movement/Energy +44px (196→240) — and shrank the top-down schematic to suit. Increased
  label letter-spacing, added a little more row spacing, and stopped truncating stat labels.

### v0.3.68 — 2026-06-12
- Add Parts: replaced the broad category rail with finer sections from the game's "series" data
  (Guns, Turrets, Secondary Weapons, Ammunition, Anti-Missile, Generators, Batteries, Solar,
  Shields, Coolers, Repair, Ramscoops, Fuel, Scanners, Jammers, Drives, Engines, Afterburners…).
  Added a "race" dropdown in the panel head to filter parts by faction (respects the tech tier).
- Fixed the sort-rail buttons resizing/wrapping when selected (they were going bold → reflow);
  active state is now colour-only, constant width.
- Skinnier, inset scrollbars (≈4px thumb with a 2px gap from content) site-wide.

### v0.3.67 — 2026-06-12
- Fixed v0.3.66 breakage: closing a panel set data-panel="" which the `[data-panel]` selector
  still matched, so the edge tabs stayed hidden and the page stayed shifted — leaving no way to
  reopen a panel. Closing now removes the attribute, so the Add Ship / Add Parts tabs reappear
  and the layout resets to full width. Also removed the redundant header Ship control (ship
  selection now lives entirely in the Add Ship tab).

### v0.3.66 — 2026-06-12
- Unified Add Ship and Add Parts into the same side-drawer pattern: search at the top, a left
  vertical sort rail, and the grid. "Add Ship" (renamed from "Ship") now opens as a right drawer
  like Add Parts instead of a centred modal; the ship picker's factions and the outfitter's
  categories both became left rails. Only one drawer is open at a time, and opening either shifts
  the page left so you can still drag parts onto the ship.
- (Also repaired app.css, whose tail — the phone media block and the toast styles — had been
  truncated by an earlier edit.)

### v0.3.65 — 2026-06-12
- Right-edge tab rail: added a "Ship" tab (opens the ship picker) above the parts tab. Renamed
  the blue "Outfitter" tab/button to "Add Parts" so it clearly means "add items to your build" —
  freeing the names "Outfitter(s)" and "Shipyards" for future shop/station browsing tabs.

### v0.3.64 — 2026-06-12
- The Outfitter is now a collapsible right-docked panel instead of a permanent column. Toggle it
  with the header "Outfitter" button or the vertical "Outfitter" tab on the right edge (state is
  remembered). When open it slides in and the page shifts left so you can still drag outfits onto
  the ship; when closed the ship/fleet area gets the full window width. On phones it opens
  full-screen. The main grid is now single-column so the left content uses all available space,
  and the side-by-side ship/loadout split now holds down to ~1024px before stacking.

### v0.3.63 — 2026-06-12
- Outfitter cards are now a fixed, uniform size — no more stretch-to-fill. Every card is 110px
  wide and 182px tall, with a uniform 90×90 image box (image centered, contained). The grid uses
  fixed 110px columns (centered) instead of flexible 1fr, so all cards/images are identical at
  every width.

### v0.3.62 — 2026-06-12
- Outfitter cards are more compact: the art area went from a square to a 3:2 box and the image
  is a touch smaller (72%), so each card takes less vertical room and more fit on screen.

### v0.3.61 — 2026-06-12
- Responsive pass (per RESPONSIVE-AUDIT.md). Added breakpoints so the layout reflows instead of
  crushing: ≤1400 stacks the ship area over the installed loadout (the left column scrolls) so
  the fleet ship list and ship schematic keep full width on laptops; ≤900 reflows the ship card
  (art+schematic on top, stats/presets full-width below) and stacks the fleet panel's three
  columns with fluid (auto-fill) ship tiles; ≤640 collapses everything to a single column, wraps
  the header, and turns the ship-picker's tab rail into a horizontal scroller. Desktop >1400 is
  unchanged. (Built by hand-syncing index.html as the build VM was unavailable; re-run
  pipeline/build.py when possible — output is identical.)

### v0.3.60 — 2026-06-12
- Replaced the Crew/Fuel warning ideas (which can't actually occur — bunks always cover crew,
  hulls include fuel) with Weapons (a hull that has weapon hardpoints but no weapons installed)
  and Shields (a ship with no shields). Issues grid is 8: Jump, Power, Thrust, Steer, Bays, Heat,
  Weapons, Shields.
- Added hover text to every Issues cell, improved the ship-tile warning tooltip wording, and
  added hover text to the ship-card alert pills (Thrust / Steering / Energy / Heat).

### v0.3.59 — 2026-06-12
- Two more fleet warnings: Crew (a ship's required crew exceeds its bunks) and Fuel (a ship has
  a drive but not enough fuel for even one jump). Issues grid is now 8 (4x2).
- Big stat numbers are compacted (e.g. 21.2K) so they no longer wrap. Fixed the too-tall fleet
  dropdown, and added divider lines above "Fleet Stats" and "Issues" to clean up the spacing.

### v0.3.58 — 2026-06-12
- Narrowed the Outfitter column by ~20px and trimmed the columns' horizontal padding (18->12,
  which was stacking with each panel's own padding — the "double padding"), then gave the
  reclaimed width to the fleet stats/right box columns so the boxes breathe a bit more.

### v0.3.57 — 2026-06-12
- Narrowed the fleet stats (196px) and right (168px) columns so the ship list — the main thing —
  gets noticeably more room. Added a bold "FLEET MANIFEST" panel title plus a "FLEET STATS"
  subheading above the stat boxes. Daily cost now shows compactly (e.g. 7.3K/day) and the
  Fighters stat is labelled "Craft" so the boxes fit the narrower column.

### v0.3.56 — 2026-06-12
- Fleet panel now fills the space under the ship card so its bottom lines up with the Installed
  Loadout box and the height stays consistent; the ship list scrolls if a fleet is too big to fit.
- Left column reordered: name + New/Rename/Delete, then a "Fleet Manifest" heading, the stat
  boxes, and the ships/price line moved to the bottom. Stats trimmed to Cargo, Crew, Bunks,
  Jumps, Cost, Fighters — dropped Shields/Hull, renamed Daily to Cost, and Fuel is now "Jumps":
  the number of jumps the lowest-fuel ship can make (fuel capacity / its drive's jump cost).
- Added section titles: "Manage" above the action buttons (matching "Issues").

### v0.3.55 — 2026-06-12
- Moved the fleet name + New/Rename/Delete into the left "Fleet Stats" column. Fleet stats now
  use the same boxed 2-column grid as the Issues panel. Dropped Firepower/DPS and added the
  stats that matter for a fleet: Bunks (crew/passenger capacity), Fuel, Shields and Hull. Stats
  shown: Cargo, Crew, Bunks, Fuel, Shields, Hull, Daily, Fighters.

### v0.3.54 — 2026-06-12
- Reorganised the fleet right column: action buttons relabeled/reordered (Import Fleet | Share
  Fleet / Clear Fleet | Delete Ship / Copy Ship | Set Flagship), with a new "Issues" box of six
  checks underneath in two columns: Jump | Power / Thrust | Steer / Bays | Heat. Each shows a
  green check when the whole fleet is clear, or a red/yellow count of ships with that problem.
  "Moving" was split into separate Thrust and Steer checks. With the warnings moved here, the
  left Fleet Stats is back to a single column (Cargo, Crew, Daily, Firepower, Fighters), freeing
  width for the ship icons in the center.

### v0.3.53 — 2026-06-12
- Fixed the fleet stats not splitting into two columns (the element also had the .statpills
  flex class, which disables CSS multi-column; bumped selector specificity to force a 2-column
  block). Stats now correctly read numbers-left / warnings-right and the panel is short again.
  Narrowed the stats and button columns and made the ship icons scale to their grid cell so the
  center list is no longer cramped.

### v0.3.52 — 2026-06-12
- Fleet panel cleanup + readability. Fleet stats now flow in two columns (numbers on the left,
  health warnings on the right) so the panel is about half as tall and no longer pushes its
  bottom rows off-screen. Bumped font sizes across the ship-card stats and the fleet panel
  (labels, values, ship names, controls). Shortened stat labels (Cargo, Crew, Daily, Fighters,
  Drones) to fit the two-column layout, and arranged the fleet action buttons in a 2-wide grid.

### v0.3.51 — 2026-06-11
- Removed all scrollbars from the fleet panel. Audit found three sources (the stats column, the
  ship list, and the right/buttons column each had overflow-y:auto); the panel now sizes to its
  content so every column shows in full with no internal scrolling.

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
