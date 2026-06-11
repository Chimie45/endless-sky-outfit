import json, os, re, sys, glob, collections
ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
DATA = os.path.join(ROOT, "data")
VERSION = os.path.basename(os.path.abspath(ROOT)).replace("endless-sky-", "")
TOKEN = re.compile(r'"([^"]*)"|`([^`]*)`|(\S+)')
def tokenize(line):
    toks = []
    for m in TOKEN.finditer(line):
        toks.append(m.group(1) if m.group(1) is not None else m.group(2) if m.group(2) is not None else m.group(3))
    return toks
class Node:
    __slots__ = ("tokens", "children")
    def __init__(self, tokens):
        self.tokens = tokens; self.children = []
    @property
    def key(self): return self.tokens[0] if self.tokens else ""
def indent_of(line):
    n = 0
    for ch in line:
        if ch == "\t": n += 1
        else: break
    return n
def parse_file(path):
    roots, stack = [], []
    with open(path, encoding="utf-8", errors="replace") as fh:
        for raw in fh:
            line = raw.rstrip("\n").rstrip("\r"); stripped = line.strip()
            if not stripped or stripped.startswith("#"): continue
            ind = indent_of(line); node = Node(tokenize(stripped))
            while stack and stack[-1][0] >= ind: stack.pop()
            if stack: stack[-1][1].children.append(node)
            else: roots.append(node)
            stack.append((ind, node))
    return roots
files = []
for dirpath, dirnames, filenames in os.walk(DATA):
    dirnames[:] = [d for d in dirnames if not d.startswith("_deprecated")]
    for f in filenames:
        if f.endswith(".txt"): files.append(os.path.join(dirpath, f))
files.sort()
ships, outfits = {}, {}
outfitter_groups, shipyard_groups, planets, planet_to_system = {}, {}, {}, {}
def num(tokens, i, default=0.0):
    try: return float(tokens[i])
    except (IndexError, ValueError): return default
CURRENT_FACTION = "human"
def _read_outfits(container):
    out = {}
    for o in container.children:
        if not o.tokens: continue
        nm = o.tokens[0]; out[nm] = out.get(nm, 0) + int(num(o.tokens, 1, 1))
    return out
def build_ship_record(node, faction):
    name = node.tokens[1] if len(node.tokens) > 1 else None
    if not name: return None
    attrs, outfit_list, sprite, thumb = {}, {}, None, None
    display = None; guns = turrets = engines = rev_engines = 0; bays = {}; desc = []; points = []
    def coord(c, i):
        try: return float(c.tokens[i])
        except (IndexError, ValueError): return 0.0
    for c in node.children:
        k = c.key
        if k == "sprite": sprite = c.tokens[1] if len(c.tokens) > 1 else None
        elif k == "thumbnail": thumb = c.tokens[1] if len(c.tokens) > 1 else None
        elif k == "display name": display = c.tokens[1] if len(c.tokens) > 1 else None
        elif k == "attributes":
            for a in c.children:
                if len(a.tokens) >= 2:
                    try: attrs[a.tokens[0]] = float(a.tokens[1])
                    except ValueError: attrs[a.tokens[0]] = a.tokens[1]
        elif k == "outfits": outfit_list.update(_read_outfits(c))
        elif k == "gun": guns += 1; points.append({"t":"gun","x":coord(c,1),"y":coord(c,2)})
        elif k == "turret": turrets += 1; points.append({"t":"turret","x":coord(c,1),"y":coord(c,2)})
        elif k == "engine": engines += 1; points.append({"t":"engine","x":coord(c,1),"y":coord(c,2)})
        elif k == "reverse engine": rev_engines += 1; points.append({"t":"reverse","x":coord(c,1),"y":coord(c,2)})
        elif k == "bay":
            bt = c.tokens[1] if len(c.tokens) > 1 else "Fighter"
            bays[bt] = bays.get(bt, 0) + 1; points.append({"t":"bay","x":coord(c,2),"y":coord(c,3)})
        elif k == "description":
            if len(c.tokens) > 1: desc.append(c.tokens[1])
    if not attrs: return None
    return {"name":name,"displayName":display or name,"faction":faction,
            "category":attrs.get("category","Unclassified"),"sprite":sprite,"thumbnail":thumb,
            "attributes":attrs,
            "hardpoints":{"guns":guns,"turrets":turrets,"engines":engines,"reverseEngines":rev_engines,"bays":bays},
            "points":points,"defaultOutfits":outfit_list,"description":" ".join(desc).strip(),"variants":{}}
def apply_variant(node):
    if len(node.tokens) < 3: return
    base_name, var_name = node.tokens[1], node.tokens[2]
    base = ships.get(base_name)
    if not base: return
    display = None; replace = None; additions = {}
    for c in node.children:
        k = c.key
        if k == "display name": display = c.tokens[1] if len(c.tokens) > 1 else None
        elif k == "outfits": replace = _read_outfits(c)
        elif k == "add" and len(c.tokens) > 1 and c.tokens[1] == "outfits":
            for o in c.children:
                if not o.tokens: continue
                additions[o.tokens[0]] = additions.get(o.tokens[0], 0) + int(num(o.tokens, 1, 1))
    loadout = dict(replace) if replace is not None else dict(base["defaultOutfits"])
    for nm, cnt in additions.items(): loadout[nm] = loadout.get(nm, 0) + cnt
    if not loadout: return
    base["variants"][display or var_name] = loadout
def parse_outfit(node):
    name = node.tokens[1] if len(node.tokens) > 1 else None
    if not name: return
    attrs, weapon = {}, None; cat = series = thumb = None; cost = mass = 0.0; desc = []
    for c in node.children:
        k = c.key
        if k == "category": cat = c.tokens[1] if len(c.tokens) > 1 else None
        elif k == "series": series = c.tokens[1] if len(c.tokens) > 1 else None
        elif k == "thumbnail": thumb = c.tokens[1] if len(c.tokens) > 1 else None
        elif k == "cost": cost = num(c.tokens, 1)
        elif k == "mass": mass = num(c.tokens, 1)
        elif k == "weapon":
            weapon = {}
            for w in c.children:
                if len(w.tokens) >= 2:
                    try: weapon[w.tokens[0]] = float(w.tokens[1])
                    except ValueError: pass
        elif k == "description":
            if len(c.tokens) > 1: desc.append(c.tokens[1])
        elif len(c.tokens) >= 2:
            try: attrs[c.tokens[0]] = float(c.tokens[1])
            except ValueError: pass
    if mass: attrs.setdefault("mass", mass)
    outfits[name] = {"name":name,"faction":CURRENT_FACTION,"category":cat or "Special","series":series,
                     "thumbnail":thumb,"cost":cost,"mass":attrs.get("mass",0.0),"attributes":attrs,
                     "weapon":weapon,"description":" ".join(desc).strip()}
def parse_planet(node):
    name = node.tokens[1] if len(node.tokens) > 1 else None
    if not name: return
    p = planets.setdefault(name, {"outfitters": [], "shipyards": []})
    for c in node.children:
        if c.key == "outfitter" and len(c.tokens) > 1: p["outfitters"].append(c.tokens[1])
        elif c.key == "shipyard" and len(c.tokens) > 1: p["shipyards"].append(c.tokens[1])
def parse_outfitter(node):
    name = node.tokens[1] if len(node.tokens) > 1 else None
    if not name: return
    grp = outfitter_groups.setdefault(name, set())
    for c in node.children: grp.add(c.tokens[0])
def parse_shipyard(node):
    name = node.tokens[1] if len(node.tokens) > 1 else None
    if not name: return
    grp = shipyard_groups.setdefault(name, set())
    for c in node.children: grp.add(c.tokens[0])
def parse_system(node):
    name = node.tokens[1] if len(node.tokens) > 1 else None
    if not name: return
    for c in node.children:
        if c.key == "object":
            def walk(o):
                if len(o.tokens) > 1 and o.tokens[0] == "object": planet_to_system[o.tokens[1]] = name
                for cc in o.children: walk(cc)
            walk(c)
base_ship_nodes, variant_ship_nodes = [], []
for path in files:
    rel = os.path.relpath(path, DATA); parts = rel.split(os.sep)
    CURRENT_FACTION = parts[0] if len(parts) > 1 else "human"
    for node in parse_file(path):
        k = node.key
        if k == "ship":
            if len(node.tokens) > 2: variant_ship_nodes.append(node)
            else: base_ship_nodes.append((CURRENT_FACTION, node))
        elif k == "outfit": parse_outfit(node)
        elif k == "planet": parse_planet(node)
        elif k == "outfitter": parse_outfitter(node)
        elif k == "shipyard": parse_shipyard(node)
        elif k == "system": parse_system(node)
for faction, node in base_ship_nodes:
    rec = build_ship_record(node, faction)
    if rec: ships[rec["name"]] = rec
for node in variant_ship_nodes: apply_variant(node)
buy_outfit, buy_ship = {}, {}
for pname, p in planets.items():
    system = planet_to_system.get(pname); loc = {"planet": pname, "system": system}
    sold = set()
    for g in p["outfitters"]: sold |= outfitter_groups.get(g, set())
    for o in sold: buy_outfit.setdefault(o, []).append(loc)
    soldships = set()
    for g in p["shipyards"]: soldships |= shipyard_groups.get(g, set())
    for s in soldships: buy_ship.setdefault(s, []).append(loc)
for nm, o in outfits.items():
    locs = buy_outfit.get(nm, [])
    o["soldAt"] = [{"planet": a, "system": b} for a, b in sorted({(l["planet"], l["system"]) for l in locs})]
for nm, s in ships.items():
    locs = buy_ship.get(nm, [])
    s["soldAt"] = [{"planet": a, "system": b} for a, b in sorted({(l["planet"], l["system"]) for l in locs})]
# ---- obtainable / unreleased flag ------------------------------------------
# Count exact quoted-name occurrences across all data files. A ship/outfit whose
# name appears only once (its own definition) and nowhere else - no shipyard,
# fleet, variant, mission or default loadout - is unreleased / unused content
# (e.g. the "Emperor Beetle"). Anything referenced elsewhere is obtainable.
_ref = collections.Counter()
_q = re.compile(r'"([^"]*)"')
for _p in files:
    with open(_p, encoding="utf-8", errors="replace") as _fh:
        for _line in _fh:
            if _line.lstrip().startswith("#"): continue
            for _m in _q.finditer(_line): _ref[_m.group(1)] += 1
for _nm, _s in ships.items():   _s["obtainable"] = _ref[_nm] > 1
for _nm, _o in outfits.items(): _o["obtainable"] = _ref[_nm] > 1

OUTFIT_ORDER = ["Guns","Turrets","Secondary Weapons","Ammunition","Systems","Power","Engines","Hand to Hand","Unique","Minerals","Special","Licenses"]
out = {"version":VERSION,"generated":"endless-sky stable data pipeline (phase 0)","categoryOrder":OUTFIT_ORDER,"ships":ships,"outfits":outfits}
dst = sys.argv[2] if len(sys.argv) > 2 else "endless-sky-data.json"
os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
with open(dst, "w", encoding="utf-8") as fh: json.dump(out, fh, separators=(",", ":"), ensure_ascii=False)
nvar = sum(len(s["variants"]) for s in ships.values())
ndisp = sum(1 for s in ships.values() if s["displayName"] != s["name"])
nso = sum(1 for s in ships.values() if not s["obtainable"])
noo = sum(1 for o in outfits.values() if not o["obtainable"])
print(f"version {VERSION} | ships {len(ships)} (display-named {ndisp}, unreleased {nso}) | variants {nvar} | outfits {len(outfits)} (unreleased {noo}) | bytes {os.path.getsize(dst):,}")
