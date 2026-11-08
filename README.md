# Hearthreel

A fast, clean web app for watching your own **Jellyfin** media server. Install it like an app on your phone, laptop or TV browser.

> Status: Session 2 — staging only. See `docs/` for the plan.

## What it does
- Sign in to your Jellyfin server (10.9 or newer)
- Browse your libraries and search
- Play videos (direct when your browser can, converted by your server when it can't)
- Pick up where you left off — progress is saved on your server
- **Keep watching while you browse**: shrink the video to a corner mini player, or use picture-in-picture
- **Couch mode** for TVs: big layout, move around with the arrow keys or a TV remote
- **Quality** menu (Original / 1080p / 720p / 480p) for slow connections, remembered per server
- **Tonight**: a watch-later shelf with one-tap *Play next* and an *Up next* countdown
- **Who's watching?**: keep several people signed in on one device and switch without passwords
- **Sign in with a code**: the TV shows 6 numbers, you approve them on your phone

## Run it on your computer
```bash
npm install
npm run dev
```
Open the address it prints (usually `http://localhost:5173`).

## Commands
| Command | What it does |
|---|---|
| `npm run dev` | Start the app for development |
| `npm run build` | Check types and build the app into `dist/` |
| `npm run preview` | Serve the built app at `http://localhost:4173` |
| `npm run lint` | Check code style |
| `npm test` | Run unit tests |
| `npm run e2e` | Click through the whole app against a real server (needs `JF_URL`, `JF_USER`, `JF_PASS`; optional `TRANSCODE_MOVIE`, `SHORT_MOVIE`; see `e2e/smoke.mjs`) |

## Connecting your server
Your server needs **HTTPS** for the hosted app, and must allow the app (it does by default). Step-by-step: [`docs/server-setup.md`](docs/server-setup.md).

## Docs
| File | What's inside |
|---|---|
| `docs/spec/01-prd.md` … `06-implementation-plan.md` | The six planning docs |
| `docs/ip-check.md` | Name and licensing checks |
| `docs/03-twist.md` | What makes Hearthreel different, and the **delta from the reference app** |
| `docs/04-review.md` | Bug review results |
| `docs/05-deploy.md` | Staging URL and how to roll back |
