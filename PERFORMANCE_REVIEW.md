# Gameboys Emulator: offline optimization and safety review (2026-10-25)

**Status:** draft Git commit objects only. No deployed changes, no push to main,
no branch or tag created, and no production backend or database touched.

## Updated in this review
- Singleflight admin Worker password prompt; avoids concurrent password popups.
- D1 catalogue: valid-first resolution, shorter backup race, local fallback and nonblocking optional settings; preserves existing settings on background refresh.
- Public marquee and cover image preload: prioritize visible frame, cap mobile network requests, clean stale image-load timers.
- Progress bars: image bytes, Oracle verification and D1 write use distinct percentage phases (previous changes retained).
- Gamepad: lower polling overhead and skip hidden-tab UI refresh without changing mappings.
- Presence: closing a channel now stops heartbeat and unsubscribes.
- Profile saves/favorites: reuse a recently verified lease for up to four seconds rather than calling /lease on every access, while keeping frequent lease renewals; clear stale lease state when switching codes. SRAM CAS baseline flow unchanged.
- Oracle image upload API: bounded 4-second, 32-MiB per-instance listing reuse with a 128-MiB hard headroom before the nominal 1-GiB asset ceiling, refetch under pressure, and an exact size check after writes; invalidate on delete.
- Image cache Service Worker: Oracle/same-origin public artwork only, never ROM/private/opaque responses, TTL/size/count eviction and no-cache SW script revalidation.
- Startup still preserves all animation and UI assets; music default remains 2%.
- Scripts and data paths for original emulator engine, save-state format and ROM providers retained.

## Integration tests still mandatory
1. D1 Worker has **independent** deployment and secrets: verify CORS,
   admin password compatibility and imported games/setting/save row counts.
2. Cold and repeat-page loads on Wi-Fi and 4G, especially mobile: Network waterfall
   for CDN images, Worker latency, memory and FPS while animated.
3. Image/ROM upload batches, retry/cancel, Oracle quota close to 1 GiB,
   delete/inventory invalidation and image verification.
4. Save/load SRAM conflicts on two devices and offline/online recovery.
5. Background/foreground Presence lease semantics (Worker TTL unknown here),
   screen orientation, Gamepad navigation, and 3DS/PSP/GBA/NDS engines.
6. Test old Supabase rollback mode if migration is reverted.

### Known limits
- The Cloudflare Worker code and Oracle remote objects are not included in this repository.
  Cannot certify worker auth, CORS, D1 row migration or all files' storage sizes offline.
- A per-Vercel-instance inventory cache is not a globally atomic distributed quota.
  A true global 1-GiB hard enforcement would require a shared central ledger/serialized Worker.
- Existing covers are served in their original resolution; generating responsive thumbnails
  would need a separate asset migration and metadata/data-path integration.
- Real browser timing/FPS require on-device browser testing, not syntax checks.
- Service Worker acceleration applies only to eligible readable images; opaque cross-origin
  Oracle images remain under native browser HTTP cache.
- Staged API, SW, and Vercel headers files must accompany `index.html` at release.
  Sending `index.html` alone cannot deliver those backend changes.

**No deployment without explicit user approval.**
