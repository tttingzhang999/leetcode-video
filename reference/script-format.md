# Scripts.md format

`Scripts.md` is the contract between the user and the video. It holds the problem and the solution too, so a user who already has a script can skip the gathering step. The user edits it; the code copies every on-screen string and motion rule from it, and `make_voice.py` reads the narration from it. `scripts/validate_script.py` checks the structure below. The full example is `examples/lc739/Scripts.md`; copy its shape.

## Contents

- Required structure
- Scene recipe
- Narration
- Dry-run step table
- Motion spec
- Writing rules

## Required structure

```markdown
---
tags: [video-script, leetcode, <technique-tag>]
status: draft
---

> [!note] 腳本規則
> （copy verbatim from the example）

## 題目

## 解法

## 全片設定

## 動態規格

## 第 1 幕：標題（3 秒）

## 第 2 幕：題目敘述（11 秒）

## 第 3 幕：程式碼 + Dry run 動畫（約 45 秒）

## 第 4 幕：重點（10 秒）

## 第 5 幕：複雜度分析（7 秒）
```

The validator relies on these:

- `## 題目`: source (link or name), the statement in Traditional Chinese, one example input → output.
- `## 解法`: approach, the invariant the 重點 scene teaches, time and space with a one-line reason each, and the final code in a ` ```python ` block (≤ 10 lines). This block is the only copy of the code; the dry-run scene shows it.
- Scene headings: `## 第 N 幕：名稱（N 秒）` or `（約 N 秒）`, full-width colon and parentheses, numbered 1..N. The seconds are estimates; the narration sets the real length.
- 全片設定 has these lines:
  - `- 人聲：` with sub-items `模型` (`speech-2.8-hd`), `聲音` (a MiniMax `voice_id`, default `Chinese_casual_instructor_nv1`) and `語速` (`1.0`).
  - `- 範例資料：`.
  - `- 輸出：` with `位置` (output folder; if missing or unspecified, the folder the user runs the session in), `橫式` and `直式` (the MP4 file names).
  - `- 背景音樂：` (a track name from `public/music/`) and `- 各幕音效：`.
- Every `顏色意義` item starts with a palette token in backticks, for example ``- `waiting`：在堆疊裡``. Tokens come from `reference/palette.md`. A color written in words (金色, （黃框）) is a WARN; write the token.
- Every scene after the title has narration (see below). The dry-run scene name contains `Dry run` and holds the step table.
- Holds in 動態規格: rows `| <step> | <why> | <N>f |`; the step must exist.
- Length: the estimate (the larger of the heading seconds and the narration at 4.5 syllables per second) must be ≤ 90 s. Over 75 s is a WARN: ask the user what to cut.

The other 全片設定 lines (size, portrait changes, transitions table) are free text that the code implements by hand; keep them from the example and edit only what changes.

## Scene recipe

| #   | Scene            | Seconds | Contents                                                                                                                      |
| --- | ---------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | 標題             | 3       | `小標：LeetCode NNN`, `標題：<English title>`, one line of narration                                                          |
| 2   | 題目敘述         | 10–12   | `幕標題`, input and output rows, one example relation drawn as an arc, 3 narration lines, one highlighter stroke              |
| 3   | 程式碼 + Dry run | 35–50   | `幕標題`, `圖例`, the opening narration, the full code block (shown from the start, running line highlighted), the step table |
| 4   | 重點             | 8–10    | `幕標題`, a code excerpt with one `good` line, 1–2 cards (title + description), 2–3 narration lines, a highlighter stroke     |
| 5   | 複雜度           | 6–8     | `幕標題`, time and space cards, 2 narration lines                                                                             |

Each scene lists 畫面 (layout), 動畫 (what moves, in order), 畫面文字 (exact strings) and 旁白 (numbered). Say in the 旁白 heading which 動畫 items follow which line, for example `動畫 2–3 跟旁白 2`; the code starts those animations at that line. Keys that drive animation but are not shown go under `- 標記（動畫用，不顯示成文字）：`.

If the dry run needs > 50 s, shorten the example input or let more steps run silent; never raise the speech speed.

## Narration

Every line is spoken and shown as the subtitle at the same time.

```markdown
- 旁白（字幕同步顯示；動畫 1 跟旁白 1，動畫 2–3 跟旁白 2）：
  1. 第 2 天 75 度，要等到第 6 天 76 度，所以是 4。〔字幕：第 2 天 75°，要等到第 6 天 76°，所以是 4〕
  2. 之後都沒有更暖的日子，就是 0。
```

- The text before `〔字幕：…〕` is what the voice says. Write it the way it is read aloud: `75 度`, `6 減 2`, `O n`, `堆疊` instead of `tmp`.
- `〔字幕：…〕` is optional. Use it when the screen should show symbols the voice cannot read (`75°`, `answer[i]`, `O(n)`). Without it, the subtitle is the spoken text minus the final `。`.
- A subtitle is ≤ 32 characters.
- The validator warns when spoken text contains code (backticks, brackets, `tmp`, calls).
- The dry-run scene has one `- 開場旁白：` line, spoken while the code card enters.

## Dry-run step table

```markdown
| #   | 動作   | 亮起的行     | 旁白                              |
| --- | ------ | ------------ | --------------------------------- |
| 1   | 走到 0 | `for`        |                                   |
| 2   | push 0 | `tmp.append` | 第 0 天，堆疊是空的，直接放進去。 |
```

- One row = one visible state change, numbered 1..N.
- `動作` is the step label the code emits: `走到 i`, `比較 ✓`, `比較 ✗`, `pop j`, `push i`, `結束` (adapt the verbs to the problem's data structure). `validate_script.py --project` compares this column with `EVENTS[].label` row by row.
- `亮起的行` is a substring of a line in the code block (`…` allowed).
- `旁白` follows the narration rules above, or stays empty. An empty step runs silent and keeps the previous subtitle.
- A line plays over its own step and the silent steps after it. Narrate the first step of each group (one day, one insight) and leave the routine steps silent; this keeps the video short. Step 1 may be silent only when the scene has a `- 開場旁白：`.

## Motion spec

Copy the 動態規格 section from the example unless the user asks otherwise. It defines the easings, the durations, the three motion layers, the color-fade and hold rules, the 節奏 table (extra holds for the 1–3 insight steps, 20–30f each) and the per-action table with its sound cues. `reference/project.md` lists how the code implements each rule.

## Writing rules

- Traditional Chinese; identifiers stay in English with backticks on screen.
- One fact per line. Subject first. No stacked modifiers.
- Concrete numbers (`72 度比 69 暖`), not the abstract rule.
- One noun per thing everywhere (always 堆疊 for `tmp`, never 棧).
- Colors carry a fixed meaning across all scenes; declare them once in 全片設定. Name colors only by palette token.
- Short wins: cut a line before you add one. The target is the shortest video that still explains the invariant.
