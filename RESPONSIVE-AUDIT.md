# Drydock — Responsive / Resolution Audit & Remediation Plan

**Date:** 2026-06-12 · **Against:** v0.3.60 source (`pipeline/`)

> Method note: this is a **static analysis** of the layout CSS (the live Chrome
> session wasn't reachable, so widths below are computed, not screenshotted).
> Once a browser preview connects we should screenshot‑verify at the sizes in the
> testing checklist before calling anything done.

---

## 1. How the layout is built (the core problem)

The page is one CSS grid with **deeply nested, fixed‑pixel sub‑grids**:

```
main                → minmax(0,1fr)  |  clamp(415px,38vw,680px)   (left | Outfitter)
  .col.left
    .leftbody       → 2fr | 1fr                                   (maincol | loadpanel)
      .maincol
        .shipcard
          .cardbody → 130px | minmax(0,1fr) | 196px               (art | schematic | stats)
        .fleetpanel
          .fleet-body → 210px | flex | 180px                      (stats | ship list | manage)
```

Only **one** breakpoint exists today — `@media(max-width:1080px)` — and it only
restacks the **outer** `main` grid (and `.statcols`). **None of the inner
fixed‑width grids reflow.** So `.cardbody` (130+196 fixed), `.fleet-body`
(210+180 fixed), `.leftbody` (2fr/1fr), `.rightstats` (196), and `.infocol`
(130) keep their desktop widths at every screen size below 1080 — which is what
breaks tablet and phone.

---

## 2. Findings by width (computed)

Key derived widths in the 2‑column desktop mode (>1080px):
`displaycol = maincol − 354` (cardbody fixed cols+gaps),
`fleet list = maincol − 418` (fleet fixed cols+gaps).

| Viewport | Outfitter | maincol | Ship image | Fleet list | Verdict |
|---|---|---|---|---|---|
| 1920 | 680 | ~803 | ~449 | ~385 (8 tiles ≈48px) | ✅ good |
| 1600 | 608 | ~637 | ~283 | ~219 (≈24px) | ⚠ list tight |
| 1440 | 547 | ~571 | ~217 | ~153 (≈16px) | ❌ list crushed |
| 1366 | 519 | ~552 | ~198 | ~134 | ❌ list crushed, image small |
| 1280 | 486 | ~505 | ~151 | ~87 | ❌ broken |
| 1100 | 418 | ~430 | ~76 | ~12 → overflow | ❌ broken (worst zone) |
| **1080 breakpoint → main stacks; leftbody still 2fr/1fr** |||||
| 1024 | — | ~659 | ~305 | ~241 (≈26px) | ⚠ usable but tight |
| 820 (tablet portrait) | — | ~523 | ~169 | ~105 | ❌ list crushed |
| 768 | — | ~488 | ~134 | ~70 | ❌ broken |
| 414 (phone) | — | ~252 | n/a | n/a | ❌ **horizontal overflow** — cardbody (354px) and fleet‑body (418px) are wider than their 252px column; content is clipped |

**Takeaways**
- The desktop two‑column layout is only comfortable **above ~1500px**. On the
  most common laptop widths (1280/1366/1440) the **fleet ship list and the ship
  schematic image are badly pinched** by the fixed side columns.
- The single 1080 breakpoint doesn't help tablets because the **inner grids
  never reflow** — they stay at desktop pixel widths.
- On phones the ship card and fleet panel are **wider than the screen** → clipped /
  horizontal scroll. Effectively unusable.

---

## 3. Root causes (ranked)

1. **Fixed‑pixel inner grids that never reflow** (`.cardbody`, `.fleet-body`,
   `.rightstats`, `.infocol`, `.leftbody`). _Biggest issue; causes both the
   laptop pinch and the phone overflow._
2. **Side‑by‑side `.leftbody` (2fr/1fr) held too long.** Splitting the left
   region into ship‑area + loadout side by side starves the maincol on anything
   under ~1500px.
3. **No tablet/phone tiers.** Need at least three more breakpoints.
4. **No‑scroll, fixed‑viewport‑height assumption.** `flex:1; min-height:0`
   panels (`#loadout`, `.fleetpanel`, `.fleet-list`) assume a bounded column
   height; in a stacked/auto‑height column they can collapse to ~0 height.
5. **Touch gaps:** drag‑and‑drop install and all hover tooltips / the fleet
   hover‑card don't work on touch (tap fallbacks exist but info is lost).
6. **Header & modals** not tuned for narrow widths (header items can overflow;
   ship‑picker's 158px tab rail is heavy on a phone).

---

## 4. Step‑by‑step remediation plan

Ordered by impact. Each step is independently shippable.

### Step 1 — Stack the left split below ~1400px (biggest single win)
- Add `@media(max-width:1400px){ .leftbody{grid-template-columns:1fr} }` so the
  **loadout panel drops below** the ship‑area instead of stealing 1/3 width.
- Give the left column scroll in this mode: `.col.left{overflow-y:auto}` (the
  no‑scroll guarantee only holds on wide desktop; below 1400 a single page scroll
  is acceptable).
- Result: maincol gets the full left width on every laptop → fleet list and ship
  image are comfortable again at 1280–1400.

### Step 2 — Make `.cardbody` fluid, then reflow
- ≤1400: shrink fixed cols to `clamp(110px,12vw,130px) minmax(0,1fr) clamp(160px,18vw,196px)`, gap 10–12, so the schematic keeps width.
- ≤900: `grid-template-columns:130px 1fr;` and let `.rightstats` (Movement/Energy/presets) wrap to its own full‑width row (`grid-column:1/-1`).
- ≤640: `grid-template-columns:1fr;` everything stacks — art+quick‑stats, then schematic (cap `.stagewrap{min-height:220px}`), then stats, then presets.

### Step 3 — Make `.fleet-body` reflow
- ≤900: `.fleet-body{flex-direction:column}` so **Fleet Stats**, the **ship
  list**, and **Manage/Issues** stack vertically, each full width (the list then
  shows many tiles per row). Set the three children to `width:auto`.
- Change the ship list to fluid tiles so it never crushes:
  `.fleet-list{grid-template-columns:repeat(auto-fill,minmax(46px,1fr))}`
  (replaces the hard `repeat(8,…)`), capped to a max via `max-width` if desired.
- When stacked, drop the panel's `flex:1`/internal `overflow` so it sizes to
  content (Step 6).

### Step 4 — Phone tier (≤640px)
- `header{flex-wrap:wrap;row-gap:8px}`; reduce `.shippick{min-width:0;flex:1}`
  and let `.brand` shrink; move `.costchip`/Reset/gear to wrap to a 2nd line.
- All panels full‑width single column (covered by Steps 1–3).
- Ship‑picker modal: make `.pickerbody{flex-direction:column}` and turn
  `.pickertabs` into a horizontal, scrollable chip row (`width:auto;
  flex-direction:row;overflow-x:auto`) so the 158px rail doesn't eat half a phone.
- Outfitter grid already fluid (`minmax(150px,1fr)`) — drop min to ~130 on phone.

### Step 5 — Fix flex‑collapse in stacked/auto‑height mode
- Wherever a panel uses `flex:1; min-height:0; overflow:auto` (`#loadout`,
  `.fleetpanel`, `.fleet-list`, `.fleet-totals`), add a media rule for
  ≤1400/≤900 that sets `flex:none; overflow:visible; min-height:auto` so they
  render at natural height inside the now‑scrolling page instead of collapsing.

### Step 6 — Touch & pointer fallbacks
- Tap‑to‑add already works (outfit card → drawer → **+ Install**, and loadout
  ± buttons), so the app is usable without drag. Verify the outfit cards open the
  detail drawer on tap on touch devices.
- Hover‑only info is lost on touch: the **fleet hover‑card** and `title`
  tooltips won't appear. Plan: on touch, tapping a fleet ship already
  selects+loads it (info then shows in the main card) — acceptable. Optionally
  add a small "ⓘ" affordance or long‑press to surface the per‑ship card.
- Add `@media(hover:none)` to hide drag‑only affordances ("Drop to install"
  hint) and ensure nothing depends on hover to be usable.

### Step 7 — Polish
- Cap `.stagewrap{min-height}` responsively (300 desktop → 220 tablet → 180
  phone) so the galaxy/schematic box doesn't dominate on small screens.
- Re‑test the sticky `.searchrow` offset (`top:-18px`) still matches `.col`
  vertical padding after any padding changes.
- Consider hiding the hardpoint text labels on very narrow schematics (they
  overlap when the image is small).

---

## 5. Proposed breakpoint ladder (summary)

| Tier | Width | What changes |
|---|---|---|
| Wide desktop | ≥1400 | current layout (no change) |
| Laptop | 1080–1400 | Step 1 (stack leftbody) + Step 2a (fluid cardbody) + Step 5 |
| Tablet | 640–1080 | + Step 2b & Step 3 (cardbody/fleet stack) |
| Phone | ≤640 | + Step 4 (header wrap, fluid tiles, picker reflow) + Step 6 |

---

## 6. Testing checklist (verify in‑browser once Chrome connects)

Resolutions to screenshot and eyeball, portrait + landscape where relevant:
- Desktop: **1920×1080, 1600×900, 1440×900, 1366×768, 1280×800**
- Tablet: **1024×768 (iPad landscape), 834×1112 (iPad Air), 820×1180, 768×1024 (portrait)**
- Phone: **430×932 (iPhone 15 Pro Max), 393×852, 390×844, 360×800 (Android)**

For each, confirm: no horizontal scroll/clipping; fleet ship icons legible
(≥40px); ship schematic image legible; stat/issue boxes don't wrap or overflow;
header fits; modals (Settings, Choose‑a‑ship) usable; tap‑to‑add works.

---

## 7. Recommended order to ship
1. **Step 1** (stack leftbody <1400) — fixes the most‑common laptop complaint immediately.
2. **Steps 2–3 + 5** — make cardbody & fleet reflow → tablets usable.
3. **Step 4 + 6** — phone tier + touch.
4. Screenshot‑verify the whole checklist, then **Step 7 polish**.
