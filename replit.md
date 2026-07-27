# Project TMS — Sparrow AI Solutions

A Transport Management System built with TanStack Start, React, TypeScript, Tailwind CSS and Supabase.

## Stack
- **Frontend:** React 19, TanStack Router (file-based), TanStack Query
- **Styling:** Tailwind CSS v4, shadcn/ui components
- **Backend/DB:** Supabase (Postgres + RLS)
- **Runtime:** Bun + Vite 8
- **Deploy target:** Vercel

## How to run
```sh
bun install
bun run dev      # starts Vite dev server on :5000
```

## Environment variables (required)
Set all of these in your Vercel project settings (and locally in `.env`):

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Project Settings → API → anon/publishable key |
| `SUPABASE_URL` | Same as above (used server-side) |
| `SUPABASE_PUBLISHABLE_KEY` | Same as above (used server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role key |

**No values are hardcoded.** All Supabase credentials come exclusively from environment variables.

## Database setup
1. Run `SUPABASE_SETUP.sql` once in the Supabase SQL Editor (full canonical schema).
2. If you already ran the old SQL, run only `USER_MANAGEMENT_SQL.sql` to add the new user-management tables.

## Authentication
The app uses its own `app_users` table (not Supabase Auth).  
Default admin: **username** `admin` **password** `testplay` — change after first login via the **Users** module.

## User roles
| Role | Access |
|---|---|
| **Admin** | All modules: Operations, Masters (all tabs), Settings, Users, Dashboard (soon), Reports (soon) |
| **Basic user** | Operations (trips/income/expenditure for their branches only) + Masters (Driver & Transporter tabs only, branch-filtered) |

Branch assignment for basic users is managed in the **Users** module (admin only).

## Modules
- **Operations** — Trips (live + closed with inline detail view), Income, Expenditure
- **Masters** — Vehicles, Drivers, Transporters, Locations, Contracts
- **Users** — Admin-only user management with role and branch assignment
- **Settings** — Company profile, branch management, theme

## User preferences
- Keep the project's existing structure and file conventions.
- All Supabase env vars must come from environment variables — never hardcode.
