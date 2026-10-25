# Gameboys Emulator — pre-deployment review
Date: 2026-10-25
**Status: draft Git objects only. No branch, tag, production configuration, GitHub Action, Vercel/Cloudflare deploy or deployed website modified.**
Parent production main: `27d170d1060b901204cfe058f3d66c8b479216a4`.

## Changes staged
- `index.html`: Preconnect to Oracle Object Storage and the existing Cloudflare Worker, reducing connection setup overhead.
- Uniquely preload intro marquee images and the first 28 game covers during intro with at most 2 mobile / 4 desktop parallel downloads; respect Save-Data, hidden tabs, and browser reuse of identical image URLs.
- Reuse a D1-confirmed public catalog cache for up to 3 minutes on repeat visits, refreshing in background.
- Avoid downloading the unused Supabase SDK in D1 mode, retaining SDK for the legacy fallback mode when disabled.
- Improve ROM transfer and game upload percentage: hold below 100% while finalization and D1 game-row commit are pending. Existing success popups remain.
- Connect actual Oracle image-XHR progress to marquee image progress bars; 95% after object verification, 96% during DB insert, 100% only after DB commit.
- Improve login network error guidance without changing authentication flow or credentials.
- `gamepad-ui.js`: prevent duplicate HUD initialization and event listeners if loaded more than once.
- No changes to emulator graphics, effects, touch mapping, save data schema, cloud sync semantics, ROM assets, upload authorization or server production secrets.

## Validation performed
- Parsed all inline scripts in both D1-active and fallback modes after decompression + runtime patches (V8 compile check).
- Checked all patch anchors are present in the staged decoded page.
- Confirmed Supabase library remains in fallback mode only.
- Checked main SHA has not changed; creating an unreferenced Git commit does not trigger a deployment.

## Still requires live integration tests before approval
- D1 database import and table completeness; Cloudflare Worker CORS and admin-secret alignment, which are not inside this repository.
- Real browser cold/repeat loading and appearance of all marquees/covers on mobile and desktop with throttled network.
- Oracle public cache headers, byte usage and actual response image sizes.
- Admin login, new/edit/remove game, image and large multipart ROM uploads, retry/cancel paths.
- Save/load, SRAM conflict resolution, favorites, presence heartbeat and gamepad/fullscreeen across engines.
- Supabase-era serverless fallback API removal is deliberately deferred until D1 migration can be verified, to preserve rollback.

**Do not deploy without explicit user approval.**
