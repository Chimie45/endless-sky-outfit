#!/usr/bin/env python3
"""
Mission / quest extractor (v0.7.0 PoC).

Parses Endless Sky `mission` definitions from a game OR plugin data tree into compact records
for an Information Deck "Quest Guide": id, name, description, where it starts (source), where it
goes (destination), type (job/story/minor), prerequisites (mission-chain flags from `to offer`),
reward, and content flags.

Usage: python parse_missions.py <data-root> <out.json>
Prints counts + the byte size with and without descriptions (to decide inline vs on-demand delivery).
"""
import json, os, re, sys

TOKEN = re.compile(r'"([^"]*)"|`([^`]*)`|(\S+)')
FLAG = re.compile(r": (?:done|offered|active|failed|declined)\b")


def tok(l):
    return [next(g for g in m.groups() if g is not None) for m in TOKEN.finditer(l)]


def indent(l):
    n = 0
    for c in l:
        if c == "\t": n += 1
        else: break
    return n


class Node:
    __slots__ = ("t", "kids")
    def __init__(self, t): self.t = t; self.kids = []
    @property
    def k(self): return self.t[0] if self.t else ""


def parse_file(path):
    roots, stack = [], []
    for raw in open(path, encoding="utf-8", errors="replace"):
        line = raw.rstrip("\n").rstrip("\r"); s = line.strip()
        if not s or s.startswith("#"): continue
        ind = indent(line); node = Node(tok(s))
        while stack and stack[-1][0] >= ind: stack.pop()
        (stack[-1][1].kids if stack else roots).append(node)
        stack.append((ind, node))
    return roots


def loc(node):
    """Summarize a source/destination: inline name, else a filter description."""
    if len(node.t) > 1:
        return node.t[1]
    bits = []
    for c in node.kids:
        if c.k in ("government", "attributes", "system", "near", "planet", "not"):
            bits.append(c.k + (" " + c.t[1] if len(c.t) > 1 else ""))
    return "; ".join(bits) or "(conditional)"


def scan_flags(node, out):
    """Collect mission-chain prerequisite flags (e.g. 'X: done') from a subtree."""
    for t in node.t:
        if FLAG.search(t):
            out.add(t)
    for c in node.kids:
        scan_flags(c, out)


def find_payment(node):
    for c in node.kids:
        if c.k == "payment":
            try: return int(float(c.t[1]))
            except (IndexError, ValueError): return None
        v = find_payment(c)
        if v is not None: return v
    return None


def parse_root(root):
    data = os.path.join(root, "data")
    files = []
    for dp, dn, fn in os.walk(data):
        dn[:] = [d for d in dn if not d.startswith("_deprecated")]
        files += [os.path.join(dp, f) for f in fn if f.endswith(".txt")]
    missions = {}
    for path in sorted(files):
        rel = os.path.relpath(path, data).split(os.sep)
        faction = rel[0] if len(rel) > 1 else "human"
        for node in parse_file(path):
            if node.k != "mission" or len(node.t) < 2:
                continue
            mid = node.t[1]
            rec = {"id": mid, "name": mid, "desc": "", "faction": faction,
                   "src": None, "dest": None, "job": False, "minor": False,
                   "repeat": False, "invisible": False, "prereq": [], "reward": None,
                   "npc": False, "cargo": False, "passengers": False}
            prereq = set()
            for c in node.kids:
                k = c.k
                if k == "name": rec["name"] = c.t[1] if len(c.t) > 1 else mid
                elif k == "description": rec["desc"] = c.t[1] if len(c.t) > 1 else ""
                elif k == "source": rec["src"] = loc(c)
                elif k == "destination": rec["dest"] = loc(c)
                elif k == "job": rec["job"] = True
                elif k == "minor": rec["minor"] = True
                elif k == "repeat": rec["repeat"] = True
                elif k == "invisible": rec["invisible"] = True
                elif k == "npc": rec["npc"] = True
                elif k == "cargo": rec["cargo"] = True
                elif k == "passengers": rec["passengers"] = True
                elif k == "to" and len(c.t) > 1 and c.t[1] == "offer":
                    scan_flags(c, prereq)
                elif k == "on" and len(c.t) > 1 and c.t[1] == "complete":
                    rec["reward"] = find_payment(c)
            rec["prereq"] = sorted(prereq)
            missions[mid] = rec
    return missions


def main():
    root = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else "missions.json"
    m = parse_root(root)
    jobs = sum(1 for r in m.values() if r["job"])
    story = len(m) - jobs
    withdesc = sum(1 for r in m.values() if r["desc"])
    invis = sum(1 for r in m.values() if r["invisible"])
    chained = sum(1 for r in m.values() if r["prereq"])
    full = json.dumps({"missions": m}, separators=(",", ":"), ensure_ascii=False)
    nodesc = json.dumps({"missions": {k: {kk: vv for kk, vv in v.items() if kk != "desc"}
                                      for k, v in m.items()}}, separators=(",", ":"), ensure_ascii=False)
    print(f"missions {len(m)} | jobs {jobs} | story {story} | with desc {withdesc} | "
          f"invisible {invis} | chained {chained}")
    print(f"size: full {len(full.encode()):,} bytes | without descriptions {len(nodesc.encode()):,} bytes")
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    open(out_path, "w", encoding="utf-8").write(full)
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
