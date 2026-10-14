# leetcode-video

A Claude Code skill. Give it a LeetCode problem and its solution, and it makes an explainer video of 90 seconds or less.

- Two MP4s: landscape 1920×1080 and portrait 1080×1920
- Mandarin narration by MiniMax TTS, with Traditional Chinese subtitles in sync
- A dry-run animation of the code, timed to the narration
- Lofi background music and sound effects synthesized by the skill itself; no third-party assets
- Built with [Remotion](https://www.remotion.dev/)

## Demo

LeetCode 739 Daily Temperatures. The script behind it: [examples/lc739/Scripts.md](examples/lc739/Scripts.md).

Landscape:

https://github.com/user-attachments/assets/2173f9d3-eaea-4c1d-916c-71ff4e7c7c43

Portrait:

https://github.com/user-attachments/assets/eaac00d4-cf7b-4247-a1d8-7940e6c025da

## Requirements

- [Claude Code](https://claude.com/claude-code)
- Node.js and pnpm
- [uv](https://docs.astral.sh/uv/) (runs the Python in `scripts/`)
- ffmpeg
- A MiniMax API key

## Install

Put this folder at `~/.claude/skills/leetcode-video`.

Set your MiniMax API key:

```bash
echo 'export MINIMAX_API_KEY="<your key>"' >> ~/.zshrc
```

If your key is from the China site (platform.minimaxi.com), also add:

```bash
echo 'export MINIMAX_API_HOST="https://api.minimaxi.com"' >> ~/.zshrc
```

## Workflow

In Claude Code, say "make a solution video for LeetCode 739", or run `/leetcode-video`.

1. **Give the problem and solution.** Paste the problem and your code. If you already have a `Scripts.md`, give that instead.
2. **Draft the script.** The skill writes `Scripts.md`. It holds the problem, the solution, every scene, the narration and the dry-run step table.
3. **Edit the script.** Edit `Scripts.md` yourself or ask Claude. `scripts/validate_script.py` checks the format and the length.
4. **Generate the narration.** `scripts/make_voice.py` calls MiniMax and makes one audio file per narration line. Listen and approve the voice.
5. **Build the video.** The skill creates a Remotion project in a temp folder and animates the script.
6. **Render and check.** The skill renders both MP4s. `check_video.py` and `check_layout.py` check the length, the loudness and the centering.

At the end, your folder holds three files: `Scripts.md` and the two MP4s.

## Layout

| Path              | Contents                                                     |
| ----------------- | ------------------------------------------------------------ |
| `SKILL.md`        | The workflow Claude follows                                  |
| `reference/`      | Script format, color palette, Remotion project rules         |
| `scripts/`        | Validate the script, make narration and music, check videos  |
| `assets/project/` | Remotion project template, background music, sound effects   |
| `examples/lc739/` | Full example: script and source code                          |

## License

[MIT](LICENSE)
