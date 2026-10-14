# Palette

The house color card. `Scripts.md` names colors only by these tokens, in backticks. `src/theme.ts` holds the same tokens: `C.<token>` and `SYNTAX.<name>`. To change the house style, change this table and `theme.ts` together; `validate_script.py` reads the token names from this file.

Rule: `current` is the only bright color on screen. Everything else stays low-saturation.

## Base

| Token       | Value                    | Use                                                   |
| ----------- | ------------------------ | ----------------------------------------------------- |
| `bg`        | `#0f172a`                | Background                                            |
| `panel`     | `#1e293b`                | Cards, code card, empty result cells                  |
| `border`    | `#334155`                | Card borders, axis lines                              |
| `text`      | `#e2e8f0`                | Main text                                             |
| `dim`       | `#94a3b8`                | Labels, secondary text                                |
| `current`   | `#f5b942`                | The element being processed; add a glow               |
| `waiting`   | `#3b7dd8`                | Elements held in the data structure, still waiting    |
| `solved`    | `#4f9e9a`                | Elements whose answer is known                        |
| `idle`      | `#3a4a63`                | Inactive outlines                                     |
| `barIdle`   | `#1e2a3d`                | Bars not reached yet                                  |
| `blockBg`   | `#1b2d4a`                | Fill of stack, queue and node blocks                  |
| `solvedBg`  | `#15403f`                | Fill of a solved result cell                          |
| `good`      | `#4ade80`                | ✓, the emphasized code line, conclusions              |
| `bad`       | `#f87171`                | ✗ only                                                |
| `codeHl`    | `rgba(96,165,250,0.14)`  | Background bar of the running code line               |
| `ambient`   | `rgba(59,125,216,0.08)`  | Slow background glow                                  |
| `markGold`  | `rgba(251,191,36,0.45)`  | Highlighter stroke on a problem-statement phrase      |
| `markGreen` | `rgba(74,222,128,0.35)`  | Highlighter stroke on a conclusion                    |

## Syntax

Write `syntax.*` in the script for the whole set.

| Token            | Value     | Tokens it colors                  |
| ---------------- | --------- | --------------------------------- |
| `syntax.keyword` | `#b9a3e3` | `for`, `while`, `if`, `return`, … |
| `syntax.builtin` | `#8fb3e8` | `len`, `range`, `enumerate`, …    |
| `syntax.call`    | `#9fc7d8` | Other function and method calls   |
| `syntax.number`  | `#e3a58f` | Number literals                   |
| `syntax.string`  | `#a8c99a` | String literals                   |
| `syntax.comment` | `#6b7a90` | Comments                          |
| `syntax.punct`   | `#8a97ab` | Operators and brackets            |

A new problem may need a new meaning (for example "visited"). Reuse an existing token if one fits. If none fits, ask the user before adding a token; a new token is a house-style change.
