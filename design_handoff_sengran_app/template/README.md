# Next.js Template — V1 Home Page

This folder contains a **working Next.js implementation of the V1 Home page**, intended as a reference for the developer / Claude Code to follow when porting the rest of the screens.

It is NOT meant to be copied as-is into the production repo without review. Treat it as the **established pattern**:

- File structure (`app/page.tsx` + `components/home/*` + shared `components/*` + `lib/*` + `hooks/*`)
- Component composition (server vs client boundaries)
- Tailwind class naming + how design tokens map to utilities
- shadcn/ui conventions (where it applies)
- Supabase data fetching patterns
- Loading + error states

## What's included

```
template/
├── README.md                          ← this file
├── app/
│   └── page.tsx                       ← Home (server component, data fetching)
├── components/
│   ├── home/
│   │   ├── home-screen.tsx            ← Home layout (client component, no data)
│   │   ├── home-skeleton.tsx          ← Suspense fallback
│   │   ├── location-header.tsx        ← Top header with location + bell + msg
│   │   ├── type-pills.tsx             ← เซ้ง / ให้เช่า / ทั้งคู่
│   │   └── category-grid.tsx          ← 4×2 icon-bubble category grid
│   ├── listing-card.tsx               ← REUSABLE — used in featured + latest grids
│   ├── listing-photo.tsx              ← REUSABLE — Image + placeholder gradient
│   ├── type-badge.tsx                 ← REUSABLE — sale/rent/both colored pill
│   ├── heart-btn.tsx                  ← REUSABLE — favorite toggle, optimistic
│   ├── bottom-nav.tsx                 ← REUSABLE — 5-tab nav with center FAB
│   └── section-heading.tsx            ← REUSABLE — section title + see-all link
├── lib/
│   ├── types.ts                       ← Listing, Category, ListingType
│   └── format.ts                      ← fmtTH, fmtCompact, priceText, priceUnit, fmtDate
└── hooks/
    └── use-favorites.tsx              ← Supabase-backed favorite mutation + optimistic UI
```

## What's NOT included (build these next)

- `app/listings/page.tsx` — Browse (filter pills, list/map toggle, card grid)
- `app/property/[slug]/page.tsx` — Detail (gallery, price block, amenities, seller, sticky contact bar)
- `app/saved/page.tsx` — Saved listings
- `app/profile/page.tsx` — Profile + settings
- `components/listing-row.tsx` — horizontal card (Browse list view, Saved)
- `components/contact-sheet.tsx` — bottom-sheet contact modal (uses shadcn `<Sheet>`)
- `components/listings-map.tsx` — Map view (Google Maps with custom price-pin overlay)

Each of these should follow the same patterns as Home — see "Patterns to follow" below.

## How to install into your repo

1. **Verify Supabase imports** — the template imports from `@/lib/supabase/server` and `@/lib/supabase/client`. Adjust if your repo uses a different alias (e.g. `@supabase/auth-helpers-nextjs` or `@/utils/supabase`).
2. **Verify `cn` util** — imports from `@/lib/utils`. This is the standard shadcn `cn` (clsx + tailwind-merge). Skip if you already have it.
3. **Drop in the files** — `app/page.tsx` replaces (or merges with) your existing root page. Other files land in `src/components/` and `src/lib/`. Keep your existing files intact when they overlap.
4. **Run the schema check** — `lib/types.ts` assumes columns: `image_urls text[]`, `posted_at timestamptz`, `featured bool`, `status text`, plus a `categories` table with `slug, name_th, icon_name, sort_order`. If your schema diverges, update both the queries in `app/page.tsx` and the type in `lib/types.ts`.
5. **Verify Tailwind tokens** — the template uses raw Tailwind utilities (`bg-orange-500`, `border-neutral-200`, etc). Your `globals.css` already defines the brand palette via shadcn `@theme inline`. Confirm `--color-orange-500: #f97316` is the value being used.

## Patterns to follow

### Server-first

Data fetching lives in **server components** (`app/page.tsx`). Pass plain props down to client components. Use `Suspense` + a skeleton fallback for streaming.

### Client components only when needed

`<HomeScreen>` is a client component because it uses `useRouter()` for the search-bar tap. The cards themselves (`<ListingCard>`, `<TypeBadge>`, `<SectionHeading>`) are **server-renderable** — they don't need `"use client"`.

Only the truly-interactive bits are client: `<HeartBtn>` (optimistic toggle), `<TypePills>` (active-state), `<BottomNav>` (Link with active state).

### Component file organization

- `components/home/` — **page-specific** components (won't be reused elsewhere)
- `components/*` — **reusable** primitives (used across pages)
- Keep them flat — don't nest deeper than two folders unless the count warrants it (>10 files per folder)

### Tailwind class order

Stick to the shadcn order (handled automatically by `prettier-plugin-tailwindcss` if you've set it up):
1. Layout (flex, grid, block)
2. Position (relative, absolute, inset)
3. Sizing (w-, h-, size-)
4. Spacing (p-, m-, gap-)
5. Typography (text-, font-)
6. Color (bg-, text-, border-)
7. Effects (shadow, opacity)
8. Transitions (transition, hover:, focus:)

### shadcn `<Button>` vs raw `<button>`

- Use shadcn `<Button>` (`@/components/ui/button`) for **primary CTAs and form actions**.
- Raw `<button>` is fine for **tappable icon buttons** that have custom geometry (icon bubbles, heart buttons, nav items) — shadcn's Button overhead isn't useful there.

### Image rendering

Always go through `<ListingPhoto>` — never `<img>` or bare `<Image>` directly for listings. It handles the placeholder fallback in one place. For other images (avatars, hero), use `next/image` directly.

### Routing

App Router conventions:
- `/` → home
- `/listings` → browse (search params for filters)
- `/listings?type=sale&category=coffee&province=bangkok`
- `/property/[slug]` → detail
- `/category/[slug]` → category-locked browse
- `/province/[slug]` → province-locked browse
- `/saved` → saved listings
- `/profile` → user profile
- `/listings/new` → create wizard

Link with `next/link`. Use `useRouter()` only when the navigation is non-link (e.g. tapping a search-bar div).

### Loading + empty states

Every list-rendering page should have:
- A **skeleton** in `Suspense fallback={...}` (see `home-skeleton.tsx`)
- An **empty state** when the query returns 0 rows: illustrated, with an action
- An **error state** via `error.tsx` route segment (App Router convention)

## How to ask Claude Code to use this

A good prompt:

> Read `design_handoff_sengran_app/README.md` first to understand the spec. Then look at `design_handoff_sengran_app/template/` to see how the Home page is implemented — use the same patterns when you build the other screens.
>
> Start with the Browse page (`/listings`). Match the layout in `screenshots/02-browse-list.png` and `03-browse-map.png`. Use the same Supabase client + types I already have, and reuse `<TypeBadge>`, `<HeartBtn>`, `<ListingCard>` from the template.

That puts the design intent + the codebase patterns + the screenshots all in front of Claude Code at once. It'll do the rest.
