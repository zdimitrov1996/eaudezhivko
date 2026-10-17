@AGENTS.md

# Eau de Fragrances

Perfume collection site: users keep a collection (owned) and a wishlist, each perfume links to Parfumo and shows its Parfumo rating and notes. The owner is non-technical and works in Bulgarian; reply to them in Bulgarian.

## Decisions (2026-10-16, updated 2026-10-17)

- **Parfumo only (2026-10-17):** Fragrantica was removed from the site at the owner's request (it also returns 403 to servers via Cloudflare; never try to get around that). "Community rating" on a card is the Parfumo rating, and the card shows Parfumo's note pyramid. Both are read automatically from the saved Parfumo link (`src/lib/parfumo.server.ts`: robots.txt allows perfume pages; schema.org AggregateRating; `data-nt` t/m/b/n for top/heart/base/linear notes; note names only, not Parfumo's images; own User-Agent; redirects kept on parfumo.*). Read when a link is saved and refreshed at most weekly in the background (`refreshParfumoData`). The old `fragrantica_*` columns and `set_external_ratings` remain in the database but are unused.
- **Theme:** dark by default; the header toggle sets the `edf_theme` cookie and `data-theme="light"` on `<html>`, which swaps the colour tokens in `globals.css`. Use the theme tokens (`ink`, `smoke`, `moss`, `ember`, `veil`), never raw white/black overlays.
- **Prices:** later phase, Bulgarian shops only, in EUR.
- **Sign-in:** email + Google only (both free). No Facebook or Apple for now.
- **Languages:** English (default) and Bulgarian, via next-intl `/en` and `/bg`.
- **Domain:** eaudefragrances.com (not bought yet). Hosted on Vercel: https://eaudezhivko.vercel.app (deploys from `main`).
- **Commits** in this repo use the GitHub noreply email (set in local git config).

## Conventions

- Every user-facing string goes in both `messages/en.json` and `messages/bg.json`. Bulgarian copy uses informal "ти" and gender-neutral phrasing.
- Database changes go in a new file under `supabase/migrations/`; RLS must stay on for every table. The owner runs SQL in the Supabase SQL Editor.
- Everything except admin support sign-in uses only the publishable key (`NEXT_PUBLIC_*`) and RLS. The secret key is read from the environment in `src/lib/supabase/admin.ts` only; never put it in code or a `NEXT_PUBLIC_` variable, and never ask for it in chat.
- Without `.env.local` the site runs in preview mode (`isSupabaseConfigured` false): sample shelves, auth disabled.
- Forms that use `useActionState` submit via `submitKeepingValues` so React doesn't clear fields on errors.
- Node and gh are installed in `~/.local/bin` (no Homebrew on this Mac).

## Admin panel and feedback

- `/admin` (users, catalogue, feedback) is for rows in `public.admins`. Every `admin_*` SQL function checks `is_admin()` itself; page checks only decide what to render. Non-admins get a 404.
- Make someone admin with a one-off SQL insert in the Supabase SQL Editor. Never commit an admin's email: the repo is public.
- "Sign in as user" uses `SUPABASE_SECRET_KEY` (server-only, set on Vercel by the Supabase integration, absent locally). It's refused for admins and yourself, logged in `admin_audit_log`, and shows a support-mode banner until sign-out. Sign-out is `scope: "local"` so it never logs the user out elsewhere.
- Feedback goes through `submit_feedback` (rate-limited, honeypot in the form); the `feedback` table has RLS on and no policies.
- In PL/pgSQL, don't put `case … then … end` inside an `if … then` condition: assign it to a variable first.

## Commands

- `npm run dev` — local server on http://localhost:3000
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — checks before committing
