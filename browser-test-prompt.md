You are testing the responsive layout of a live web app. Work methodically and report findings — do not change anything.

## The app
**URL:** https://legendary-fairy-125266.netlify.app/
It's "Drydock", an Endless Sky ship/fleet outfitting tool. The screen has four main regions I want you to scrutinize at each size:

1. **Header** (top bar): logo "DRYDOCK", a "Ship" picker button, "Total cost", "Reset", and a gear/settings icon.
2. **Ship card** (upper-left): three columns side by side — (a) ship thumbnail + quick stats + Capacity, (b) a top‑down ship schematic image on a galaxy background with hardpoint labels, (c) Movement/Energy stats + a grid of preset buttons (Empty hull, Stock, Max cargo, Max crew, + Add to Fleet, Share). Above it: status pills (Thrust/Steering/Energy/Heat).
3. **Fleet Manifest panel** (lower-left, below the ship card): three columns — (a) "Fleet Stats" boxes + a fleet-name dropdown + New/Rename/Delete + ships/price line, (b) a grid of small ship icons (the fleet list), (c) "Manage" buttons + an "Issues" box of status checks.
4. **Outfitter** (right side): a search box, category chips, and a grid of outfit cards with + buttons.

## What to do
For each viewport size in the list below:
1. Resize the browser window to that exact width × height.
2. Take a full-page screenshot.
3. Inspect carefully and note any problems (see checklist).

**Sizes to test (do every one):**
- Desktop: 1920×1080, 1600×900, 1440×900, 1366×768, 1280×800
- Tablet: 1024×768, 834×1112, 820×1180, 768×1024
- Phone: 430×932, 390×844, 360×800

## What to look for (checklist, per size)
- **Horizontal overflow / clipping:** is anything cut off the right edge? Is there a horizontal scrollbar? Are any panels wider than the screen?
- **Fleet ship icons (region 3b):** are the little ship icons legible (roughly ≥40px), or are they crushed into a thin strip? How many fit per row?
- **Ship schematic image (region 2b):** is the top‑down ship image a reasonable size, or squished into a narrow sliver? Do the hardpoint text labels overlap the image or each other?
- **Stat / Issue boxes (regions 2c, 3a, 3c):** do any values wrap to a second line, overflow their box, or get clipped? Is text truncated with "…"?
- **Header (region 1):** do all items fit on one line, or do they overlap / wrap / get cut off? Is the "Ship" picker button squished?
- **Vertical:** does the page require scrolling? Does any panel collapse to near‑zero height (empty box)? Does content get cut off the bottom?
- **General readability:** font too small to read anywhere? Buttons too small to tap (on phone sizes, are tap targets at least ~32px)?

## Also test these interactions (at 1280 and at 390)
- Click the **gear/Settings** icon → does the Settings modal open and fit on screen?
- Click the **Ship** picker button (top) → does the "Choose a ship" modal open? Is the left faction tab rail + ship grid usable, or does the rail eat most of a phone screen?
- Click a **+** on an outfit card in the Outfitter → does it add/select correctly (or open a detail panel)?

## How to report back
Give me a concise structured report:

1. A **table**: one row per viewport size, columns = `Size | Horizontal overflow? | Fleet icons OK? | Ship image OK? | Box text OK? | Header OK? | Notes`. Use ✅/⚠️/❌.
2. A short **"worst problems"** list (3–6 bullets), each naming the region, the size(s) it happens at, and what exactly goes wrong.
3. The **interaction results** (Settings modal, Ship picker modal, outfit add) at 1280 and 390.
4. Attach (or describe) the screenshots for the sizes where something looks broken.

Be objective — report what you actually see, including sizes that look fine. Don't fix anything; just observe and report.
