#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pedalboard", "pyloudnorm", "soundfile"]
# ///
"""Generate the fixed BGM library (drumless lofi) and the extra sound effects.

Run once; outputs are committed into assets/project/public. Fully seeded, so reruns are identical.
Usage: uv run make_audio.py <public dir>
"""

import subprocess
import sys
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from pedalboard import Compressor, HighpassFilter, LowpassFilter, Pedalboard, Reverb

SR = 44100
BPM = 72
BEAT = 60 / BPM
BAR = 4 * BEAT
BARS = 20
MUSIC_LUFS = -18.0
SFX_PEAK_DB = -6.0

# (bass midi, voicing midi) per chord; one chord per bar, progression loops.
TRACKS = {
    "lofi-1": [(40, [55, 59, 62, 66]), (45, [55, 61, 66, 71]), (38, [54, 57, 61, 64]), (35, [57, 62, 66, 73])],
    "lofi-2": [(41, [57, 60, 64, 67]), (40, [55, 59, 62, 64]), (38, [53, 57, 60, 64]), (36, [52, 55, 59, 62])],
    "lofi-3": [(37, [53, 56, 60, 63]), (36, [51, 55, 58, 62]), (41, [56, 60, 63, 67]), (34, [56, 62, 67, 72])],
}
SEEDS = {"lofi-1": 11, "lofi-2": 22, "lofi-3": 33}


def hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def t_axis(sec: float) -> np.ndarray:
    return np.arange(int(sec * SR)) / SR


def epiano(m: int, sec: float, vel: float) -> np.ndarray:
    t = t_axis(sec)
    f = hz(m)
    index = 1.8 * np.exp(-t * 5)
    tone = np.sin(2 * np.pi * f * t + index * np.sin(2 * np.pi * f * t))
    env = (1 - np.exp(-t * 300)) * np.exp(-t * 1.1)
    return vel * tone * env


def pad(m: int, sec: float) -> np.ndarray:
    t = t_axis(sec)
    f = hz(m)
    tone = sum(np.sin(2 * np.pi * f * d * t) for d in (0.997, 1.0, 1.003)) / 3
    env = np.minimum(1, t / 1.2) * np.minimum(1, (sec - t) / 1.0)
    return 0.25 * tone * env


def bass(m: int, sec: float) -> np.ndarray:
    t = t_axis(sec)
    tone = np.tanh(1.5 * np.sin(2 * np.pi * hz(m) * t))
    env = (1 - np.exp(-t * 80)) * np.exp(-t * 0.8)
    return 0.55 * tone * env


def place(buf: np.ndarray, sig: np.ndarray, at: float) -> None:
    i = int(at * SR)
    n = min(len(sig), len(buf) - i)
    if n > 0:
        buf[i : i + n] += sig[:n]


def vinyl(n: int, rng: np.random.Generator) -> np.ndarray:
    hiss = np.convolve(rng.normal(0, 1, n), np.ones(30) / 30, mode="same") * 0.02
    clicks = np.zeros(n)
    idx = rng.choice(n, size=int(n / SR * 6), replace=False)
    clicks[idx] = rng.uniform(0.1, 0.35, len(idx)) * rng.choice([-1, 1], len(idx))
    return hiss + np.convolve(clicks, np.exp(-np.arange(40) / 6), mode="same")


def wobble(x: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    t = np.arange(len(x)) / SR
    depth = 0.0018
    d = depth * np.sin(2 * np.pi * 0.35 * t + rng.uniform(0, 6)) + 0.0006 * np.sin(2 * np.pi * 1.7 * t)
    return np.interp(t + d, t, x)


def compose(chords: list, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    total = BARS * BAR + 3.0
    buf = np.zeros(int(total * SR))
    swing = 0.58
    for b in range(BARS):
        root, voicing = chords[b % len(chords)]
        start = b * BAR
        for m in voicing:
            place(buf, pad(m, BAR + 0.8), start)
        if b < 2:
            continue
        hits = [0.0, 1 + swing, 3.0] if b % 2 == 0 else [0.0, 2 + swing]
        for h in hits:
            at = start + h * BEAT + rng.normal(0, 0.012)
            vel = rng.uniform(0.18, 0.26)
            for k, m in enumerate(voicing):
                place(buf, epiano(m, 2.4, vel), at + k * 0.012)
        place(buf, bass(root, BAR * 0.9), start)
        if b % 2 == 1:
            place(buf, bass(root + 7, BEAT * 1.2) * 0.7, start + (2 + swing) * BEAT)
    fade = np.minimum(1, np.arange(len(buf)) / (SR * 2.0))
    buf = wobble(buf * fade, rng) + vinyl(len(buf), rng)
    board = Pedalboard([HighpassFilter(60), LowpassFilter(4200), Compressor(threshold_db=-20, ratio=2.5), Reverb(room_size=0.55, wet_level=0.22, dry_level=0.85)])
    out = board(buf.astype(np.float32), SR)
    loud = pyln.Meter(SR).integrated_loudness(out)
    return pyln.normalize.loudness(out, loud, MUSIC_LUFS)


def sfx_peak(x: np.ndarray) -> np.ndarray:
    return x / np.max(np.abs(x)) * 10 ** (SFX_PEAK_DB / 20)


def make_sfx() -> dict[str, np.ndarray]:
    rng = np.random.default_rng(7)
    t = t_axis(0.35)
    noise = rng.normal(0, 1, len(t))
    sweep = np.convolve(noise, np.ones(8) / 8, mode="same") * np.sin(np.pi * t / 0.35) ** 2
    marker = Pedalboard([HighpassFilter(1500), LowpassFilter(6000)])(sweep.astype(np.float32), SR)

    swell = sum(pad(m, 1.6) for m in (50, 57, 61, 64)) * np.linspace(0, 1, int(1.6 * SR)) ** 2

    t = t_axis(0.12)
    pop = np.sin(2 * np.pi * (520 + 500 * np.exp(-t * 40)) * t) * np.exp(-t * 35)

    t = t_axis(0.04)
    tick = np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 150)

    ding = sum(epiano(m, 1.2, v) for m, v in ((81, 0.3), (88, 0.12)))
    ding = Pedalboard([LowpassFilter(5000)])(ding.astype(np.float32), SR)

    chime = sum(epiano(m, 2.5, 0.3) for m in (62, 66, 69, 73, 76))
    verb = Pedalboard([Reverb(room_size=0.5, wet_level=0.25)])
    return {
        "marker": sfx_peak(np.asarray(marker)) * 0.7,
        "swell": sfx_peak(verb(swell.astype(np.float32), SR)) * 0.6,
        "pop-soft": sfx_peak(pop),
        "tick": sfx_peak(tick) * 0.6,
        "ding": sfx_peak(verb(np.asarray(ding), SR)) * 0.5,
        "chime": sfx_peak(verb(chime.astype(np.float32), SR)) * 0.5,
    }


def main() -> None:
    public = Path(sys.argv[1])
    (public / "music").mkdir(parents=True, exist_ok=True)
    (public / "sfx").mkdir(parents=True, exist_ok=True)
    for name, chords in TRACKS.items():
        wav = public / "music" / f"{name}.wav"
        sf.write(wav, compose(chords, SEEDS[name]), SR, subtype="PCM_16")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-b:a", "192k", wav.with_suffix(".mp3")], check=True)
        wav.unlink()
        print("music", name)
    for name, x in make_sfx().items():
        sf.write(public / "sfx" / f"{name}.wav", np.asarray(x, dtype=np.float32), SR, subtype="PCM_16")
        print("sfx", name)


if __name__ == "__main__":
    main()
