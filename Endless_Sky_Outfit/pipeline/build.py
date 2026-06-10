#!/usr/bin/env python3
"""Regenerate index.html by injecting the parsed data into the app template.

Usage (run from the repo root):
    python pipeline/build.py

Reads:  pipeline/template.html   (the app, with a /*__DATA__*/ placeholder)
        data/endless-sky-data.json
Writes: index.html               (self-contained, ready for GitHub Pages)
"""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tpl_path = os.path.join(ROOT, "pipeline", "template.html")
data_path = os.path.join(ROOT, "data", "endless-sky-data.json")
out_path = os.path.join(ROOT, "index.html")

tpl = open(tpl_path, encoding="utf-8").read()
data = open(data_path, encoding="utf-8").read()
if "/*__DATA__*/{}" not in tpl:
    sys.exit("template.html is missing the /*__DATA__*/{} placeholder")

open(out_path, "w", encoding="utf-8").write(tpl.replace("/*__DATA__*/{}", data))
print(f"built index.html ({os.path.getsize(out_path):,} bytes)")
