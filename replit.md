# Project TMS — Sparrow AI Solutions

Transport Management System built with TanStack Start, React, Tailwind CSS, and Supabase.

## Stack
- **Framework**: TanStack Start (SSR, server functions via Nitro)
- **Routing**: TanStack Router (file-based)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS v4
- **Package manager**: Bun

## Running locally (Replit)
```
bun install
bun run dev
```
Serves on port 5000.

## Deploying to Vercel
1. Connect GitHub repo in Vercel dashboard
2. Set environment variables (see below)
3. Build command: `bun run build`
4. Output directory: `.output/public`
5. Install command: `bun install`

## Environment variables required

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → anon/publishable key |
| `SUPABASE_URL` | Same as above (server-side) |
| `SUPABASE_PUBLISHABLE_KEY` | Same as above (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key (**keep secret**) |

## Supabase schema
Run `SUPABASE_SETUP.sql` in the Supabase SQL Editor to create all tables.

## Auth
Session is localStorage-based (`admin` / `testplay`). No Supabase Auth used.

## User preferences
- Keep existing project structure; do not restructure or migrate.
