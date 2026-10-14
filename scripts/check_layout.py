#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow"]
# ///
"""Flag off-center frames: below the title band, compares the content's left and right margins, sampled once per second.

Usage: check_layout.py <video.mp4 | still.png>...
A skew that lasts MIN_RUN seconds or more is a WARN and exits 1; a shorter one is a NOTE.
A still counts as a full run.
"""

import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

BG = np.array([0x0F, 0x17, 0x2A])  # theme bg
BG_TOLERANCE = 8  # per-channel distance that still counts as background
MIN_PIXELS = 3  # a column needs this many content pixels to count
MAX_SKEW = 0.03  # |left - right| margin, as a share of the frame width
MIN_RUN = 3  # seconds; shorter skews are entrances or transitions
TITLE_BAND = 0.12  # scene titles are left-aligned on purpose; skip this top share of the frame


def margins(img: Path) -> tuple[int, int, int] | None:
    a = np.asarray(Image.open(img).convert("RGB")).astype(int)
    a = a[int(a.shape[0] * TITLE_BAND) :]
    content = (np.abs(a - BG).max(axis=2) > BG_TOLERANCE).sum(axis=0) >= MIN_PIXELS
    cols = np.flatnonzero(content)
    if not len(cols):
        return None
    return cols[0], a.shape[1] - 1 - cols[-1], a.shape[1]


def frames(path: Path, out: Path) -> list[tuple[str, Path]]:
    if path.suffix.lower() == ".png":
        return [(path.name, path)]
    subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", "fps=1", str(out / "f%03d.png")], check=True)
    return [(f"{path.name} {k}s", p) for k, p in enumerate(sorted(out.glob("f*.png")))]


def skewed(path: Path) -> list[tuple[int, str]]:
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        for k, (label, img) in enumerate(frames(path, Path(tmp))):
            m = margins(img)
            if m and abs(m[0] - m[1]) > MAX_SKEW * m[2]:
                out.append((k, f"{label}: left margin {m[0]}px, right margin {m[1]}px"))
    return out


def runs(hits: list[tuple[int, str]]) -> list[list[str]]:
    groups: list[list[str]] = []
    prev = None
    for k, msg in hits:
        if prev is None or k != prev + 1:
            groups.append([])
        groups[-1].append(msg)
        prev = k
    return groups


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("usage: check_layout.py <video.mp4 | still.png>...")
    bad = 0
    for arg in sys.argv[1:]:
        still = arg.lower().endswith(".png")
        for group in runs(skewed(Path(arg))):
            sustained = still or len(group) >= MIN_RUN
            bad += sustained
            tag = "WARN " if sustained else "NOTE "
            print(f"{tag} {group[0]}" + (f" (+{len(group) - 1}s)" if len(group) > 1 else ""))
    print("OK" if not bad else f"{bad} off-center stretch(es)")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
