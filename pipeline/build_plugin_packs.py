#!/usr/bin/env python3
"""
Plug-in pack builder (v0.7.0 proof-of-concept).

Wraps the proven parse_endless_sky.py (run as a subprocess, so the validated base-game
parser is untouched) to turn an Endless Sky plugin -- or an aggregate "list" repo holding
many plugins -- into tagged JSON packs the Plug-in Manager can merge into the live database.

Usage:
    python build_plugin_packs.py <src-root> <out.json>

<src-root> may be either:
  * a single plugin  (has a data/ folder), or
  * an aggregate list (sub-folders each containing their own data/, e.g. zuckung/myplugins/*).

Output: a JSON file { "packs": [ {id,name,about,authors,counts,ships,outfits,systems}, ... ] }
plus a human-readable report on stdout.
"""
import json, os, re, sys, subprocess, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PARSER = os.path.join(HERE, "parse_endless_sky.py")
BASE_PATH = os.path.join(HERE, "..", "data", "endless-sky-data.json")
TOKEN = re.compile(r'"([^"]*)"|`([^`]*)`|(\S+)')
# outfit categories that aren't buildable/installable parts (match the app's outfitEligible)
NON_BUILDABLE = {"Minerals", "Unique", "Licenses", "Special"}


def tok(line):
    return [next(g for g in m.groups() if g is not None) for m in TOKEN.finditer(line)]


def read_manifest(plugin_dir, fallback_id):
    """Pull name/about/authors from plugin.txt if present."""
    meta = {"name": fallback_id, "about": "", "authors": []}
    p = os.path.join(plugin_dir, "plugin.txt")
    if not os.path.isfile(p):
        return meta
    lines = open(p, encoding="utf-8", errors="replace").read().split("\n")
    i = 0
    while i < len(lines):
        t = tok(lines[i].strip())
        if t[:1] == ["name"] and len(t) > 1:
            meta["name"] = t[1]
        elif t[:1] == ["about"] and len(t) > 1:
            meta["about"] = t[1]
        elif t[:1] == ["authors"]:
            j = i + 1
            while j < len(lines) and lines[j].startswith(("\t", " ")) and lines[j].strip():
                meta["authors"].append(lines[j].strip())
                j += 1
        i += 1
    return meta


def parse_plugin(plugin_dir, pid):
    """Run the base parser on one plugin dir, return its (ships, outfits, systems)."""
    tmp = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
    tmp.close()
    subprocess.run([sys.executable, PARSER, plugin_dir, tmp.name],
                   check=True, capture_output=True, text=True)
    data = json.load(open(tmp.name, encoding="utf-8"))
    os.unlink(tmp.name)
    for d in (data["ships"], data["outfits"], data["systems"]):
        for rec in d.values():
            rec["source"] = pid
    return data


def find_plugins(root):
    """Yield (id, dir). A single plugin if root/data exists; else each sub-dir with data/."""
    if os.path.isdir(os.path.join(root, "data")):
        yield os.path.basename(root.rstrip("/\\")), root
        return
    for parent, dirs, _ in os.walk(root):
        for d in sorted(dirs):
            sub = os.path.join(parent, d)
            if os.path.isdir(os.path.join(sub, "data")):
                yield d, sub
        # only descend one useful level past 'myplugins'-style containers
        dirs[:] = [d for d in dirs if not os.path.isdir(os.path.join(parent, d, "data"))]


def main():
    src = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else "plugin-packs.json"
    base = json.load(open(BASE_PATH, encoding="utf-8")) if os.path.isfile(BASE_PATH) else {"ships": {}, "outfits": {}}
    base_names = set(base["ships"]) | set(base["outfits"])

    packs = []
    print(f"{'plugin':34} {'ships':>5} {'outfit':>6} {'build':>5} {'sys+':>4} {'sysM':>4} {'conf':>4}  notes")
    print("-" * 92)
    for pid, pdir in find_plugins(src):
        meta = read_manifest(pdir, pid)
        data = parse_plugin(pdir, pid)
        ships, outfits, systems = data["ships"], data["outfits"], data["systems"]
        new_sys = {k: v for k, v in systems.items() if v["pos"] != [0.0, 0.0] or v["links"]}
        mod_sys = len(systems) - len(new_sys)
        buildable = [o for o in outfits.values()
                     if o.get("category") not in NON_BUILDABLE and o.get("thumbnail")]
        conflicts = [n for n in (set(ships) | set(outfits)) if n in base_names]
        # cross-ref: how do plugin ships' loadouts resolve?
        ref_base = ref_plug = ref_missing = 0
        for s in ships.values():
            for nm in s.get("defaultOutfits", {}):
                if nm in outfits: ref_plug += 1
                elif nm in base["outfits"]: ref_base += 1
                else: ref_missing += 1
        notes = []
        if conflicts: notes.append(f"{len(conflicts)} name-clash w/ base")
        if ref_missing: notes.append(f"{ref_missing} unresolved loadout refs")
        if not ships and not buildable: notes.append("no buildable content")
        packs.append({
            "id": pid, "name": meta["name"], "about": meta["about"], "authors": meta["authors"],
            "counts": {"ships": len(ships), "outfits": len(outfits), "buildable": len(buildable),
                       "newSystems": len(new_sys), "modSystems": mod_sys, "conflicts": len(conflicts)},
            "crossref": {"toBase": ref_base, "toPlugin": ref_plug, "unresolved": ref_missing},
            "ships": ships, "outfits": outfits, "systems": new_sys,
        })
        print(f"{pid[:34]:34} {len(ships):5} {len(outfits):6} {len(buildable):5} "
              f"{len(new_sys):4} {mod_sys:4} {len(conflicts):4}  {'; '.join(notes)}")

    content = [p for p in packs if p["counts"]["ships"] or p["counts"]["buildable"]]
    print("-" * 92)
    print(f"{len(packs)} plugin(s) parsed | {len(content)} add buildable ships/outfits | "
          f"total ships {sum(p['counts']['ships'] for p in packs)}, "
          f"buildable outfits {sum(p['counts']['buildable'] for p in packs)}")
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    json.dump({"packs": packs}, open(out_path, "w", encoding="utf-8"),
              separators=(",", ":"), ensure_ascii=False)
    print(f"wrote {out_path} ({os.path.getsize(out_path):,} bytes)")


if __name__ == "__main__":
    main()
