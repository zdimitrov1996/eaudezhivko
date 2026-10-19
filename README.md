# Eau de Fragrances

A site for perfume collectors: keep a **collection** of the bottles you own and a **wishlist** of what to buy next. Every perfume links to Parfumo and shows its Parfumo rating, notes and bottle picture, read automatically from the link, plus a Pazaruvaj link to compare Bulgarian shop prices. English and Bulgarian.

Live: https://eaudezhivko.vercel.app (deploys from `main`). Planned domain: **eaudefragrances.com**.

## Documentation

- **[docs/guide-bg.md](docs/guide-bg.md)** (Bulgarian): the owner's guide. What each page does, the admin panel, how changes and SQL scripts go live, where the data comes from.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** (English): for developers. Stack, folders, data model, RLS and SQL functions, auth and roles, Parfumo reading, migrations and deploy.
- **[docs/SETUP.md](docs/SETUP.md)** (Bulgarian): connecting Supabase and Google sign-in.

Any PR that changes behaviour updates these documents in the same PR.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase settings the site runs in **preview mode** with example perfumes and sign-in switched off. To connect the database, follow [docs/SETUP.md](docs/SETUP.md).

Before committing: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Stack

Next.js 16 (App Router) + Tailwind CSS 4, Supabase (Postgres with Row Level Security, email and Google sign-in), next-intl (`/en`, `/bg`), hosted on Vercel.

## Still to do

- Domain eaudefragrances.com and custom SMTP for sign-in emails
