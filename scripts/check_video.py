#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Verify rendered videos: size, fps, the 90 s limit and an audio stream. Exits 1 on any failure."""
import json
import subprocess
import sys
from pathlib import Path

EXPECTED = {"h": (1920, 1080), "v": (1080, 1920)}
MAX_SECONDS = 90


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(path)], capture_output=True, text=True)
    if out.returncode:
        raise RuntimeError(f"ffprobe failed on {path}: {out.stderr.strip()}")
    return json.loads(out.stdout)["streams"]


def check(path):
    problems = []
    streams = probe(path)
    v = next((s for s in streams if s["codec_type"] == "video"), None)
    a = next((s for s in streams if s["codec_type"] == "audio"), None)
    if not v:
        return ["no video stream"]
    size = (v["width"], v["height"])
    orient = "v" if size[1] > size[0] else "h"
    if size != EXPECTED[orient]:
        problems.append(f"size {size}, expected {EXPECTED[orient]}")
    if v.get("pix_fmt") != "yuv420p":
        problems.append(f"pix_fmt {v.get('pix_fmt')}, expected yuv420p (needed for QuickTime/IG)")
    dur = float(v["duration"])
    if dur > MAX_SECONDS:
        problems.append(f"duration {dur:.1f}s > {MAX_SECONDS}s")
    if not a:
        problems.append("no audio stream")
    print(f"{path.name}: {size[0]}x{size[1]} {v['r_frame_rate']} {dur:.1f}s audio={'yes' if a else 'no'}")
    return problems


def main():
    failed = False
    for p in map(Path, sys.argv[1:]):
        for msg in check(p):
            failed = True
            print(f"  FAIL {msg}")
    print("FAILED" if failed else "OK")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
