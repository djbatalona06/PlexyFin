# 04 — UI/UX Brief

**Feel:** dark, calm, cinematic. Like a warm living room at night: deep charcoal, one ember accent. Posters do the talking.

## Tokens
| Token | Value | Use |
|---|---|---|
| `--bg` | `#121012` | Page |
| `--surface` | `#1d1a1c` | Cards, inputs |
| `--text` | `#f3ece6` | Main text |
| `--muted` | `#a79c95` | Secondary text |
| `--accent` | `#ff8a3d` (ember) | Buttons, focus ring, progress |
| `--danger` | `#ff6b6b` | Errors |
| Radius | 10px | Cards, buttons |
| Font | system UI stack | No web-font download |

## Rules
- Poster grid: `repeat(auto-fill, minmax(140px, 1fr))`, 2:3 aspect cards, title under poster.
- **Big, visible focus ring** (3px ember outline) on every interactive element — groundwork for TV/remote use.
- Hit targets ≥ 44px. Text contrast ≥ 4.5:1.
- Progress bar on cards with a saved position.
- Empty, loading and error states for every list.
- Works from 320px phone width up to a TV.

## Couch mode (10-foot)
- Root font 125%, gap 24px, page padding `3vh 5vw` (inside TV overscan), cards `minmax(200px, 1fr)`, buttons/inputs ≥ 56px.
- Focus: 5px ember ring; focused cards/library tiles scale to 1.06 (no scaling with `prefers-reduced-motion`).
- Mini player is larger (`min(480px, 40vw)`) and sits inside the overscan margin.

## Player
- Full screen: top bar with Back, title, a pill ("Direct" / "Converted · 720p"), Quality menu, Mini player, Picture-in-picture. On phones the buttons read "Mini" / "PiP".
- Mini player: corner card with the video and ▶/❚❚, ⤢, ✕. On phones it is a slim strip (small video left, buttons right). Pages get bottom padding so it never covers the last row.
- "Up next" toast: bottom-right, ember left border, Play now / Cancel, live countdown.

## Accounts
- Round avatar with the first letter (ember on charcoal; filled ember on hover/focus). Header shows a small avatar + name (name hidden on phones).
- Sign-in code: six large digit boxes, numbered steps underneath, "Waiting for approval…".

## Brand
- Name: **Hearthreel**. Icon: an original ember/flame shape inside a rounded square (SVG in `public/icon.svg`). No reference-app assets.
- Voice: short, friendly, plain words. "Pick up where you left off", not "Resume playback session".
