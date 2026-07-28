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
| `SESSION_SECRET` | Any long random string |

**No values are hardcoded.** All Supabase credentials come exclusively from environment variables.

## Database setup
1. Run `SUPABASE_SETUP.sql` in the Supabase SQL Editor (full canonical schema).
2. Run `SUPABASE_LOGS_SETUP.sql` to add the `app_logs` table for audit logging.
3. Default admin: **username** `admin` **password** `testplay` — change after first login via the **Users** module.

## Security features
- **No search engine indexing** — `robots.txt` blocks all crawlers; `noindex` meta tags on all pages
- **Login rate limiting** — 3 failed attempts → 5 min lockout, 4 → 10 min, 5+ → 15 min
- **Math CAPTCHA** — simple addition challenge on login, no API or registration needed
- **Honeypot field** — hidden form field catches bots automatically
- **Session auto-logout** — uses `sessionStorage` instead of `localStorage`; session clears when window/tab closes
- **Encrypted storage** — all localStorage and sessionStorage data is XOR-encrypted; not readable as plain text
- **DevTools blocking** — F12, Ctrl+Shift+I, right-click, Ctrl+U, Ctrl+S all blocked in production
- **Console suppression** — all browser console output suppressed in production builds

## Authentication
The app uses its own `app_users` table (not Supabase Auth).

## User roles
| Role | Access |
|---|---|
| **Admin** | All modules: Operations (Trip + Income + Expenditure), Masters, Settings, Users + Logs |
| **Basic user** | Operations (Trip tab shows Manifest, Expenses, Vehicle, Driver, Transporter, Contract — no Summary, no Income) + Masters (Driver & Transporter only) |

### Role-based visibility in Trip Form
- **Basic users** do NOT see: Summary tab, Other Income tab, Freight/Loading/Fixed columns in Manifest, income totals
- **Admin only**: Summary tab, Freight/Loading/Fixed manifest columns, income figures, Reopen closed trips

## Trips
- **Own vehicle**: requires Vehicle + Driver + Odometer Start + Start date/time
- **Rented (Third party)**: requires Transporter; odometer fields hidden; no vehicle/driver
- **Auto-close**: trips older than 2 days are automatically closed and archived on next load
- **Reopen**: admin-only; basic users cannot reopen closed trips

## Audit Logging (`app_logs`)
All CRUD actions (trips, users, login) are logged server-side via the service-role key.
- Admin-only **Logs** tab in the Users module shows all activity
- Filter by module: Login, Trips, Vehicles, Users, etc.
- Admin can clear all logs or filtered logs
- Logs are never accessible to anon/authenticated Supabase roles

## Modules
- **Operations** — Trips (live + closed), Income (admin only), Expenditure
- **Masters** — Vehicles, Drivers, Transporters, Locations, Contracts
- **Users** — Admin-only: user management + Activity Logs tab
- **Settings** — Company profile, branch management, theme

## User preferences
- Keep the project's existing structure and file conventions.
- All Supabase env vars must come from environment variables — never hardcode.
- Session stored in sessionStorage (auto-clears on window close).
- All localStorage/sessionStorage values are XOR-encrypted via `src/lib/storage.ts`.
