#!/usr/bin/env python3
"""
Plug-in pack builder (v0.7.0).

Wraps the proven parse_endless_sky.py (subprocess -> parser untouched) to turn plugins (or aggregate
"list" repos) into source-tagged packs the Plug-in Manager merges into the live database.

Usage:  python build_plugin_packs.py <out-dir> <src-root> [<src-root> ...]

Writes:
  <out-dir>/plugin-index.json         registry: every plugin with metadata, type, counts
  <out-dir>/plugins/<id>.json         merge pack (content plugins only): source-tagged ships/outfits/systems

Plugin type:
  content    adds buildable ships/outfits  -> gets a pack + an enable toggle
  generator  too large to bundle (ship.merging, boss.loot, ...)  -> listed, not bundled
  gameplay   no buildable content (AI/UI/mission tweaks)  -> listed as informational only
"""
import json, os, re, sys, subprocess, tempfile, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
PARSER = os.path.join(HERE, "parse_endless_sky.py")
IMAGES = os.path.join(HERE, "..", "images")   # repo's bundled image tree (base art + images/plugins/)


def base_has_image(path):
    """True if the base game already bundles this image path (so a plug-in can reuse it)."""
    p = os.path.join(IMAGES, path.replace("/", os.sep))
    return any(os.path.isfile(p + e) for e in (".png", ".jpg", ".jpeg"))


def find_plugin_image(plugin_dir, path):
    """Locate a plug-in image file: exact .png, then @2x, then the first animation frame."""
    base = os.path.join(plugin_dir, "images", path.replace("/", os.sep))
    for c in (base + ".png", base + "@2x.png"):
        if os.path.isfile(c):
            return c
    d, name = os.path.dirname(base), os.path.basename(base)
    if os.path.isdir(d):
        rx = re.compile(r"^" + re.escape(name) + r"(?:[-~+=@].*)?\.png$", re.I)
        frames = sorted(f for f in os.listdir(d) if rx.match(f))
        if frames:
            return os.path.join(d, frames[0])
    return None


def bundle_images(rec, keys, pid, plugin_dir):
    """Copy referenced plug-in art into images/plugins/<pid>/ and rewrite the record's path.
    Reuses base art when the plug-in references a base path; leaves missing art as-is (placeholder)."""
    n = 0
    for k in keys:
        p = rec.get(k)
        if not p or p in ("outfit/unknown", "ship/unknown"):
            continue
        if base_has_image(p):
            continue  # use the base game's image
        src = find_plugin_image(plugin_dir, p)
        if not src:
            continue  # no art shipped -> placeholder icon
        dst = os.path.join(IMAGES, "plugins", pid, p.replace("/", os.sep) + ".png")
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if not os.path.isfile(dst):
            shutil.copy2(src, dst)
        rec[k] = "plugins/" + pid + "/" + p
        n += 1
    return n
BASE_PATH = os.path.join(HERE, "..", "data", "endless-sky-data.json")
TOKEN = re.compile(r'"([^"]*)"|`([^`]*)`|(\S+)')
NON_BUILDABLE = {"Minerals", "Unique", "Licenses", "Special"}
SHIP_CAP, OUTFIT_CAP = 200, 200   # above this a plugin is a "generator" (not bundled wholesale)


def tok(line):
    return [next(g for g in m.groups() if g is not None) for m in TOKEN.finditer(line)]


def read_manifest(plugin_dir, fallback_id):
    meta = {"name": fallback_id, "about": "", "authors": []}
    p = os.path.join(plugin_dir, "plugin.txt")
    if not os.path.isfile(p):
        return meta
    lines = open(p, encoding="utf-8", errors="replace").read().split("\n")
    i = 0
    while i < len(lines):
        t = tok(lines[i].strip())
        if t[:1] == ["name"] and len(t) > 1: meta["name"] = t[1]
        elif t[:1] == ["about"] and len(t) > 1: meta["about"] = t[1]
        elif t[:1] == ["authors"]:
            j = i + 1
            while j < len(lines) and lines[j].startswith(("\t", " ")) and lines[j].strip():
                meta["authors"].append(lines[j].strip()); j += 1
        i += 1
    return meta


def parse_plugin(plugin_dir, pid):
    tmp = tempfile.NamedTemporaryFile(suffix=".json", delete=False); tmp.close()
    subprocess.run([sys.executable, PARSER, plugin_dir, tmp.name], check=True, capture_output=True, text=True)
    data = json.load(open(tmp.name, encoding="utf-8")); os.unlink(tmp.name)
    for d in (data["ships"], data["outfits"], data["systems"]):
        for rec in d.values():
            rec["source"] = pid
    return data


def find_plugins(root):
    if os.path.isdir(os.path.join(root, "data")):
        yield os.path.basename(root.rstrip("/\\")), root
        return
    for parent, dirs, _ in os.walk(root):
        for d in sorted(dirs):
            if os.path.isdir(os.path.join(parent, d, "data")):
                yield d, os.path.join(parent, d)
        dirs[:] = [d for d in dirs if not os.path.isdir(os.path.join(parent, d, "data"))]


def main():
    out_dir = sys.argv[1]
    srcs = sys.argv[2:]
    base = json.load(open(BASE_PATH, encoding="utf-8")) if os.path.isfile(BASE_PATH) else {"ships": {}, "outfits": {}}
    base_names = set(base["ships"]) | set(base["outfits"])
    pack_dir = os.path.join(out_dir, "plugins")
    os.makedirs(pack_dir, exist_ok=True)

    index = []
    print(f"{'plugin':32} {'type':9} {'ships':>5} {'build':>5} {'conf':>4}")
    print("-" * 64)
    for src in srcs:
        for pid, pdir in find_plugins(src):
            meta = read_manifest(pdir, pid)
            data = parse_plugin(pdir, pid)
            ships, outfits, systems = data["ships"], data["outfits"], data["systems"]
            new_sys = {k: v for k, v in systems.items() if v["pos"] != [0.0, 0.0] or v["links"]}
            buildable = [o for o in outfits.values()
                         if o.get("category") not in NON_BUILDABLE and o.get("thumbnail")]
            conflicts = sum(1 for n in (set(ships) | set(outfits)) if n in base_names)
            counts = {"ships": len(ships), "outfits": len(outfits), "buildable": len(buildable),
                      "systems": len(new_sys), "conflicts": conflicts}
            if len(ships) > SHIP_CAP or len(outfits) > OUTFIT_CAP:
                ptype = "generator"
            elif ships or buildable:
                ptype = "content"
            else:
                ptype = "gameplay"
            entry = {"id": pid, "name": meta["name"], "about": meta["about"],
                     "authors": meta["authors"], "type": ptype, "counts": counts, "hasPack": False}
            if ptype == "content":
                nimg = 0
                for s in ships.values(): nimg += bundle_images(s, ["thumbnail", "sprite"], pid, pdir)
                for o in outfits.values(): nimg += bundle_images(o, ["thumbnail"], pid, pdir)
                pack = {"id": pid, "ships": ships, "outfits": outfits, "systems": new_sys}
                json.dump(pack, open(os.path.join(pack_dir, pid + ".json"), "w", encoding="utf-8"),
                          separators=(",", ":"), ensure_ascii=False)
                entry["hasPack"] = True
                entry["images"] = nimg
            index.append(entry)
            print(f"{pid[:32]:32} {ptype:9} {len(ships):5} {len(buildable):5} {conflicts:4}")

    index.sort(key=lambda e: (e["type"] != "content", e["name"].lower()))
    json.dump({"plugins": index}, open(os.path.join(out_dir, "plugin-index.json"), "w", encoding="utf-8"),
              separators=(",", ":"), ensure_ascii=False)
    byt = {t: sum(1 for e in index if e["type"] == t) for t in ("content", "gameplay", "generator")}
    print("-" * 64)
    print(f"{len(index)} plugins -> content {byt['content']}, gameplay {byt['gameplay']}, generator {byt['generator']}")
    print(f"wrote {out_dir}/plugin-index.json + {byt['content']} packs in {pack_dir}/")


if __name__ == "__main__":
    main()
