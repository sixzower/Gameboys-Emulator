# Staged Vercel usage integration
Status: **not deployed**. Add `VERCEL_API_TOKEN` to Vercel Production server-side Environment Variables to enable a verified Observability query. The optional `VERCEL_FDT_LIMIT_BYTES` must be the **actual** allowance for the same time period and scope; otherwise the dashboard shows the measured usage without a percentage or warning color. Team/project defaults refer to the connected Gameboys Emulator project, and may be overridden with `VERCEL_TEAM_ID` and `VERCEL_PROJECT_ID`.

Without a token, when Observability is unavailable on the plan, or if the upstream query schema is rejected, the dashboard displays a neutral gray empty bar and an explicit message. No estimate is presented as real. Month-to-date UTC time range is **not necessarily the Vercel billing period** and project-level transfer is **not the team-level quota**; only set a limit if it matches the queried metric's scope/time range.

Other optimizations: warmer first-page covers, no bulk hidden library canvas rasterization, origin URL caching retained, details icon removed from header only; ROM gameplay, save, intro, controls unchanged.

Review real-device speed, live Vercel query status, Cloudflare R2 quota worker, light/dark theme and admin dashboard before deploying.
