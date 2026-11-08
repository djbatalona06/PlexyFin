# 05 — Deploy

**Status (2026-11-07): staging is BLOCKED, production is out of scope (Gate 3).**

The `staging` branch is pushed to GitHub and builds cleanly, but Vercel refused to create the project:
`403 forbidden — You don't have permission to create the project` (team `vertex-supply`, tried both the
plain and the GitHub-linked create). The connected Vercel login can list projects but not create them.

## To unblock (one-time, about 2 minutes)
1. In the Vercel dashboard, team **vertex-supply** → **Add New → Project** → import `djbatalona06/PlexyFin`, name it `hearthreel`.
   Framework: Vite. Build: `npm run build`. Output: `dist`. **Don't deploy yet** if it offers.
2. Tell the session it exists. Everything below is then done for you.

## What gets configured once the project exists
| Setting | Value | Why |
|---|---|---|
| Ignored Build Step | `if [ "$VERCEL_ENV" = "production" ]; then exit 0; else exit 1; fi` | **Production lock**: no production build until Gate 3 approval |
| Env `VITE_APP_ENV` (Preview, branch `staging`) | `staging` | Shows the STAGING badge |
| Env `VITE_APP_ENV` (Production) | `production` | Used after Gate 3 |
| Staging URL | `hearthreel-git-staging-vertex-supply.vercel.app` (Vercel's stable branch URL) | Stable address for the `staging` branch |

No secrets: the app has no server keys. Users' Jellyfin tokens stay on their own devices.

## Smoke test to run on the staging URL
`APP_URL=<staging url> JF_URL=<an https Jellyfin> JF_USER=… JF_PASS=… npm run e2e` — loads, manifest valid,
service worker registers, log in, browse, search, play, resume, offline shell.
(The same checks, 29 since Session 2, already pass locally against Jellyfin 12.4; see `04-review.md`.
Add `TRANSCODE_MOVIE` and `SHORT_MOVIE` for the conversion and "Up next" checks; the account checks need `JF_USER` to be an admin.)

Note: Vercel's default Deployment Protection puts a login in front of preview URLs. Keep it on for staging,
or turn it off for that URL if someone without a Vercel account needs to test.

## Rollback plan
Staging and production are separate. If a staging deploy is bad, open the project's **Deployments** tab and
**Promote/Redeploy** the last good `staging` deployment, or `git revert` the bad commit on `staging` and push —
Vercel rebuilds automatically. Nothing else holds state: there is no database, and each user's sign-in lives in
their own browser, so a rollback cannot lose anyone's data. If a new version ever breaks the service worker,
redeploying the previous build replaces `sw.js`, and `cleanupOutdatedCaches` plus the stale-chunk reload bring
open tabs onto it.
