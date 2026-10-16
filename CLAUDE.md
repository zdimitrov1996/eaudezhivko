@AGENTS.md

# Eau de Fragrances

Perfume collection site: users keep a collection (owned) and a wishlist, each perfume links to Fragrantica and Parfumo. The owner is non-technical and works in Bulgarian; reply to them in Bulgarian.

## Decisions (2026-10-16)

- **Ratings:** Fragrantica and Parfumo have no official API and block bots. Show links (exact page if a user pasted it, otherwise a search link) plus our own users' average rating. Don't scrape; outreach drafts are in `docs/ratings-permission-emails.md`.
- **Prices:** later phase, Bulgarian shops only, in EUR.
- **Sign-in:** email + Google only (both free). No Facebook or Apple for now.
- **Languages:** English (default) and Bulgarian, via next-intl `/en` and `/bg`.
- **Domain:** eaudefragrances.com (not bought yet). Hosting planned on Vercel.
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
