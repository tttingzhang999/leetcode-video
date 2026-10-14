#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Check a Scripts.md; with --project, also check its dry-run table against the project's EVENTS.

Usage: validate_script.py <Scripts.md> [--project <project dir>]
Prints every problem and exits 1 on any ERROR. make_voice.py imports the parsers below.
"""

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

MAX_SECONDS = 90
SOFT_SECONDS = 75  # over this, ask the user what to cut
MAX_SUB_CHARS = 32  # longer subtitles wrap on the 1080-wide portrait layout
CHARS_PER_SECOND = 4.5  # Mandarin narration at speed 1.0, pauses included
SCENE_RE = re.compile(r"^## 第 (\d+) 幕：(.+?)（約?\s*([\d.]+)\s*秒）\s*$")
STEP_RE = re.compile(r"^\|\s*(\d+)\s*\|(.+)\|\s*$")
HOLD_RE = re.compile(r"^\|\s*(\d+)\s*\|.*\|\s*(\d+)f\s*\|\s*$")
NUMBERED_RE = re.compile(r"^\s+\d+\.\s+(.+)$")
OVERRIDE_RE = re.compile(r"^(.*?)〔字幕：(.+)〕\s*$")
PALETTE = Path(__file__).resolve().parent.parent / "reference" / "palette.md"
TOKEN_ROW_RE = re.compile(r"^\|\s*`([\w.]+)`\s*\|", re.M)
COLOR_WORD_RE = re.compile(r"[金藍青綠紅黃紫橘灰]色|（[金藍青綠紅黃紫橘灰]框?）")
VOICE_KEYS = ("模型", "聲音", "語速")
DUMP_EVENTS = 'import {EVENTS} from "./src/timeline"; console.log(JSON.stringify(EVENTS.map((e) => e.label)))'


class Line(NamedTuple):
    scene: int
    key: str  # "1".."N" for a scene's 旁白 list, "intro" or the step number in the dry run
    spoken: str
    subtitle: str


def sections(text: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    name = ""
    for line in text.splitlines():
        if line.startswith("## "):
            name = line
            out[name] = []
        elif name:
            out[name].append(line)
    return out


def code_block(lines: list[str]) -> str:
    m = re.search(r"```python\n(.*?)```", "\n".join(lines), re.S)
    return m.group(1) if m else ""


def steps(lines: list[str]) -> list[list[str]]:
    rows = []
    for line in lines:
        m = STEP_RE.match(line)
        if m:
            rows.append([m.group(1)] + [c.strip() for c in m.group(2).split("|")])
    return rows


def split_override(text: str) -> tuple[str, str]:
    m = OVERRIDE_RE.match(text.strip())
    spoken, shown = (m.group(1), m.group(2)) if m else (text, text)
    return spoken.strip(), shown.strip().rstrip("。")


def voice_settings(secs: dict[str, list[str]]) -> dict[str, str]:
    out: dict[str, str] = {}
    inside = False
    for line in secs.get("## 全片設定", []):
        if line.startswith("- "):
            inside = line.startswith("- 人聲：")
        elif inside:
            m = re.match(r"\s+- (\S+?)：\s*`?([^`]+?)`?\s*$", line)
            if m:
                out[m.group(1)] = m.group(2)
    return out


def scene_list(secs: dict[str, list[str]]) -> list[tuple[str, re.Match | None]]:
    return [(h, SCENE_RE.match(h)) for h in secs if h.startswith("## 第")]


def is_dry(m: re.Match) -> bool:
    return "dry run" in m.group(2).lower()


def narration(secs: dict[str, list[str]]) -> list[Line]:
    lines: list[Line] = []
    for head, m in scene_list(secs):
        if not m:
            continue
        n = int(m.group(1))
        body = secs[head]
        if is_dry(m):
            for b in body:
                if b.startswith("- 開場旁白"):
                    lines.append(Line(n, "intro", *split_override(b.split("：", 1)[1])))
            for r in steps(body):
                if len(r) == 4 and r[3]:
                    lines.append(Line(n, r[0], *split_override(r[3])))
            continue
        inside = False
        for b in body:
            if b.startswith("- "):
                inside = b.startswith("- 旁白")
            elif inside and (nm := NUMBERED_RE.match(b)):
                k = sum(1 for x in lines if x.scene == n) + 1
                lines.append(Line(n, str(k), *split_override(nm.group(1))))
    return lines


def check(path: Path, project: Path | None) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warns: list[str] = []
    secs = sections(path.read_text())
    scenes = scene_list(secs)
    errors += [f"Bad scene heading `{h}`; use `## 第 N 幕：名稱（N 秒）`." for h, m in scenes if not m]
    good = [(h, m) for h, m in scenes if m]
    nums = [int(m.group(1)) for _, m in good]
    if nums != list(range(1, len(nums) + 1)):
        errors.append(f"Scene numbers must run 1..N in order, got {nums}.")

    for name in ("## 題目", "## 解法"):
        if name not in secs:
            errors.append(f"Missing `{name}` section.")
    errors += check_colors(secs, warns)

    settings = "\n".join(secs.get("## 全片設定", []))
    for key in ("範例資料", "輸出", "人聲", "背景音樂", "各幕音效"):
        if f"- {key}：" not in settings:
            errors.append(f"全片設定 needs a `- {key}：` line.")
    voice = voice_settings(secs)
    errors += [f"`- 人聲：` needs a `{k}` sub-item." for k in VOICE_KEYS if k not in voice]

    errors += check_narration(secs, good, warns)

    dry = next((h for h, m in good if is_dry(m)), None)
    if not dry:
        errors.append("No dry-run scene; its heading name must contain `Dry run`.")
        return errors, warns
    code = code_block(secs.get("## 解法", []))
    if not code:
        errors.append("`## 解法` needs a ```python block with the final code.")
    rows = steps(secs[dry])
    if not rows:
        errors.append("The dry-run scene needs the step table: | # | 動作 | 亮起的行 | 旁白 |")
    for k, r in enumerate(rows, 1):
        if len(r) != 4:
            errors.append(f"Step row {r[0]} has {len(r)} cells, expected 4.")
            continue
        if int(r[0]) != k:
            errors.append(f"Step numbers must run 1..N; row {k} is numbered {r[0]}.")
        key = r[2].replace("`", "").replace("…", "").strip()
        if key and key not in code:
            errors.append(f"Step {r[0]} highlights `{key}`, which is not in the code block.")
    has_intro = any(b.startswith("- 開場旁白") for b in secs[dry])
    if rows and len(rows[0]) == 4 and not rows[0][3] and not has_intro:
        errors.append("Step 1 needs 旁白 or the scene a `- 開場旁白：`; a silent step keeps the previous subtitle.")

    motion = next((v for h, v in secs.items() if "動態規格" in h), [])
    for line in motion:
        m = HOLD_RE.match(line)
        if m and int(m.group(1)) > len(rows):
            errors.append(f"節奏 table holds step {m.group(1)}, which does not exist.")

    if project:
        errors += compare_events(project, [r[1] for r in rows if len(r) == 4])
    return errors, warns


def check_narration(secs: dict[str, list[str]], good: list, warns: list[str]) -> list[str]:
    errors = []
    lines = narration(secs)
    for _, m in good:
        n = int(m.group(1))
        if n > 1 and not any(x.scene == n for x in lines):
            errors.append(f"第 {n} 幕 has no 旁白.")
    for x in lines:
        if len(x.subtitle) > MAX_SUB_CHARS:
            warns.append(f"第 {x.scene} 幕 line {x.key}: subtitle has {len(x.subtitle)} chars (> {MAX_SUB_CHARS}): {x.subtitle}")
        if re.search(r"[`\[\]]|tmp|\w+\(", x.spoken):
            warns.append(f"第 {x.scene} 幕 line {x.key}: 旁白 has code; write how it is said and put the code in 〔字幕：…〕: {x.spoken}")
    spoken = sum(syllables(x.spoken) for x in lines) / CHARS_PER_SECOND
    total = sum(float(m.group(3)) for _, m in good)
    if max(spoken, total) > MAX_SECONDS:
        errors.append(f"Estimated length is {max(spoken, total):.0f}s (headings {total:.0f}s, narration {spoken:.0f}s); the limit is {MAX_SECONDS}s.")
    elif max(spoken, total) > SOFT_SECONDS:
        warns.append(f"Estimated length is {max(spoken, total):.0f}s; over {SOFT_SECONDS}s, ask the user what to cut.")
    return errors


def syllables(text: str) -> int:
    """CJK characters count one each; a Latin word or a number counts as one."""
    return len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+|\d+", text))


def check_colors(secs: dict[str, list[str]], warns: list[str]) -> list[str]:
    tokens = set(TOKEN_ROW_RE.findall(PALETTE.read_text())) | {"syntax.*"}
    errors = []
    meaning = False
    for line in secs.get("## 全片設定", []):
        if line.startswith("- "):
            meaning = line.startswith("- 顏色意義")
        elif meaning and line.strip().startswith("- "):
            m = re.match(r"\s*- `([\w.*]+)`", line)
            if not m or m.group(1) not in tokens:
                errors.append(f"顏色意義 item must start with a palette token from reference/palette.md: `{line.strip()}`")
    for name, lines in secs.items():
        for line in lines:
            for word in COLOR_WORD_RE.findall(line):
                warns.append(f"{name}: `{word}` names a color in words; use a palette token.")
    return errors


def compare_events(project: Path, actions: list[str]) -> list[str]:
    out = subprocess.run(["npx", "-y", "tsx", "-e", DUMP_EVENTS], cwd=project, capture_output=True, text=True)
    if out.returncode:
        return [f"Could not load EVENTS from {project}/src/timeline.ts: {out.stderr.strip()[-300:]}"]
    labels = json.loads(out.stdout.strip().splitlines()[-1])
    errors = []
    if len(labels) != len(actions):
        errors.append(f"EVENTS has {len(labels)} steps; the script table has {len(actions)}.")
    for k, (want, got) in enumerate(zip(actions, labels), 1):
        if want != got:
            errors.append(f"Step {k}: script 動作 is `{want}`, EVENTS label is `{got}`.")
            break
    return errors


def main() -> None:
    args = sys.argv[1:]
    project = None
    if "--project" in args:
        i = args.index("--project")
        project = Path(args[i + 1])
        args = args[:i] + args[i + 2 :]
    if len(args) != 1:
        sys.exit("usage: validate_script.py <Scripts.md> [--project <project dir>]")
    errors, warns = check(Path(args[0]), project)
    for w in warns:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    print("OK" if not errors else f"{len(errors)} error(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
