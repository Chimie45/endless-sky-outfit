# Drydock — Endless Sky Outfit Builder

A web-based ship outfitting tool for [Endless Sky](https://endless-sky.github.io/).
Pick a ship, drag in outfits, and watch heat / energy / thrust / capacity update live.
The stat engine uses the game's own formulas (verified against in-game numbers to the digit).

**It is a static site.** No server, no database. It runs entirely in the browser, so
GitHub Pages (or any static host) is all you need.

## Repo layout

```
index.html                      ← the live page (self-contained; this is what gets served)
data/endless-sky-data.json      ← parsed game data (the pipeline's output)
pipeline/
  parse_endless_sky.py          ← reads the Endless Sky data files → JSON
  template.html                 ← the app source (no data baked in)
  build.py                      ← injects data/*.json into template → index.html
.nojekyll                       ← tells GitHub Pages to serve files as-is
```

## Putting it online (GitHub Pages)

1. Create a new **public** repository on GitHub.
2. Upload everything in this folder so that `index.html` sits at the **repo root**
   (not inside a subfolder).
3. Repo **Settings → Pages**. Under **Build and deployment**, set **Source** to
   **Deploy from a branch**, pick branch `main` and folder `/ (root)`, then **Save**.
4. Wait ~1 minute. Your site is live at `https://<your-username>.github.io/<repo-name>/`.

## Testing locally

Because `index.html` has the data embedded, you can just double-click it. If you switch
to fetching the JSON instead, serve the folder over http so the browser allows the fetch:

```
python3 -m http.server   # then open http://localhost:8000
```

## Updating to a new Endless Sky release

1. Download the new **stable** release source from
   https://github.com/endless-sky/endless-sky/releases and unzip it.
2. From this repo's root:
   ```
   python3 pipeline/parse_endless_sky.py /path/to/endless-sky-<version> data/endless-sky-data.json
   python3 pipeline/build.py
   ```
3. Commit `data/endless-sky-data.json` and `index.html`. GitHub Pages redeploys on push.

## Data & image licensing

Game data and most sprites are from Endless Sky, which is GPLv3 (code) with art assets
mostly under **CC-BY-SA-4.0**. If you rehost the sprites, credit the authors and keep the
same license. Sprite thumbnails from Endless Sky v0.11.0 are bundled under `images/` and credited in `images/CREDITS.md`; they stay under CC-BY-SA-4.0. Hulls without a static thumbnail fall back to lettered tiles, and the ship card has a Hardpoints view for the schematic.

## Do I need a database?

Not for anything the app does today, and not for letting people **share** builds — that's
done by encoding the build in the URL (no backend). You'd only reach for a DB (e.g. Supabase)
if you later want accounts, a server-saved "my builds" library, or a public community gallery
with likes. Even then, the static site would just call that service from the browser; Pages
itself can't run server code.
