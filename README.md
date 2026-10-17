# Eau de Fragrances

A site for perfume collectors: keep a **collection** of the bottles you own and a **wishlist** of what to buy next. Every perfume links to Parfumo and shows its Parfumo rating and notes, read automatically from the link. English and Bulgarian.

Domain (planned): **eaudefragrances.com**

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + Tailwind CSS 4
- [Supabase](https://supabase.com): email and Google sign-in, Postgres with Row Level Security
- [next-intl](https://next-intl.dev): `/en` and `/bg` routes, texts in `messages/*.json`
- Hosting: Vercel

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase settings the site runs in **preview mode** with example perfumes and sign-in switched off.

To connect the database and turn on sign-in, follow **[docs/SETUP.md](docs/SETUP.md)** (in Bulgarian).

## Project layout

| Path | What's there |
| --- | --- |
| `src/app/[locale]/` | Pages: home, collection, wishlist, login, signup, password reset, account, admin |
| `src/app/auth/` | Supabase auth callbacks (Google, email links) |
| `src/actions/` | Server actions for auth and shelves |
| `src/components/` | UI: header, perfume cards, add-perfume dialog, auth forms |
| `src/lib/` | Supabase clients, perfume types and link helpers |
| `src/proxy.ts` | Locale routing + Supabase session refresh |
| `messages/` | English and Bulgarian texts |
| `supabase/migrations/` | Database schema, RLS policies and SQL functions (run in order) |
| `docs/` | Setup guide and outreach drafts |

## Roadmap

1. ✅ Design, accounts (email + Google), collection, wishlist, Parfumo links
2. ✅ Deployed on Vercel (https://eaudezhivko.vercel.app)
3. ✅ Admin panel (users and their shelves, catalogue, support sign-in, account deletion, audit log) and a Feedback form
4. Domain eaudefragrances.com, custom SMTP, privacy policy and terms
5. ✅ Parfumo rating and notes read automatically; light/dark theme
6. Best prices from Bulgarian shops
