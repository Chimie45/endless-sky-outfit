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
import json, os, re, sys, subprocess, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PARSER = os.path.join(HERE, "parse_endless_sky.py")
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
                pack = {"id": pid, "ships": ships, "outfits": outfits, "systems": new_sys}
                json.dump(pack, open(os.path.join(pack_dir, pid + ".json"), "w", encoding="utf-8"),
                          separators=(",", ":"), ensure_ascii=False)
                entry["hasPack"] = True
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
