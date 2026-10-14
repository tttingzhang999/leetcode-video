#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pyloudnorm", "soundfile"]
# ///
"""Generate the narration with MiniMax TTS, one file per 旁白 line, and write src/voice.json.

Usage: make_voice.py <Scripts.md> <project dir>
Needs MINIMAX_API_KEY. MINIMAX_API_HOST overrides https://api.minimax.io.
A line is cached by hash(model, voice, speed, spoken text): unchanged lines are not regenerated.
"""

import hashlib
import warnings
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_script import Line, narration, sections, voice_settings  # noqa: E402

SR = 44100
warnings.filterwarnings("ignore", message="Possible clipped samples")  # the PEAK cap below handles it
VOICE_LUFS = -16.0
PEAK = 10 ** (-2 / 20)  # -2 dBFS: AAC encoding overshoots by ~1 dB, the render must stay under -1
RETRY_CODES = {1002, 1039}  # rate limits
AUTH_FAILED = 1004
SETUP_HINT = """{reason}
Create a key at https://platform.minimax.io (API Keys), then run:
  export MINIMAX_API_KEY="<your key>"
A key from the China site (platform.minimaxi.com) also needs:
  export MINIMAX_API_HOST="https://api.minimaxi.com"
Add the same lines to ~/.zshrc to keep them across sessions."""
RETRIES = 4
GAP_SECONDS = 0.35  # pause the timeline adds after each line; used only for the estimate here
LIMIT_SECONDS = 90


def synthesize(text: str, cfg: dict[str, str], key: str) -> np.ndarray:
    host = os.environ.get("MINIMAX_API_HOST", "https://api.minimax.io")
    body = {
        "model": cfg["模型"],
        "text": text,
        "stream": False,
        "output_format": "hex",
        "voice_setting": {"voice_id": cfg["聲音"], "speed": float(cfg["語速"]), "vol": 1, "pitch": 0},
        "audio_setting": {"sample_rate": SR, "bitrate": 128000, "format": "mp3", "channel": 1},
    }
    req = urllib.request.Request(
        f"{host}/v1/t2a_v2",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                res = json.load(r)
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"MiniMax HTTP {e.code}: {e.read()[:300]!r}") from e
        status = res.get("base_resp", {})
        if status.get("status_code") == 0:
            audio, _ = sf.read(io.BytesIO(bytes.fromhex(res["data"]["audio"])), dtype="float32")
            return audio
        if status.get("status_code") in RETRY_CODES and attempt < RETRIES - 1:
            time.sleep(2**attempt)
            continue
        if status.get("status_code") == AUTH_FAILED:
            sys.exit(SETUP_HINT.format(reason=f"MiniMax rejected the key (1004) at {host}."))
        raise RuntimeError(f"MiniMax error {status.get('status_code')}: {status.get('status_msg')} (trace {res.get('trace_id')})")
    raise RuntimeError("unreachable")


def normalize(audio: np.ndarray) -> np.ndarray:
    meter = pyln.Meter(SR, block_size=min(0.4, len(audio) / SR))
    out = pyln.normalize.loudness(audio, meter.integrated_loudness(audio), VOICE_LUFS)
    peak = np.max(np.abs(out))
    return out * (PEAK / peak) if peak > PEAK else out


def line_file(line: Line, cfg: dict[str, str], key: str, vo_dir: Path) -> tuple[str, int, bool]:
    digest = hashlib.sha1("|".join([cfg["模型"], cfg["聲音"], cfg["語速"], line.spoken]).encode()).hexdigest()[:12]
    path = vo_dir / f"{digest}.wav"
    fresh = not path.exists()
    if fresh:
        sf.write(path, normalize(synthesize(line.spoken, cfg, key)), SR, subtype="PCM_16")
    return f"vo/{path.name}", round(sf.info(path).duration * 1000), fresh


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("usage: make_voice.py <Scripts.md> <project dir>")
    key = os.environ.get("MINIMAX_API_KEY")
    if not key:
        sys.exit(SETUP_HINT.format(reason="MINIMAX_API_KEY is not set."))
    secs = sections(Path(sys.argv[1]).read_text())
    cfg = voice_settings(secs)
    project = Path(sys.argv[2])
    vo_dir = project / "public" / "vo"
    vo_dir.mkdir(parents=True, exist_ok=True)

    scenes: dict[str, list[dict]] = {}
    made = 0
    for line in narration(secs):
        file, ms, fresh = line_file(line, cfg, key, vo_dir)
        made += fresh
        scenes.setdefault(str(line.scene), []).append({"key": line.key, "file": file, "ms": ms, "subtitle": line.subtitle})
        print(f"{'new ' if fresh else 'kept'} 第 {line.scene} 幕 {line.key:>5}  {ms / 1000:5.2f}s  {line.spoken}")

    manifest = {"model": cfg["模型"], "voice": cfg["聲音"], "speed": float(cfg["語速"]), "scenes": scenes}
    (project / "src" / "voice.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    lines = [x for v in scenes.values() for x in v]
    total = sum(x["ms"] for x in lines) / 1000 + GAP_SECONDS * len(lines)
    print(f"{made} new, {len(lines) - made} cached; narration ≈ {total:.1f}s")
    longest = sorted(lines, key=lambda x: -x["ms"])[:3]
    if total > LIMIT_SECONDS:
        print(f"WARN  narration alone is over {LIMIT_SECONDS}s; longest lines:")
        for x in longest:
            print(f"      {x['ms'] / 1000:.2f}s  {x['subtitle']}")


if __name__ == "__main__":
    main()
