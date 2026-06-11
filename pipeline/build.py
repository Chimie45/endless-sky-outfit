#!/usr/bin/env python3
"""Regenerate index.html from the split sources + parsed data.

Reads:  pipeline/template.html   (HTML shell with /*__CSS__*/ and /*__JS__*/ markers)
        pipeline/app.css         (styles)
        pipeline/app.js          (logic; contains the /*__DATA__*/{} data placeholder)
        data/endless-sky-data.json
Writes: index.html               (self-contained inline CSS+JS+data, ready for GitHub Pages)

Usage (from repo root):  python pipeline/build.py
"""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def read(*p): return open(os.path.join(ROOT, *p), encoding="utf-8").read()

tpl  = read("pipeline", "template.html")
css  = read("pipeline", "app.css")
js   = read("pipeline", "app.js")
data = read("data", "endless-sky-data.json")

if "/*__CSS__*/" not in tpl: sys.exit("template.html is missing the /*__CSS__*/ marker")
if "/*__JS__*/"  not in tpl: sys.exit("template.html is missing the /*__JS__*/ marker")
if "/*__DATA__*/{}" not in js: sys.exit("app.js is missing the /*__DATA__*/{} placeholder")

js  = js.replace("/*__DATA__*/{}", data)          # inject data into the JS first
out = tpl.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)

out_path = os.path.join(ROOT, "index.html")
open(out_path, "w", encoding="utf-8").write(out)
print(f"built index.html ({os.path.getsize(out_path):,} bytes)")
