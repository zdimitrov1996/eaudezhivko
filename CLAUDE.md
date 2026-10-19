@AGENTS.md

# Eau de Fragrances

Perfume collection site: users keep a collection (owned) and a wishlist, each perfume links to Parfumo and shows its Parfumo rating and notes. The owner is non-technical and works in Bulgarian; reply to them in Bulgarian.

## Decisions (2026-10-16, updated 2026-10-17)

- **Parfumo only (2026-10-17):** Fragrantica was removed from the site at the owner's request (it also returns 403 to servers via Cloudflare; never try to get around that). "Community rating" on a card is the Parfumo rating, and the card shows Parfumo's note pyramid. Both rating, notes, and the bottle flacon image are read automatically from the saved Parfumo link (`src/lib/parfumo.server.ts`: robots.txt allows perfume pages; schema.org AggregateRating; `data-nt` t/m/b/n for notes; `og:image`/CDN for bottle flacon; own User-Agent; redirects kept on parfumo.*). Read when a link is saved and refreshed at most weekly in the background (`refreshParfumoData`).
- **Prices / Pazaruvaj (2026-10-17):** Direct link to Pazaruvaj.com for Bulgarian market price comparison (`CategorySearch.php?st=...`). Pazaruvaj blocks server requests with 403, so cards and wishlists link users directly to live comparison results.
- **Theme:** dark by default; the header toggle sets the `edf_theme` cookie and `data-theme="light"` on `<html>`, which swaps the colour tokens in `globals.css`. Use the theme tokens (`ink`, `smoke`, `moss`, `ember`, `veil`), never raw white/black overlays.
- **Sign-in:** email + Google only (both free). No Facebook or Apple for now.
- **Languages:** English (default) and Bulgarian, via next-intl `/en` and `/bg`.
- **Domain:** eaudefragrances.com (not bought yet). Hosted on Vercel: https://eaudezhivko.vercel.app (deploys from `main`).
- **Commits** in this repo use the GitHub noreply email (set in local git config).

## Conventions

- Every user-facing string goes in both `messages/en.json` and `messages/bg.json`. Bulgarian copy uses informal "ти" and gender-neutral phrasing.
- Database changes go in a new file under `supabase/migrations/`; RLS must stay on for every table. The owner runs SQL in the Supabase SQL Editor: when a script is final, copy it to their clipboard with `LC_ALL=en_US.UTF-8 pbcopy < file.sql` and say whether to run it before or after merging. Without the UTF-8 locale pbcopy reads the file as Mac Roman and garbles letters like ô or ° (it happened once), so also keep data in SQL ASCII-only with `U&'...'` escapes.
- Everything except admin support sign-in uses only the publishable key (`NEXT_PUBLIC_*`) and RLS. The secret key is read from the environment in `src/lib/supabase/admin.ts` only; never put it in code or a `NEXT_PUBLIC_` variable, and never ask for it in chat.
- Without `.env.local` the site runs in preview mode (`isSupabaseConfigured` false): sample shelves, auth disabled.
- Forms that use `useActionState` submit via `submitKeepingValues` so React doesn't clear fields on errors.
- Node and gh are installed in `~/.local/bin` (no Homebrew on this Mac).

- Legal pages (`/privacy`, `/terms`, `/faq`) live in `src/content/legal.ts` (both languages). They describe the real data flows: when a feature, provider, cookie or admin power changes, update them and the "updated" date. `LEGAL_OWNER` holds the data controller's name and contact email, published on purpose at the owner's request.
- Bottle images are hotlinked from media.parfumo.com, so visitors' browsers contact Parfumo (IP address); the Privacy policy says so. If images start being proxied or stored by us, or new third-party embeds are added, update the legal pages.
- Only the person who added a catalogue perfume can edit it (RLS + `updatePerfume`); a changed Parfumo link clears and re-reads rating and notes.

## Admin panel and feedback

- `/admin` (users, catalogue, feedback, carousel, admins) is for rows in `public.admins`. Every `admin_*` SQL function checks `is_admin()` (or `is_owner()`) itself; page checks only decide what to render. Non-admins get a 404.
- `admins.role` is `owner` or `admin`. Only owners add and remove admins (`/admin/admins`, by the email of a confirmed account); owners can't be removed, and no admin can be impersonated or deleted from the panel. Grants and removals go to `admin_audit_log`. The first owner was made with a one-off SQL insert. Don't commit admin grants or other users' emails: the repo is public (the legal contact in `LEGAL_OWNER` is the one intentional exception).
- The homepage carousel is the `showcase` table, edited at `/admin/showcase`: admins type in brand, name, concentration and Parfumo link (add dialog, pencil to edit), and the server reads the picture and rating from Parfumo on save, then weekly when an admin opens the page. 1 to 12 entries; the table only accepts Parfumo links and pictures. `SHOWCASE` in `src/lib/showcase.ts` is the fallback when there's no database.
- "Sign in as user" uses `SUPABASE_SECRET_KEY` (server-only, set on Vercel by the Supabase integration, absent locally). It's refused for admins and yourself, logged in `admin_audit_log`, and shows a support-mode banner until sign-out. Sign-out is `scope: "local"` so it never logs the user out elsewhere.
- Feedback goes through `submit_feedback` (rate-limited, honeypot in the form); the `feedback` table has RLS on and no policies.
- In PL/pgSQL, don't put `case … then … end` inside an `if … then` condition: assign it to a variable first.

## Commands

- `npm run dev` — local server on http://localhost:3000. With the values in `.env.local` it uses the real Supabase project, so don't submit forms there while testing.
- `npm run typecheck`, `npm run lint`, `npm run test:db`, `npm run build` — the same checks GitHub runs on every PR (`.github/workflows/checks.yml`)
- `npm run test:db` runs every migration on an in-memory Postgres (PGlite) with stand-ins for Supabase's roles and `auth`, then checks who may read and change what (`supabase/tests/run.mjs`). Add checks there with every migration.

## Before every PR

1. `npm run typecheck`, `npm run lint`, `npm run test:db`, `npm run build` all pass.
2. Read the whole diff once more for bugs, security (RLS, `is_admin()`/`is_owner()` in every `admin_*` function, auth checks in server actions) and leftovers: unused code, exports, texts or files.
3. Check anything visible in the browser, phone width and both themes included.
4. Update the docs in the same PR when behaviour changes: CLAUDE.md, the legal pages, `docs/`.
