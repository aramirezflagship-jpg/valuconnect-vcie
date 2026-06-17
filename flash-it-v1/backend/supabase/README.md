# Flash-it v1 — Supabase schema

Durable Postgres persistence for the Flash-it backend. Replaces the **ephemeral
JSON file store** (`config/*.json`) that resets on every Render redeploy and
wipes accounts, events, templates, and photo records.

## Files (apply in order)

| Order | File | What it does |
|------:|------|--------------|
| 1 | `migrations/0001_init.sql` | Tables, indexes, RLS policies |
| 2 | `migrations/0002_seed.sql` | Default templates + demo/admin accounts (idempotent) |

Both are **idempotent** — safe to re-run.

## How to apply (Supabase SQL Editor)

1. Create (or open) your Supabase project at https://app.supabase.com.
2. Left sidebar → **SQL Editor** → **+ New query**.
3. Open `migrations/0001_init.sql`, copy its full contents, paste, click **Run**.
   You should see `Success. No rows returned`.
4. New query → paste `migrations/0002_seed.sql` → **Run**.
5. Verify under **Table Editor**: you should see `accounts`, `events`,
   `backgrounds`, `photos`, `password_reset_tokens`, the two `seed-*-fiesta`
   rows in `backgrounds`, and the demo + admin rows in `accounts`.

> Prefer the CLI? With the Supabase CLI linked to the project you can run
> `supabase db push` (these files follow the `supabase/migrations/NNNN_*.sql`
> convention). The SQL Editor route above needs no local tooling.

## After applying — backfill template artwork (one time)

The two seed templates are inserted with `url = NULL`. To generate + upload the
placeholder artwork and fill in the URLs (character mode needs a URL), call the
existing admin endpoint **once** after the backend is deployed with Supabase env
vars set:

```
POST https://<your-render-host>/api/backgrounds/seed
Header: X-Admin-Secret: <ADMIN_SECRET>
```

It upserts the same fixed ids (`seed-natural-fiesta`, `seed-character-fiesta`)
and populates `url` / `thumbnail_url`.

## Required environment variables (Render)

Set these on the Render service so the backend switches from the JSON store to
Supabase (the code gates on `SUPABASE_URL` being present — see
`src/services/db.js`, `src/services/supabase.js`):

| Env var | Where to find it in Supabase |
|---------|------------------------------|
| `SUPABASE_URL` | Project → **Settings → API → Project URL** |
| `SUPABASE_ANON_KEY` | Project → **Settings → API → Project API keys → `anon` `public`** |
| `SUPABASE_SERVICE_ROLE_KEY` | Project → **Settings → API → Project API keys → `service_role` `secret`** |

- The backend uses the **service-role key server-side** (it bypasses RLS and
  mediates all access). Keep it secret — never ship it to the browser.
- The `anon` key is used by `src/routes/accounts.js` for the optional
  Supabase-Auth login path.

## Auth model (important)

Flash-it runs in **local-JWT mode**: the Express backend does its own auth
(`src/services/localAuth.js`) and stores a `password_hash` + `role` on the
`accounts` row. Accounts are a **standalone table** — `accounts.id` is a plain
UUID supplied by the backend and is **not** linked to Supabase `auth.users`.
RLS is enabled on every table as a safe-by-default backstop (deny `anon`,
owner-scoped `auth.uid()` policies), but real traffic uses the service-role key
which bypasses RLS. If the project later adopts Supabase Auth, set
`accounts.id := auth.uid()` on insert and the owner policies activate with no
schema change. Full notes are in the header of `0001_init.sql`.
