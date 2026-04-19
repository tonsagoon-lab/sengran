# เซ้งร้าน.com — CLAUDE.md

## Project Purpose
เซ้งร้าน.com is a Thai-language marketplace for buying, selling, and leasing shop businesses (ร้านค้า) and commercial spaces. Target users are Thai shop owners looking to transfer their lease ("เซ้ง"), buyers looking for an established shop, and landlords renting commercial units. Think Kaidee but vertically focused on shops/spaces only.

## Tech Stack & Rationale
- **Next.js 14+ App Router** — SSR for SEO (listing pages must be crawlable), file-based routing
- **TypeScript** — strict mode; avoids runtime bugs in data-heavy listing forms
- **Tailwind CSS + shadcn/ui (new-york style)** — fast UI, consistent design system, easy to override
- **Supabase** — Postgres DB + row-level security, built-in auth (email/phone OTP), storage for listing photos; avoids managing separate backend
- **Vercel** — zero-config Next.js deploy, preview environments per PR

## Folder Structure
```
src/
  app/                  # App Router pages and layouts
  components/
    ui/                 # shadcn/ui generated components (do not edit manually)
    shared/             # Shared layout components (Navbar, Footer, etc.)
    listings/           # Listing-specific components
  lib/
    supabase/
      client.ts         # Browser Supabase client
      server.ts         # Server Component Supabase client
      middleware.ts     # Session refresh helper for middleware
    utils.ts            # shadcn cn() utility
  types/                # TypeScript types (Listing, User, etc.)
  hooks/                # Custom React hooks
```

## Coding Conventions
- **TypeScript strict mode** — no `any`, no non-null assertions without justification
- **Naming**: components PascalCase, hooks `use*`, utilities camelCase, DB columns snake_case
- **Server Components by default** — only add `"use client"` when needed (interactivity, hooks)
- **Supabase calls**: use `server.ts` client in Server Components/Route Handlers, `client.ts` in Client Components
- **Thai UI**: all user-facing copy in Thai; use `font-sans` (Noto Sans Thai or Sarabun via Google Fonts)
- **Error handling**: always handle Supabase errors; never swallow them silently
- **Imports**: use `@/` alias always; no relative `../../../`

## MVP Feature List (build in this order)
1. **Auth** — email/password signup + login via Supabase Auth; protected routes via middleware
2. **Listing CRUD** — create/edit/delete listing (title, description, price, category, location, contact)
3. **Image Upload** — up to 10 photos per listing via Supabase Storage
4. **Search & Filter** — search by keyword, filter by category (เซ้ง/ขาย/เช่า), province, price range
5. **Listing Detail Page** — SEO-friendly `/listings/[id]` with photos, info, contact seller button
6. **Contact Seller** — reveal phone/LINE ID after login (or simple inquiry form)

## Features for Later (do not build in MVP)
- Wallet system for credits
- Boost / featured ads (pay to pin listing to top)
- Admin dashboard (approve listings, manage users)
- Payment integration with **Omise** (Thai payment gateway)
- Migration tooling from existing WordPress site
- Saved listings / favorites
- Push notifications (LINE Notify or Firebase)
- Analytics dashboard for sellers (views, contacts)

## Important Notes for Future Sessions
- **Thai language first** — all UI text must be in Thai; variable names stay in English
- **Scale target**: ~10,000 listings at launch; DB queries must be indexed properly
- **Performance**: listing pages must load fast; use Next.js Image for all photos, lazy load
- **SEO**: listing pages need proper `<title>`, `<meta description>`, and OG tags in Thai
- **Mobile-first**: most Thai users browse on mobile; design responsive from the start
- **Supabase RLS**: every table must have Row Level Security enabled; never expose service key client-side
- **Font**: add Noto Sans Thai or Sarabun from Google Fonts for proper Thai rendering
- **No mock data**: always use real Supabase queries; seed data only for local dev
