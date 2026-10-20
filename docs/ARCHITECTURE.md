# Architecture

Developer reference for Eau de Fragrances. The owner's guide, in Bulgarian, is [guide-bg.md](guide-bg.md); first-time Supabase and Google setup is [SETUP.md](SETUP.md); working rules for whoever edits the code are in `CLAUDE.md`.

This document describes the code as it is. Any PR that changes behaviour updates it, and the owner's guide, in the same PR.

---

## 1. Stack

| Layer | What | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 | Next 16 renames middleware to **proxy** (`src/proxy.ts`). Read `node_modules/next/dist/docs/` before writing Next code (see `AGENTS.md`). |
| Styling | Tailwind CSS 4 | Theme tokens in `src/app/globals.css` (`@theme`). |
| i18n | next-intl 4 | Locales `en` (default) and `bg`. |
| Backend | Supabase: Postgres with Row Level Security, Auth | `@supabase/ssr` for cookie sessions, `@supabase/supabase-js` for the admin client. |
| Hosting | Vercel | Production deploys from `main`: https://eaudezhivko.vercel.app |
| Runtime | Node ≥ 24 | |

There is no separate API server: pages are React Server Components and every mutation is a Server Action in `src/actions/`.

## 2. Folder structure

```
src/
  proxy.ts                 locale routing (next-intl) + Supabase session refresh
  app/
    layout.tsx             imports globals.css; the real <html> is in [locale]/layout.tsx
    globals.css            colour tokens (dark + light), base styles, .btn/.card/.field
    icon.svg               favicon (/favicon.ico is rewritten to it in next.config.ts)
    not-found.tsx          404 outside any locale
    auth/callback/         exchanges a ?code= (Google, email links, password reset)
    auth/confirm/          verifies a ?token_hash= (email templates in SETUP.md)
    [locale]/
      layout.tsx           <html lang data-theme>, Header, Footer, FeedbackButton
      page.tsx             home: hero + carousel + feature cards
      collection/ wishlist/ finished/   the user's three shelves
      login/ signup/ forgot-password/ reset-password/ account/
      faq/ privacy/ terms/ legal pages, text from src/content/legal.ts
      admin/               overview + users, users/[id], perfumes, feedback, showcase, admins
      [...rest]/           unknown paths → localized 404
  actions/
    auth.ts                sign in/up, Google, password reset, sign out, delete account
    perfumes.ts            search, add, move, rate, remove, edit, Parfumo link + refresh
    feedback.ts            submitFeedback
    admin.ts               support sign-in, delete user, feedback status and deletion, carousel, admins
  components/              UI; perfumes/, auth/, admin/, home/ subfolders. Modal is the one dialog
                           shell; perfumes/ShelfPage serves all three shelf pages
  content/legal.ts         Privacy, Terms, FAQ in both languages; LEGAL_OWNER
  i18n/                    routing (locales, plus a helper that picks this locale's value or
                           the default's), request config, typed navigation
  lib/
    perfumes.ts            shared types, NO_IMAGE_URL, Parfumo URL validation, Parfumo and Pazaruvaj links
    parfumo.server.ts      reads a Parfumo page: rating, notes, image
    shelf.server.ts        reads a shelf; row → Perfume mapping (PERFUME_COLUMNS)
    showcase.ts            carousel type, built-in SHOWCASE list, SHOWCASE_MAX
    showcase.server.ts     reads the carousel table; the home page's fallback
    admin.server.ts        isAdmin/isOwner/requireAdmin and admin data loaders
    sample-shelf.ts        example perfumes for preview mode
    supabase/              config, server client, proxy client, admin (secret key) client
    theme.ts, impersonation.ts, feedback.ts, site-url.ts
messages/en.json, bg.json  every UI string (legal texts excepted)
supabase/migrations/       schema, RLS, SQL functions; run by hand in order
supabase/tests/run.mjs     database tests (`npm run test:db`)
.github/workflows/checks.yml  typecheck, lint, database tests, build on every PR and on main
docs/                      this file, the owner's guide, setup guide, Parfumo letter draft
```

## 3. Request flow

1. `src/proxy.ts` runs on every path except `/api`, `/_next`, `/_vercel` and files with an extension. Paths under `/auth/` skip locale routing; everything else goes through next-intl's middleware, which handles the `/en` or `/bg` prefix and its `NEXT_LOCALE` cookie. Both then pass through `updateSession` (`lib/supabase/proxy.ts`), which calls `supabase.auth.getClaims()` to validate and refresh the session cookie.
2. `[locale]/layout.tsx` rejects unknown locales, reads the theme cookie and renders the shell.
3. Server Components read data with the cookie-bound client from `lib/supabase/server.ts` (`createClient`). `getCurrentUser()` (cached per request) returns `{ id, email }` from the JWT claims, or null.
4. Server Actions use the same client, so every query runs as the signed-in user (or `anon`) and RLS decides what it may touch.

Three Supabase clients exist:

| Client | File | Key | Used for |
| --- | --- | --- | --- |
| Server | `lib/supabase/server.ts` | publishable | Pages and actions |
| Proxy | `lib/supabase/proxy.ts` | publishable | Session refresh in `proxy.ts` |
| Admin | `lib/supabase/admin.ts` | secret (`SUPABASE_SECRET_KEY`, falls back to `SUPABASE_SERVICE_ROLE_KEY`) | Only `impersonateUser`, after the caller is checked to be an admin |

## 4. Data model

All tables live in `public` and have RLS enabled. Users are Supabase's `auth.users`.

### Tables

**`perfumes`**: the shared catalogue.

| Column | Notes |
| --- | --- |
| `id` | uuid |
| `brand`, `name` | 1–100 and 1–150 characters |
| `concentration` | `extrait`, `parfum`, `edp`, `edt`, `edc`, `eau_fraiche`, `other`, or null |
| `release_year` | 1700–2100 or null |
| `parfumo_url` | must match `https://(sub.)parfumo.<tld>/…` |
| `parfumo_rating` | numeric(3,1), 0–10, read from Parfumo |
| `parfumo_notes` | jsonb object ≤ 8000 bytes: `{top, heart, base}` arrays, or `{notes}` for perfumes without a pyramid; `{}` means "read, none listed" |
| `image_url` | a Parfumo-hosted `https://` picture or the no-image marker, nothing else (section 6) |
| `ratings_updated_at` | when Parfumo was last read; null means "read again" |
| `created_by` | defaults to `auth.uid()`; set null when that user is deleted |
| `created_at`, `updated_at` | `updated_at` maintained by the `set_updated_at` trigger |
| `fragrantica_url`, `fragrantica_rating`, `ratings_updated_by` | legacy, unused since Fragrantica was dropped (section 14) |

A unique index on `(lower(brand), lower(name), coalesce(concentration, ''))` keeps one entry per perfume. A trigram GIN index on `brand || ' ' || name` backs `search_perfumes`. Nothing deletes catalogue rows: there is no delete grant or policy.

**`user_perfumes`**: one row per perfume on a user's shelf. `user_id` (default `auth.uid()`, cascades on user delete), `perfume_id` (cascades), `shelf` (enum `collection` | `wishlist` | `finished`), `rating` (1–10, personal), `fill_level` (0–100 in steps of 10, null when not set; kept on collection bottles only), `notes` (≤ 2000 chars; not used by the UI), timestamps. `unique (user_id, perfume_id)`: a perfume sits on one shelf at a time, and moving it updates `shelf`.

**`admins`**: who may open `/admin`. `user_id` (PK, cascades), `role` (`owner` | `admin`, default `admin`), `added_by`, `created_at`.

**`admin_audit_log`**: `admin_id`, `admin_email` (snapshot), `action` (`impersonate`, `delete_user`, `grant_admin`, `revoke_admin`), `target_user_id` (no FK, survives deletion), `target_email` (snapshot), `created_at`.

**`feedback`**: `user_id` (null for guests; set null on user delete), `category` (`idea` | `bug` | `other`), `message` (5–2000), `contact_email`, `page`, `locale`, `user_agent`, `status` (`new` | `done`), `created_at`.

**`showcase`**: the home carousel, independent of the catalogue. `id`, `position`, `brand`, `name`, `concentration`, `parfumo_url` (required, Parfumo only), `image_url` (required, a Parfumo host, never the no-image marker), `parfumo_rating`, `parfumo_read_at` (when Parfumo was last read), `updated_by`, `created_at`.

### RLS and grants

| Table | anon | authenticated | Writes |
| --- | --- | --- | --- |
| `perfumes` | select all | select all; insert with `created_by = auth.uid()`; update only rows they created | No delete. Parfumo fields are written through `set_parfumo_data`, links filled through `fill_perfume_links` |
| `user_perfumes` | none | select/insert/update/delete own rows (`user_id = auth.uid()`) | |
| `showcase` | select all | select all | Only through `admin_showcase_*` |
| `admins` | none | none | RLS on, no policies, all privileges revoked. Only security-definer functions touch it |
| `admin_audit_log` | none | none | Same; written by the admin functions that log |
| `feedback` | none | none | Same; written by `submit_feedback`, read by `admin_feedback` |

### SQL functions

All are `security definer` with `set search_path = ''` unless noted. "Grant" is who may execute; "Check" is what the function itself verifies.

| Function | Grant | Check | Purpose | Called from |
| --- | --- | --- | --- | --- |
| `search_perfumes(q)` | anon, authenticated | none (security invoker; RLS applies) | Every word of `q` (≥ 2 chars) must appear in "brand name"; ordered by trigram similarity; 10 rows | Add dialog, admin carousel search |
| `fill_perfume_links(id, fragrantica, parfumo)` | authenticated | signed in | Sets a link only where it is null; never overwrites | `addPerfume`, `addParfumoLink` |
| `set_parfumo_data(id, rating, notes, image_url)` | authenticated | signed in; rating 0–10 | Saves what was read from Parfumo. A null argument keeps the old value; always sets `ratings_updated_at = now()` | `saveParfumoData` in `actions/perfumes.ts` |
| `remove_missing_parfumo_link(id, parfumo_url)` | authenticated | signed in; only while the perfume still has that link | Clears `parfumo_url`, rating, notes and picture of a link Parfumo has no perfume for; stamps `ratings_updated_at/_by`. Like `set_parfumo_data`, any signed-in user could call it directly; the damage is a link anyone can add again | `syncParfumo` |
| `delete_my_account()` | authenticated | signed in | Deletes the caller from `auth.users`; shelves cascade | `deleteAccount` |
| `submit_feedback(…)` | anon, authenticated | rate limit: 5 per 10 min per user, 20 per 10 min for all guests together (`hint = 'rate_limited'`) | Inserts a feedback row, trimming and truncating fields | `submitFeedback` |
| `is_admin()` | authenticated | | True when the caller has an `admins` row | `isAdmin()`, every `admin_*` function |
| `is_owner()` | authenticated | | True when the caller's role is `owner` | `isOwner()`, grant/revoke |
| `admin_overview()` | authenticated | `is_admin()` | Seven counters for the overview tiles | `/admin` |
| `admin_users(search, user_id)` | authenticated | `is_admin()` | Users with sign-in data, shelf counts, admin flag; email search; 500 newest | `/admin`, `/admin/users/[id]` |
| `admin_user_shelves(user_id)` | authenticated | `is_admin()` | One user's shelf entries with perfume details | `/admin/users/[id]` |
| `admin_perfumes()` | authenticated | `is_admin()` | Catalogue with collectors, wishers, average personal rating, creator email; 1000 rows by popularity | `/admin/perfumes` |
| `admin_recent_actions()` | authenticated | `is_admin()` | Last 50 audit log rows | `/admin` |
| `admin_begin_impersonation(user_id)` | authenticated | `is_admin()`; not yourself; not an admin | Logs `impersonate` and returns the target's email | `impersonateUser` |
| `admin_delete_user(user_id)` | authenticated | `is_admin()`; not yourself; not an admin | Logs `delete_user`, deletes from `auth.users` | `deleteUserAsAdmin` |
| `admin_feedback()` | authenticated | `is_admin()` | Feedback with the sender's email; new first; 500 rows | `/admin/feedback` |
| `admin_set_feedback_status(id, status)` | authenticated | `is_admin()` | Sets `new` or `done` | `setFeedbackStatus` |
| `admin_delete_feedback(id)` | authenticated | `is_admin()` | Deletes the message for good; not logged | `deleteFeedback` |
| `admin_list_admins()` | authenticated | `is_admin()` | Owners first, then admins by date added, with who added them | `/admin/admins`, owner's view of `/admin/users/[id]` |
| `admin_grant_admin(email)` | authenticated | `is_owner()`; user exists; email confirmed; not already admin | Inserts role `admin`, logs `grant_admin` | `grantAdmin`, `grantAdminToUser` |
| `admin_revoke_admin(user_id)` | authenticated | `is_owner()`; target is an admin; not an owner | Deletes the row, logs `revoke_admin` | `revokeAdmin` |
| `admin_showcase_save(id, brand, name, concentration, parfumo_url, image_url, rating)` | authenticated | `is_admin()`; fewer than 12 slides when adding; the id exists when editing | With a null id, appends a slide; otherwise edits it. Stamps `parfumo_read_at` and `updated_by`. The app passes the picture and rating it has just read | Carousel dialog save, weekly carousel refresh |
| `admin_showcase_remove(id)` | authenticated | `is_admin()`; more than 1 slide | Deletes the slide | Carousel "Remove" |
| `admin_showcase_move(id, offset)` | authenticated | `is_admin()` | Swaps position with the previous (`offset < 0`) or next slide | Carousel arrows |
| `perfume_stats(ids)` | anon, authenticated | | Aggregate collectors, wishers and average personal rating per perfume | Unused |
| `set_external_ratings(…)` | authenticated | signed in | Legacy manual Fragrantica/Parfumo ratings | Unused |
| `set_updated_at()` | trigger | | Keeps `updated_at` current on `perfumes` and `user_perfumes` | Triggers |

Error codes the app maps to messages: `42501` not authorized, `P0002` not found, `55000` email not confirmed, `23505` already exists, `54000` carousel full, `23514` last slide.

## 5. Auth and roles

**Sign-in methods:** email + password (minimum 8 characters) and Google OAuth, both through Supabase Auth. No other providers.

- Sign-up passes `emailRedirectTo = <site>/auth/callback?next=/<locale>/collection`. If Supabase has email confirmation off, the user is signed in straight away.
- Google: `signInWithOAuth` → Google → Supabase → `/auth/callback?code=…&next=…`, which exchanges the code for a session.
- Password reset: `resetPasswordForEmail` with `redirectTo = /auth/callback?next=/<locale>/reset-password`. The response never reveals whether an account exists. `/auth/confirm` handles the `token_hash` links from the custom email templates in SETUP.md, which work in any browser.
- `next` parameters go through `safeNextPath`, which resolves the path against a dummy origin and falls back unless the origin is unchanged, so redirects stay on-site (`//host`, `/\host` and paths with tabs or newlines included). `getSiteUrl()` uses `NEXT_PUBLIC_SITE_URL` when set, otherwise the request's host.
- Sign-out uses `scope: "local"` and clears the support-mode cookie.
- Account deletion calls `delete_my_account()`. Shelves cascade; catalogue entries stay with `created_by = null`; feedback stays with `user_id = null`.

**Shelves:** a collection card has a "Bottle" select (`FILL_LEVELS`). `setFillLevel` stores it on collection rows only; 0 also sets `shelf = finished`. The finished page (third link in the header; on phones the header links drop their icons to fit) shows those cards greyed out, with "Move to wishlist" and "Back to collection"; it has no "Add perfume" button. `moveEntry` only moves to collection or wishlist and clears `fill_level`. Adding a perfume that sits on the finished shelf answers `alreadyFinished`. Admin counts (`admin_overview`, `admin_users`, `perfume_stats`) still count collection and wishlist only; the admin user page lists all three shelves.

**Pages:** collection, wishlist, finished and account redirect guests to `/login?next=…`. Login and signup redirect signed-in users away.

**Admin and owner:**

- An admin is a row in `public.admins`; `role` is `owner` or `admin`.
- `requireAdmin(locale, path)` in `lib/admin.server.ts` sends guests to login and calls `notFound()` for signed-in non-admins, so the panel looks like a 404. Admin pages set `robots: noindex`.
- `isAdmin()` and `isOwner()` only decide what to render. The real check is inside every SQL function, so a missed page check can't leak data.
- Admins: see all users, shelves, the catalogue and feedback; impersonate and delete non-admin users; mark and delete feedback; edit the carousel.
- Owners: everything an admin can, plus add admins (by the email of a confirmed account) and remove admins. Owners can't be removed from the panel, and the panel can't create owners.
- The first owner was created with a one-off SQL insert. The showcase migration turned every admin that existed then into an owner.
- Don't commit admin grants or other users' emails: the repository is public.

**Support mode (sign in as a user)** — `impersonateUser` in `actions/admin.ts`:

1. Checks `isAdmin()` and that the secret key is configured (`isAdminApiConfigured`; it isn't locally, so the button is disabled with a hint).
2. Calls `admin_begin_impersonation`, which refuses yourself and admins and writes the audit log.
3. Generates a magic-link token for the target with the admin client (no email is sent), signs the admin out locally, and verifies the token, which signs the browser in as the target.
4. Sets the `edf_support_session` cookie (httpOnly, 4 hours) to the target's id and redirects to `/collection`.

`SupportBanner` in the header shows while that cookie matches the signed-in user, with an exit button that signs out. The session itself doesn't expire with the cookie: after 4 hours the banner disappears but the browser is still signed in as the target until sign-out.

**Audit log:** `impersonate`, `delete_user`, `grant_admin` and `revoke_admin` are written by the SQL functions, never by app code. The last 50 show on `/admin` as "Recent admin actions". Nothing in the app deletes or edits entries.

## 6. Parfumo

`lib/parfumo.server.ts` reads a perfume's public Parfumo page. Parfumo's robots.txt allows perfume pages. Fragrantica was removed at the owner's request and blocks servers anyway; don't try to get around that.

**Fetching** (`fetchParfumoData`):

- URLs are normalised by `normalizeParfumoUrl`: http or https (rewritten to https), host must be `parfumo.<tld>` or a subdomain, the path must be a perfume's own page (`/Perfumes/<brand>/<perfume>`, or `/Parfums/…` on parfumo.de; a trailing `/` is dropped, since Parfumo answers it with a 404), hash dropped. The same check validates links users paste.
- Own User-Agent `EauDeFragrances/1.0 (+https://eaudezhivko.vercel.app)`, 6 s timeout, `cache: "no-store"`.
- Redirects are followed by hand (at most 2), and each hop must stay on Parfumo.
- Returns **`"missing"`** when Parfumo has no perfume at the address: the link (or a redirect) isn't a perfume page, a 404/410, or the page Parfumo shows for an unknown perfume under a real brand (e.g. `/Perfumes/Dior/sauvage`). That page has an empty perfume name in its `<h1 itemprop="name">` and shows a random perfume, a different one on every visit; `isMissingPerfumePage` only counts a heading it finds empty, so a markup change can't make good links look missing.
- Returns null on any other failure, when the page yields no rating, notes or image, or when the bottle picture's file name doesn't contain the link's brand (`pictureMatchesBrand`). Parfumo sometimes serves a real perfume page with another perfume's picture, notes and rating (seen on 2026-10-20 from a network it seems to take for a robot; the title stays right). Picture names end with the brand (`…-sauvage-eau-de-toilette-dior_1200.jpg`), so a mismatch marks the whole page as untrustworthy and nothing is saved. Don't try to get around that treatment (other User-Agents, proxies): it's Parfumo's call.

**Parsing:**

- Rating: schema.org `AggregateRating` (`itemprop="ratingValue"`, scaled by `bestRating`), rounded to one decimal, 0–10.
- Notes: elements with `data-nt` = `t` (top), `m` (heart), `b` (base), `n` (flat list). Note names only (Parfumo's note images aren't used), de-duplicated, at most 30 per layer.
- Image: the main bottle image (`p-main-img` or `itemprop="image"`), else a Parfumo CDN `/perfumes/` image, else `og:image` / `twitter:image`. The host must end in `parfumo.<tld>`; the URL is forced to https. The database itself accepts only a Parfumo-hosted picture or the no-image marker in `perfumes.image_url`, because signed-in users can write that column (on entries they created, and through `set_parfumo_data` on any entry).

**Saving** (`syncParfumo` in `actions/perfumes.ts`; `saveParfumoData` does the write) calls `set_parfumo_data` with:

- the rating, or null (keeps the old one);
- the notes, or `{}` when none were found, meaning "read, nothing listed";
- the image URL, or **`NO_IMAGE_URL`** (`https://parfumo.com/no-image`) when the page has no picture.

The no-image marker exists so a perfume without a Parfumo picture isn't re-read on every visit. Everything that shows a picture treats the marker as "no picture": cards show the brand's initial, and the carousel table refuses it. A later read that finds no picture or no notes stores the marker or `{}` in place of what was there.

**Links that lead to no perfume:** a new link is read before it's saved (`readNewParfumoLink`), in `addPerfume`, `addParfumoLink` and `updatePerfume` (when the link changes). `"missing"` refuses it with the `parfumoNotFound` error; otherwise what was read is handed to `syncParfumoIfDue`, so the page isn't fetched twice. When a later read of a saved link returns `"missing"`, `syncParfumo` calls `remove_missing_parfumo_link`, which clears the link with its rating, notes and picture; the card then offers "Add Parfumo link" again and its Parfumo button searches by name.

**When it's read:**

- When a perfume goes on a shelf, when "Add Parfumo link" is used on a card, and when the edit dialog changes the link. Each calls `syncParfumoIfDue`, which reads the page only if `needsParfumoRefresh` says so.
- In the background: `ShelfView` renders `RatingsRefresher` with the perfumes that `needsParfumoRefresh` flags. That client component calls the `refreshParfumoData` server action, which takes the first 6 ids it's given, re-checks which are due, reads those, and returns how many changed. If any did, the page refreshes, which hands the next batch to the refresher. Home-page visitors never trigger a read. The carousel keeps its own copy of picture and rating and refreshes it separately (section 8).
- `needsParfumoRefresh` is true when a perfume has a Parfumo link and either notes are null, `ratings_updated_at` is null, the image is missing, or the last read was more than `PARFUMO_REFRESH_DAYS` (7) days ago.

There is no cron: a perfume is re-read only when someone opens a shelf that holds it and its data is due.

**Editing:** only the creator can edit a catalogue perfume (RLS update policy, and `updatePerfume` checks `created_by` too). When the Parfumo link changes, the new link is checked first (see above), then rating, notes, `image_url` and `ratings_updated_at` are cleared and the new page's data is saved.

**Images are hotlinked** from media.parfumo.com with `referrerPolicy="no-referrer"`; nothing is proxied or stored. Visitors' browsers therefore contact Parfumo, which the Privacy policy states. If that changes, update the legal pages (section 11).

**Links:** `parfumoLink()` returns the stored page, or a Parfumo search (`s_perfumes_x.php?in=1&filter=<brand name>`) when there's no link.

## 7. Pazaruvaj

`pazaruvajSearchUrl()` in `lib/perfumes.ts` builds `https://www.pazaruvaj.com/CategorySearch.php?st=<brand name>`. Pazaruvaj answers server requests with 403, so the site never fetches prices: every card has a "Pazaruvaj" button, and wishlist cards also show "Best price in Bulgaria: check on Pazaruvaj". Both open the search in a new tab.

## 8. Home page carousel

The carousel has its own table, `showcase`, separate from the catalogue: each slide stores its own brand, name, concentration, Parfumo link, picture and rating. Changing a catalogue perfume never touches a slide, and a slide needs no catalogue entry.

- **Home page:** reads `showcase` ordered by `position`. When Supabase isn't configured, the read fails, or the table is empty, it shows `SHOWCASE` from `lib/showcase.ts`: eight built-in perfumes with Parfumo links and CDN images.
- **Admin page `/admin/showcase`:** lists the slides with picture, concentration and rating. "Add perfume" opens a dialog with brand, name, concentration (optional) and Parfumo link (required); the pencil on a row opens the same dialog filled in. Arrows swap a slide with its neighbour; "Remove" asks first. "Add" is disabled at 12 slides and "Remove" at 1.
- **Saving** (add or edit): the server validates the link, reads the Parfumo page (section 6), and refuses the save when Parfumo has no perfume at the link, when the page can't be read, or when it has no bottle picture, each with its own message. Otherwise it calls `admin_showcase_save` with the picture and rating it read, so every save re-reads the page, whether or not the link changed.
- **Weekly refresh:** opening the admin page hands every slide to the refresher, and the server re-reads those not read for `PARFUMO_REFRESH_DAYS` (7) days. If the page now lacks a picture or rating, the old one is kept; if it can't be read or Parfumo no longer has the perfume, the slide is left as is. Visitors to the home page never trigger a read.
- **Limits:** 1 to `SHOWCASE_MAX` (12). The SQL functions enforce both ends. The table's checks accept only Parfumo links and Parfumo-hosted pictures, and never the no-image marker.
- **History:** PR #12 started the carousel as `showcase_perfumes`, a list of catalogue perfumes seeded with the same eight. PR #14 copied those slides into `showcase` and dropped the old table and its functions. The eight perfumes that seed added to the catalogue (with `created_by = null`, so nobody can edit them in the app) are still there.
- **`PerfumeShowcase`** (client): scroll-snap track, autoplay every 5 s that pauses on hover and focus, respects `prefers-reduced-motion`, pause/play, arrows, thumbnails. Each slide links to its Parfumo page and the credit line names Parfumo. Changes in the admin page revalidate the home page.

## 9. Feedback

`FeedbackButton` is rendered by the locale layout on every page except `/admin/*`. The form sends category, message, the current path and (for guests only) an optional contact email; the server adds locale and user agent. A hidden `website` field is a honeypot: when filled, the action reports success and stores nothing. `submit_feedback` rate-limits and inserts. Admins read, mark and delete it ("Delete" asks for confirmation) at `/admin/feedback`, and the overview tile counts `new` items.

## 10. i18n, theming, preview mode

**i18n:** `src/i18n/routing.ts` defines `en` (default) and `bg`. Every page is under `/<locale>/…`. Strings are in `messages/en.json` and `messages/bg.json`, and every user-facing string goes in both. Bulgarian copy uses informal "ти" and gender-neutral phrasing. Dates are formatted in `Europe/Sofia` (`i18n/request.ts`). `LocaleSwitcher` keeps the path and query when switching. Legal texts are the exception: they live in `src/content/legal.ts`, not in `messages/`, and pages pick the current locale's version (the default's for an unknown locale).

**Theme:** dark by default. `ThemeToggle` sets the `edf_theme` cookie (1 year) and `data-theme` on `<html>`; the layout reads the cookie on the server, so there's no flash. `globals.css` defines the tokens `ink`, `smoke`, `moss`, `ember`, `veil`, `stage` in `@theme` and overrides them under `:root[data-theme="light"]`. Use those tokens, never raw white or black overlays.

**Preview mode:** without `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `isSupabaseConfigured` is false:

- collection, wishlist and finished show read-only sample shelves (`lib/sample-shelf.ts`) with a banner;
- the home carousel shows `SHOWCASE`;
- auth, perfume and feedback actions return `notConfigured`; there's no signed-in user, so `/account` and `/admin` redirect to login.

**Other cookies:** Supabase's session cookies, `NEXT_LOCALE` (next-intl) and `edf_support_session` (section 5).

**Dialogs and forms:** every dialog (add perfume, edit perfume, Parfumo link, feedback, carousel) uses one `Modal` component: a trigger button, a title, a close button, and a body that remounts on close, which clears unsaved input and old results. Forms that use `useActionState` submit through `submitKeepingValues`, so a failed submission keeps what the user typed. Destructive buttons use `ConfirmSubmit` (a `window.confirm` before submit).

## 11. Legal pages and the features they describe

`/privacy`, `/terms` and `/faq` render `src/content/legal.ts` (both languages). They describe what the site actually does, so a change to any of the following must update them, in both languages, along with the `UPDATED` date:

| Feature in code | Where the legal text describes it |
| --- | --- |
| Data collected: account, Google profile, shelves, catalogue `created_by`, feedback fields (`page`, `locale`, `user_agent`, `contact_email`) | Privacy §2 |
| Processors: Supabase (EU, Frankfurt), Vercel, Google | Privacy §4 |
| Admin powers: viewing users, shelves and feedback; deleting feedback; support mode; deleting accounts; granting and removing admins; the audit log | Privacy §5, Terms §6, FAQ "Who can see my collection?" |
| Parfumo reading (rating, notes, image address; weekly), hotlinked images, Pazaruvaj links | Privacy §6, Terms §5, FAQ |
| Cookies: Supabase session, `NEXT_LOCALE`, `edf_theme` (1 year), `edf_support_session` (4 hours) | Privacy §7 |
| Account deletion and what survives it | Privacy §8 and §9, Terms §2, FAQ |
| Shared catalogue and who can edit entries | Terms §4, FAQ |

`LEGAL_OWNER` holds the data controller's name and email, published on purpose at the owner's request. The footer disclaimer (not affiliated with Parfumo or Pazaruvaj) is in `messages/*.json`.

## 12. Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`, Vercel | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local`, Vercel | Publishable key (public; RLS protects data) |
| `NEXT_PUBLIC_SITE_URL` | optional | Absolute site URL for auth redirect links; falls back to the request host |
| `SUPABASE_SECRET_KEY` | Vercel only (set by the Supabase integration) | Server-only, read in `lib/supabase/admin.ts` for support mode. Never give it a `NEXT_PUBLIC_` prefix, never put it in code, never ask for it in chat |

`.env.example` lists the public ones. Everything except support mode works with the publishable key and RLS alone. There is one Supabase project: with `.env.local` filled in, `npm run dev` reads and writes the live data, so don't submit test forms there.

## 13. Migrations and deploy

### Migrations

Files in `supabase/migrations/` are run by hand in Supabase → SQL Editor, once each, in filename order. The repository has no Supabase CLI config and the database keeps no record of which files ran: each file's header names the one it must follow, and PR descriptions say when to run it.

Production received them in this order, each before the code that needed it was merged (per the PR descriptions). Number 8 arrives with PR #14, number 9 with PR #16, number 10 with PR #18, number 11 with PR #19 and number 12 with PR #20:

| # | File | Introduced by | What it does |
| --- | --- | --- | --- |
| 1 | `20261016000000_init.sql` | Phase 1 | `perfumes`, `user_perfumes`, RLS, `search_perfumes`, `perfume_stats`, `fill_perfume_links`, `delete_my_account` |
| 2 | `20261016190000_admin.sql` | PR #2 | `admins`, `is_admin`, overview, users, shelves, catalogue, `admin_audit_log`, impersonation, user deletion |
| 3 | `20261016200000_feedback.sql` | PR #2 | `feedback`, `submit_feedback`, admin feedback functions; `admin_overview` gains `new_feedback` |
| 4 | `20261017100000_external_ratings.sql` | PR #3 | `fragrantica_rating`, `parfumo_rating`, `ratings_updated_at/_by`, `set_external_ratings` |
| 5 | `20261017140000_parfumo_notes.sql` | PR #7 | `parfumo_notes`, `set_parfumo_data` (3 arguments) |
| 6 | `20261017150000_perfume_image.sql` | commit "Add Parfumo bottle images…" | `image_url`; `set_parfumo_data` replaced by the 4-argument version; perfumes with a link but no image are queued for a re-read |
| 7 | `20261019120000_showcase_and_admins.sql` | PR #12 | `admins.role` and `added_by` (existing admins become owners), `is_owner`, audit actions `grant_admin`/`revoke_admin`, admin list/grant/revoke, the first carousel table (`showcase_perfumes`) and its 8-perfume seed |
| 8 | `20261019160000_showcase_own_entries.sql` | PR #14 | `showcase` with its own brand, name, link, picture and rating; copies the existing slides; drops `showcase_perfumes` and its functions; `admin_showcase_save`, `admin_showcase_remove`, `admin_showcase_move`. Run right before merging PR #14 |
| 9 | `20261019170000_parfumo_images_only.sql` | PR #16 | Clears any `perfumes.image_url` that isn't a Parfumo picture or the no-image marker (and its `ratings_updated_at`, so it's read again), then makes the column accept only those |
| 10 | `20261020120000_missing_parfumo_links.sql` | PR #18 | `remove_missing_parfumo_link`; queues every perfume with a link for a re-read, so broken links are found on the next shelf visit |
| 11 | `20261020140000_feedback_delete.sql` | PR #19 | `admin_delete_feedback` |
| 12 | `20261020160000_finished_shelf.sql` | PR #20 | `shelf` enum gains `finished` (unused in the same script: Postgres only allows a new enum value after commit); `user_perfumes.fill_level` |

**Adding a migration:** create a new timestamped file, never edit an applied one. Keep RLS on for every new table; give admin functions an `is_admin()` or `is_owner()` check of their own; `revoke … from public, anon` and grant only what's needed. In PL/pgSQL, assign a `case … end` to a variable rather than putting it inside an `if` condition. Add checks for it to `supabase/tests/run.mjs`. When the script is final, copy it to the owner's clipboard (`pbcopy < file.sql`) and say in the PR whether to run it before or after merging (usually before, since new code reads new columns).

### Deploy

- Work happens on a branch and goes to `main` through a PR. Vercel builds and deploys `main` to https://eaudezhivko.vercel.app.
- Checks: `npm run typecheck`, `npm run lint`, `npm run test:db`, `npm run build`. GitHub runs the same four on every pull request and on pushes to `main` (`.github/workflows/checks.yml`); the build there runs without Supabase settings, in preview mode.
- `npm run test:db` runs every migration, in order, on an in-memory Postgres (PGlite) with stand-ins for Supabase's roles and `auth.uid()`, then checks who may read and change what. It exits 1 on a failure. There are no UI tests.
- Commits use the GitHub noreply email (local git config).
- The domain eaudefragrances.com isn't bought yet. When it is, update Supabase's Site URL and redirect URLs, Google's authorized origins (see SETUP.md), `NEXT_PUBLIC_SITE_URL`, and the legal texts that name the address.

## 14. Legacy and known gaps

- Fragrantica leftovers: `perfumes.fragrantica_url`, `fragrantica_rating`, `ratings_updated_by`, the `set_external_ratings` function, and `fill_perfume_links`' Fragrantica argument (the app always passes `""`). Unused, kept to avoid a destructive migration.
- `perfume_stats` and `user_perfumes.notes` are unused.
- Terms §4 says administrators can correct or remove catalogue entries, but the admin catalogue is read-only and there is no SQL function for it.
- Removing a perfume's Parfumo link in the edit dialog clears rating and notes but leaves the stored `image_url`.
