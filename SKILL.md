---
name: leetcode-video
description: Guides the user from a LeetCode or algorithm problem and its solution to a short explainer video (landscape 1920×1080 and portrait 1080×1920, ≤90 s, Mandarin narration by MiniMax TTS with matching Traditional Chinese subtitles, fixed drumless lofi BGM, sound effects) built with Remotion. Asks for the problem and solution (or takes an existing Scripts.md), drafts one Scripts.md that holds everything, iterates on it with the user, generates the narration, times the animation to it, and renders both MP4s next to the script. Use when the user wants to start making a solution video, 解題影片, 解題動畫, algorithm animation or dry run animation.
---

# Making LeetCode videos with Remotion

The user ends up with exactly three files in one folder: `Scripts.md` and two MP4s. The script is the single source of truth: every on-screen string, the narration, the colors, the music and the sound cues come from it. The narration sets the timing: the voice is generated first, and every scene and step stretches to fit it. Everything else (the Remotion project, voice files, stills, contact sheets) lives in a temp build folder and is never left in the user's folders unless they ask for it.

## Skill contents

| Path                         | What                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `reference/script-format.md` | `Scripts.md` structure, scene recipe, narration, step table, writing rules                         |
| `reference/project.md`       | Project file map, timeline and layout model, centering, motion and audio conventions, pitfalls     |
| `reference/palette.md`       | The color card: every color token the script may name, and its value                               |
| `assets/project/`            | Shared project shell: `package.json`, configs, `public/music` (3 tracks), `public/sfx` (9 effects) |
| `examples/lc739/`            | A finished video (LeetCode 739): `Scripts.md` and `src/`; the starting point for every new problem |
| `scripts/scaffold.sh`        | Builds a project from the shell plus the example source                                            |
| `scripts/validate_script.py` | Checks `Scripts.md`; with `--project`, compares the step table with the code's `EVENTS`            |
| `scripts/make_voice.py`      | Generates one MiniMax voice file per 旁白 line (cached by hash) and writes `src/voice.json`        |
| `scripts/check_layout.py`    | Flags off-center stills or video stretches (content margins, below the title band)                 |
| `scripts/check_video.py`     | Checks the MP4s: size, `yuv420p`, ≤ 90 s, audio stream                                             |
| `scripts/make_audio.py`      | Regenerates the music and synthesized effects; only when the user changes the house sound          |

`SKILL_DIR` below is the directory of this file (resolve symlinks). Requires Node, `pnpm`, `ffmpeg`, `uv` and a MiniMax API key in `MINIMAX_API_KEY`.

## MiniMax API key

Check the key at step 1, so the user can set it while you write the script. The check never prints the key:

```bash
[ -n "${MINIMAX_API_KEY:-}" ] && echo "MINIMAX_API_KEY: set" || echo "MINIMAX_API_KEY: missing"
```

If it is missing, tell the user, in the conversation language, and continue with steps 1–3:

> 產生人聲需要 MiniMax API key。到 https://platform.minimax.io → API Keys 建立一把 key，然後在輸入框執行：
>
> `! export MINIMAX_API_KEY="<你的 key>"`
>
> 這只對目前的 session 有效。要長期使用，把同一行 `export` 加到 `~/.zshrc`。如果 key 是在中國站（platform.minimaxi.com）申請的，再執行 `! export MINIMAX_API_HOST="https://api.minimaxi.com"`。

Rules:

- Never ask the user to paste the key into the chat, and never write it into any file yourself.
- Re-check before step 4. Step 4 cannot start without the key; steps 1–3 can.
- If `make_voice.py` reports error `1004` (authentication failed), the key is wrong or belongs to the other region. Give the commands above again, including the `MINIMAX_API_HOST` line.

## Companion skills

Load these only at the step that needs them:

| Skill                                         | When                                                            |
| --------------------------------------------- | --------------------------------------------------------------- |
| `remotion-best-practices` → `remotion-markup` | Step 5, before writing React markup                             |
| `motion-design`                               | Step 2, when the user wants motion different from the example's |
| `remotion-studio`                             | Step 5, when the user wants a live preview                      |
| `remotion-render`                             | Step 6, for render flags                                        |
| `remotion-docs`                               | Any Remotion API question                                       |

## Workflow

Copy this checklist into the conversation and tick it as you go:

```
Video Progress:
- [ ] 1. Gather the problem and solution     → gate: problem + solution in hand
- [ ] 2. Draft Scripts.md                     → gate: validate_script.py OK
- [ ] 3. Iterate on the script with the user  → gate: user approves the script
- [ ] 4. Generate the narration               → gate: key set + total ≤ 90 s + user approves the voice
- [ ] 5. Build the animation                  → gate: validate --project OK + check_layout OK + stills look right
- [ ] 6. Render, verify, deliver              → gate: check_video.py OK + loudness OK + user confirms
```

### 1. Gather the problem and solution

First run the key check in [MiniMax API key](#minimax-api-key).

If the user gives an existing `Scripts.md`, validate it and go to step 3.

Otherwise ask once, in one message, for:

- The problem: a link, the statement, or a file to read.
- Their solution code, or a pointer to a write-up that contains it.
- Where to save the outputs. If the user does not say, use the folder the session runs in.

As soon as you have the problem and the solution, go to step 2. Do not post a separate brief for confirmation; the script is the brief.

### 2. Draft Scripts.md

Write `Scripts.md` into the output folder. Decide these yourself and put them in the script, where the user reviews them:

- `## 題目`: the statement and one example.
- `## 解法`: approach, the invariant the 重點 scene teaches, complexity, and the final code as it appears on screen (≤ 10 lines; shorten names if needed, run it to confirm the output).
- `範例資料`: 6–8 elements that hit every branch of the code.

Questions you cannot settle from the user's material go into a `> [!question] 待確認` callout at the top of the script, not into a separate message.

The output folder and both video names live in the script's `- 輸出：` block; read them from there in every later step, so the user can move the outputs by editing the script. Follow [reference/script-format.md](reference/script-format.md) and copy the shape of `examples/lc739/Scripts.md`. The script must hold everything the video needs:

- Every on-screen string, scene by scene, with estimated seconds.
- The narration: numbered 旁白 lines per scene, each spoken and shown as the subtitle. Write it short; the target is the shortest video that still explains the invariant.
- The dry-run step table, generated by running the 解法 code, not by hand. Narrate the first step of each group and leave routine steps silent.
- Colors as tokens from [reference/palette.md](reference/palette.md), the motion spec, transitions and the portrait changes (keep the example's unless the user asks otherwise).
- The music track (`lofi-1`, `lofi-2` or `lofi-3`: drumless lofi, 72 BPM) and the sound cue for every key moment.
- The voice settings (`speech-2.8-hd`, `Chinese_casual_instructor_nv1`, speed `1.0` unless the user asks otherwise) and the two output file names.

```bash
uv run SKILL_DIR/scripts/validate_script.py "<output folder>/Scripts.md"
```

Fix every ERROR before showing the script. Treat WARN lines as questions for the user.

### 3. Iterate on the script

Show the scene list, the estimated total seconds, the narration, the step table and any 待確認 items, and give the script's path. The user edits the file directly or asks for changes. After each round, re-run the validator. Do not build anything until the user approves the script. Never overwrite the user's edits; edit in place.

### 4. Generate the narration

Re-run the key check. If the key is still missing, give the setup commands again and stop here.

Build in the per-user temp folder (`$TMPDIR` on macOS, which the system clears; `/tmp` elsewhere), reused across iterations in this session:

```bash
BUILD="${TMPDIR:-/tmp}/leetcode-video-<slug>"
[ -d "$BUILD" ] || SKILL_DIR/scripts/scaffold.sh "$BUILD"
uv run SKILL_DIR/scripts/make_voice.py "<output folder>/Scripts.md" "$BUILD"
```

`make_voice.py` calls MiniMax once per line, normalizes each file to −16 LUFS, and writes `src/voice.json` (file, length and subtitle per line). Lines whose text and voice settings did not change are reused, so re-running after an edit only pays for the edited lines.

It prints every line's length and the narration total. If the total is over 90 s, or over 75 s and the user wants it shorter, show the longest lines and ask the user what to cut. Never raise `語速` to fit. Then let the user listen to a few files in `$BUILD/public/vo/` and approve the voice.

After any 旁白 edit, re-run `make_voice.py` before rendering.

### 5. Build the animation

Adapt the project; [reference/project.md](reference/project.md) says what changes per file. In order:

1. `src/timeline.ts`: the input data and `buildDrafts()` with the real algorithm and one `label` per step. Captions and step lengths come from `voice.json`. Then prove the labels match the script's 動作 column:
   ```bash
   uv run SKILL_DIR/scripts/validate_script.py "<output folder>/Scripts.md" --project "$BUILD"
   ```
2. `src/content.ts`: every other on-screen string, copied verbatim from the script.
3. `src/layout.ts`, `src/stage.tsx`, `src/Simulation.tsx`, `src/Scenes.tsx`: the views for this problem's data structure.
4. Each scene's animations start at its narration cues (`cues(n)[k].start`), as the script's 旁白 heading maps them. `<SceneVoice scene={n} />` plays the lines.
5. The root composition: `BGM` set to the script's track; `<Sfx>` cues placed as the script lists them.

Preview loop (max 3 rounds on the same defect, then report and ask). All previews go to `$BUILD/out/`:

```bash
cd "$BUILD" && npx tsc --noEmit
npx remotion still Landscape out/s.png --frame=<N>   # one frame per scene + key steps; repeat with Portrait
```

Take the layout stills at each scene's last frame, after the motion settles, and run `uv run SKILL_DIR/scripts/check_layout.py out/*.png`. Fix every WARN with the centering rules in `reference/project.md`. Then read each still. Check for overlapping or clipped text, elements outside the 60px safe margin, the wrong color for a state, the code highlight on the wrong line, and a subtitle that differs from the script. Render a short range with audio and listen: each animation must start with the line that describes it. For motion, render a range with `--frames=a-b` and read a 10 fps contact sheet (`ffmpeg -i in.mp4 -vf "fps=10,scale=200:-1,tile=10x4" -frames:v 1 sheet.png`). A color must never change between two adjacent frames.

If the user wants a change while you build, change the script first, re-validate, then the code.

### 6. Render, verify, deliver

If a video with the same name exists in the output folder, ask before overwriting it.

```bash
cd "$BUILD"
pnpm run render Landscape "<output folder>/<landscape name>.mp4"
pnpm run render Portrait "<output folder>/<portrait name>.mp4"
uv run SKILL_DIR/scripts/check_video.py "<output folder>/<landscape name>.mp4" "<output folder>/<portrait name>.mp4"
ffmpeg -nostats -i "<output folder>/<landscape name>.mp4" -af ebur128 -f null - 2>&1 | grep -A14 Summary
```

Also run `check_layout.py` on both MP4s. A WARN means a scene stays off-center for 3 s or more; NOTE lines are entrances and transitions.

`check_video.py` must print `OK`. Integrated loudness should be −16 ± 1 LUFS and the peak below −1 dBFS; tune `VOICE_VOLUME` for that. The voice must stay clearly over the music and the effects. To rebalance the rest, change `MUSIC_VOLUME`, `SPEECH_DUCK` or `SFX_VOLUME`, never one effect alone.

Give the user the full paths of the three files, the final duration, and anything that differs from the script. Leave `$BUILD` in the temp folder; mention it only if the user wants the project.

## Sound rules

- The voice leads. Music plays at 25% and halves again under speech; effects sit under the voice.
- Never compose new music per video; pick a track from the library.
- Every key moment of every scene has at least one cue.
- Emphasis comes from timbre and timing, never loudness. Sharp sounds get a lower gain in `SFX_GAIN` (`ding` 0.75, `chime` 0.7). Keep the `ding` soft but audible; too dull is as wrong as too sharp.

## Rules

- Outputs are `Scripts.md` and the two MP4s only. Everything else stays in `$BUILD`, unless the user asks for it.
- Every on-screen string comes from the script. If the script lacks a string, add it to the script first.
- Keep ≤ 90 s, and as short as the explanation allows. If over, cut narration, silence routine steps or shorten the example input with the user; never speed up the voice or the motion spec.
- Every subtitle is the narration of that moment. A silent step keeps the previous subtitle.
- No camera zoom on the dry run.
- The dry-run code card shows every line from the first frames (lines slide in 4f apart). Never hide a line until it first runs; only the highlight moves.
- Change `assets/` or `examples/` only when the user asks to change the house style.
