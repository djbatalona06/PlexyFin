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

## Brand
- Name: **Hearthreel**. Icon: an original ember/flame shape inside a rounded square (SVG in `public/icon.svg`). No reference-app assets.
- Voice: short, friendly, plain words. "Pick up where you left off", not "Resume playback session".
