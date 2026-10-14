# Remotion project map

A project has two parts. `assets/project/` is the shell every video shares: `package.json` (Remotion 4.0.529, React 19, pnpm), configs, music and sound effects. `examples/lc739/src/` is the finished LeetCode 739 source, the starting point to adapt. `scripts/scaffold.sh <dir>` copies both into a build folder under the system temp directory.

## Contents

- Files and what to change per problem
- Timeline model
- Layout model
- Motion and color conventions
- Audio
- Known pitfalls

## Files and what to change per problem

| File                                        | Role                                                                             | Per problem                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/timeline.ts`                           | Input data, the real algorithm, event table, scene durations                     | Rewrite `buildDrafts()`, inputs, `DUR`, `HOLD`, `SCENES`                    |
| `src/voice.ts`, `src/voice.json`            | Narration manifest (written by `make_voice.py`), `cues()`, `sceneLength()`       | Keep `voice.ts`; never edit `voice.json` by hand                            |
| `public/vo/*.wav`                           | One normalized voice file per 旁白 line, named by hash                           | Generated                                                                   |
| `src/Simulation.tsx`                        | Dry-run scene: bars, pointer, result row, code card, big answer line, sound cues | Rewrite the views for the problem's data structure; keep the motion helpers |
| `src/stage.tsx`                             | Geometry (`geo`), `Bars`, `StackFrame`, `Block`                                  | Replace if the problem is not array + stack                                 |
| `src/Scenes.tsx`                            | 標題, 題目, 重點, 複雜度 scenes                                                  | Replace the strings and the problem-specific visuals                        |
| `src/layout.ts`                             | `LANDSCAPE` / `PORTRAIT` coordinates, `LayoutContext`                            | Re-place every element for both orientations                                |
| `src/theme.ts`                              | Palette `C` and `SYNTAX` (the tokens of `reference/palette.md`), fonts           | Keep; no color literal anywhere else                                        |
| `src/parts.tsx`                             | `Scene`, `Fade`, `Caption`, `CodeLines`, `Sfx`, `Voice`, `SceneVoice`            | Keep                                                                        |
| `src/highlight.tsx` | `PyLine`: a dependency-free Python tokenizer colored with `SYNTAX` | Keep; add keywords if the code needs them |
| `src/DailyTemperatures.tsx`, `src/Root.tsx` | `TransitionSeries`, the music track, the `Landscape` and `Portrait` compositions | Rename the component file; keep the composition IDs (the render scripts use them) |
| `public/sfx/*.wav`, `public/music/*.mp3` | 9 effects, 3 BGM tracks | Keep; pick a track per video |
| `package.json` | `render` takes the composition ID and the output path: `pnpm run render Landscape <out.mp4>` | Keep |

On-screen strings are TypeScript literals in the example; the code does not parse `Scripts.md`. When you adapt a problem, collect every string in one module, `src/content.ts`, copied verbatim from `Scripts.md`. Then one diff against the script finds every mismatch.

## Timeline model

`buildDrafts()` runs the real algorithm on the input and emits one event per visible state change: `visit`, `compare`, `pop`, `push`, `done`. Each event carries `stackBefore/After`, `resultBefore/After`, the highlighted code line and a `label` (`走到 3`, `pop 4`). Because the events come from the algorithm, the script's 動作 column must equal the labels row for row.

`withTiming()` attaches the step's voice line from `voice.json` (key = step number), sets `caption` to that line's subtitle (a silent step keeps the previous one), and assigns `start` and `dur`. A silent step lasts `DUR[kind] + HOLD[step]`. A narrated step lasts the same, unless its line is longer than itself plus the silent steps after it; then only the narrated step stretches. So a line plays over its whole group and the routine steps animate under it.

Narration timing (`voice.ts`): `cues(scene)` lays a scene's lines back to back from `LEAD` (18f, after the incoming transition) with a `GAP` (10f) after each. `sceneLength(scene)` ends the scene `TAIL` (20f) after the last line, and at least `SETTLE` (80f) after the last cue, so its animation can finish. Scene animations start at cue frames, never at literal frames. `SIM_INTRO` stretches to fit the dry run's `intro` line.

Views are pure functions of `(event, local frame)`. To animate a change, interpolate between the state of the previous event (`stateAt(prev, prev.dur)`) and the current one. Never keep React state.

Scene length: `TOTAL_FRAMES = sum(SCENES) − 4 × TRANSITION`. Each transition overlaps two scenes, so it shortens the total.

## Layout model

Both compositions render the same components inside `LayoutContext.Provider`. Every coordinate comes from `useLayout()`; no component checks the orientation itself, except where a scene reflows (cards stacked vertically, a horizontal stack in portrait). Add a field to `Layout` rather than branching on `portrait` inside a view.

Centering, following Remotion's layout docs:

- Text and cards: a full-width box (`left: 0, right: 0` or `AbsoluteFill`) with `display: flex` and `justifyContent: "center"`. Never place centered content with a hand-picked `left`.
- Rows whose width depends on the data (bars, cells, nodes): compute the start with `rowStart(n, step, itemW, from, to)` from `layout.ts`, never a literal x. The row then stays centered when the input length changes.
- Text that must fit a width (long titles, wide code lines): use `fitText` or `measureText` from `@remotion/layout-utils` with the same font family and weight as the render, and clamp the size.
- Scene titles stay left-aligned at `title.x`; `check_layout.py` skips that band.

## Motion and color conventions

These implement the 動態規格 section of `Scripts.md`; keep them unless the script says otherwise.

- Easings: `STD (0.2,0,0,1)`, `DECEL (0.05,0.7,0.1,1)`, `ACCEL (0.3,0,1,1)`, `OVER (0.175,0.885,0.32,1.275)` (the answer moment only).
- Color changes: `interpolateColors` over 20f (`COLOR_FADE`), clamped to the event length. Never switch a color in under 6f; it reads as a flicker.
- Colors come only from `C` and `SYNTAX` in `theme.ts`, which mirror `reference/palette.md`. `current` plus a glow is the only bright color.
- Bars: vertical gradient (100% → 40% opacity), a 2px top highlight, `drop-shadow` glow lerped with the color.
- Hold 15f after every pop (`DUR.pop`), plus `HOLD` for the 1–3 insight steps.
- Big answer line: the old value blurs out while the new one blurs in, over 12f.
- Code card: all lines enter together at the scene start, staggered by `LINE_STAGGER` (4f), and stay visible. No line waits for its first execution.
- Code highlight: a `codeHl` bar that slides between lines over 8f. Code is syntax-colored with `PyLine`; the running line is bold, not recolored. The 重點 scene's emphasized line stays solid `good`.
- Flying elements use `HtmlInCanvasMotionBlur`.

## Audio

- Voice: `make_voice.py` normalizes every line to −16 LUFS with a −2 dBFS peak cap (AAC adds about 1 dB). `Voice` plays a file at `VOICE_VOLUME` (1); tune that one constant until the render measures −16 ± 1 LUFS.
- Music: one `<Audio>` in the root composition plays `public/music/<track>.mp3` at `MUSIC_VOLUME` (0.25). `musicVolume` builds the absolute speech spans from the cues and the narrated events, multiplies the music by `SPEECH_DUCK` (0.5) under speech with a 6f ramp, and fades out over the last 30 frames.
- The library is generated once by `scripts/make_audio.py <public dir>` (numpy + pedalboard + pyloudnorm, seeded, so reruns are identical). Tracks are normalized to −18 LUFS. Regenerate only when the user asks to change the house sound.
- Sound effects: `Sfx` in `parts.tsx` wraps `<Audio>` in a `<Sequence>`, at `SFX_VOLUME × SFX_GAIN[name]`; sharp sounds (`ding`, `chime`) get a gain below 1. Any scene places cues with `<Sfx from={frame} name="..." />`.

## Known pitfalls

- `TransitionSeries.Overlay` cannot sit next to a transition, and it has no `premountFor`.
- MiniMax reads symbols badly (`[i]`, `°`, `O(n)`, `tmp`). Spoken text spells them out; the subtitle override keeps the symbols on screen.
- `@remotion/rough-notation` `padding` takes an object, not a number.
- A camera zoom on the dry run made the edge bars jitter at the crop edge. Keep the camera fixed.
- A popped element needs its waiting color until its answer lands, then a fade to solved. Otherwise it flashes grey for a few frames.
- `remotion.config.ts` sets `setChromiumOpenGlRenderer("angle")`; motion blur needs it.
- Remotion's default encode is full-range `yuvj420p`, which QuickTime and Instagram reject. The `render` scripts pass `--pixel-format=yuv420p --color-space=bt709`; keep both flags.
