---
name: Vercel dependency installs
description: Deployment dependency and runtime requirements for the merged TanStack/Supabase application.
---

Vercel should install this app with `npm ci --legacy-peer-deps --no-audit --no-fund`, and the project should require Node `>=22.12.0`.

**Why:** The TanStack Start and Supabase dependency versions declare Node 22 requirements, while Vercel's mutable `npm install --legacy-peer-deps` failed with npm's internal “Exit handler never called” error. A clean npm ci and the production Vercel build pass with the pinned runtime requirement.

**How to apply:** Keep `package-lock.json` authoritative for Vercel, use the deterministic install command in `vercel.json`, and republish after dependency or runtime changes.