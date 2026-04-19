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

---

## Session 2 Additions

### Database Schema Summary
10 tables: `profiles`, `categories`, `provinces` (77), `amenities`, `listings`, `listing_images`, `listing_amenities`, `transactions`, `boosts`, `favorites`.

Key design decisions:
- `profiles` extends `auth.users` via trigger (auto-created on signup)
- `listings.slug` is unique — generate from title + short uuid suffix
- `listings.listing_type` can be 'sale', 'rent', or 'both' (เซ้ง, เช่า, หรือทั้งคู่)
- `wallet_balance` is stored on profile, debited on boost creation
- FTS uses 'simple' config (Thai text not supported by built-in Postgres FTS — consider pg_jieba or typesense for production)

### How RLS Works
Every table has RLS enabled. Key rules:
- Public can SELECT published listings and all reference data (categories/provinces/amenities)
- Users can only see/edit their own drafts, transactions, boosts, favorites
- `profiles` is publicly readable (display_name shown on listing cards)
- Triggers and functions use SECURITY DEFINER to bypass RLS for system operations

### Auth Flow
1. User registers → Supabase creates `auth.users` row → DB trigger creates `profiles` row
2. Login → Supabase issues session cookie → `proxy.ts` refreshes on every request
3. Server Components call `createClient()` from `lib/supabase/server.ts` to get session
4. Protected pages: call `supabase.auth.getUser()`, redirect to /login if null
5. Server Actions in `lib/actions/auth.ts` handle form submissions (no API routes needed)

### TypeScript Types
Hand-written types in `lib/types/database.ts`. Once Supabase CLI is installed, replace with:
```bash
npx supabase gen types typescript --project-id fexxmtjmrlpitzsjrgbd > src/lib/types/database.ts
```

### Wallet UI — deferred
`wallet_balance` column stays in the `profiles` table (needed for future boost/feature payments), but **all wallet UI is hidden**:
- Navbar dropdown: no wallet item (โปรไฟล์ + ประกาศของฉัน + ออกจากระบบ only)
- Profile page: no balance display
- Register form: never had a wallet field

Do not add wallet UI until the topup + Omise payment flow is fully built.

---

## Session 3A Additions — Listing CRUD + Image Upload

### New Files
- `src/lib/schemas/listing.ts` — Zod schema (string-typed numeric fields; superRefine for conditional price validation)
- `src/lib/utils/slug.ts` — Thai→roman transliteration via Unicode code points; `generateUniqueSlug()` checks DB for collisions
- `src/lib/utils/image-upload.ts` — client-side compress (browser-image-compression, max 1MB/1920px) + upload to Supabase Storage "listings" bucket
- `src/lib/db/listings.ts` — server data access layer: `getPublishedListings`, `getListingBySlug`, `getMyListings`, `getListingForEdit`, `getAllCategories`, `getAllProvinces`
- `src/lib/actions/listings.ts` — `createListingAction`, `updateListingAction`, `deleteListingAction`, `deleteListingImageAction`, `incrementViewCountAction`, `toggleFavoriteAction`
- `src/components/listings/province-combobox.tsx` — Command+Popover combobox for 77 provinces
- `src/components/listings/image-uploader.tsx` — dnd-kit drag-reorder; immediate upload on file select; hidden inputs for form submission
- `src/components/listings/listing-form.tsx` — multi-section form (react-hook-form + zod + useActionState)
- `src/components/listings/listing-card.tsx` — card for my-listings page
- `src/components/listings/delete-listing-button.tsx` — AlertDialog confirmation before delete
- `src/components/listings/image-gallery.tsx` — embla-carousel-react gallery
- `src/components/listings/view-count-tracker.tsx` — client component; sessionStorage debounce to avoid double-counting
- `supabase/migrations/0003_view_count_function.sql` — SECURITY DEFINER `increment_listing_view_count(slug)` to bypass RLS for anon users

### Pages
- `/listings/new` — create listing (protected)
- `/listings/[id]/edit` — edit listing (owner-only via `getListingForEdit`)
- `/my-listings` — owner's listing list with edit/delete
- `/listing/[slug]` — public detail page with SEO metadata, gallery, contact

### Key Architectural Decisions
- Listing UUID is generated **client-side** (`crypto.randomUUID()` in `useState`) so images can upload before the listing row exists in DB
- Images upload immediately on file select (not on form submit); storage paths passed via hidden `<input name="image_paths[]">`
- View count increment uses SECURITY DEFINER Postgres function (RLS blocks anon UPDATE on listings)
- `zod` v4 uses `error.issues` not `error.errors`; `z.enum` params use `error` not `required_error`

### Run This SQL in Supabase (migration 0003)
See `supabase/migrations/0003_view_count_function.sql` (includes SET search_path + REVOKE/GRANT).

---

## Session 3B Additions — UX Improvements

### Terminology
- UI label "ขาย" → "เซ้ง" everywhere. DB value `'sale'` unchanged.
- `listing_type = 'both'` → "เซ้งและให้เช่า"

### Rich Text Description
- **Editor**: `src/components/rich-text-editor.tsx` — TipTap + StarterKit + Link + Placeholder
  - Toolbar: Bold, Italic, BulletList, OrderedList, Link, Emoji picker (@emoji-mart/react, lazy-loaded)
  - Min 280px, max 500px scroll, styled to match shadcn
- **Display**: `src/components/rich-text-display.tsx` — sanitized with DOMPurify (client-side)
  - `stripHtmlTags()` exported for server-side plain text extraction (schema validation, OG meta)
- **Validation**: strip HTML → require ≥ 30 chars of actual text
- **DB**: stores raw HTML; sanitized on display (never raw to DOM)

### Google Maps Location
- `src/lib/utils/google-maps.ts` — `extractCoordsFromGoogleMapsUrl()` handles:
  - Short URLs (maps.app.goo.gl, goo.gl/maps) — server-side redirect follow
  - `@lat,lng`, `!3d/!4d`, `?q=`, `?ll=` formats
- `src/lib/actions/maps.ts` — `resolveGoogleMapsUrl()` server action (CORS-safe)
- `src/components/google-maps-input.tsx` — 500ms debounce paste handler, status indicators, embed preview
- **Stores lat/lng only** (not the raw URL); embed via `?output=embed` (no API key)
- Public listing page: shows embed iframe + "เปิดใน Google Maps →" link when lat/lng present

### Contact Info Sourced from Profile
- Form no longer has contact fields; server action fetches snapshot at submit time
- `createListingAction` checks `profile.display_name && profile.mobile` before proceeding
- If missing: server-side redirect `/profile?reason=missing_contact` (also enforced in page.tsx)
- Profile page shows amber alert when `?reason=missing_contact`
- Edit does not re-check (user already has a listing)

### 4-Step Wizard (`src/components/listing-wizard.tsx`)
- Manages all state in `sessionStorage` (persisted on every change, cleared on submit)
- Hash routing: `/listings/new#step-1` … `#step-4`; browser back navigates steps
- Progress: numbered circles (desktop) / text + bar (mobile)
- Step 1 "ข้อมูลพื้นฐาน": listing type (icon cards), title, category, prices + deposit, RichTextEditor description
- Step 2 "ที่ตั้ง": province combobox, district, address textarea, GoogleMapsInput
- Step 3 "รายละเอียดเพิ่มเติม": video URL, amenity checkboxes
- Step 4 "รูปภาพ": ImageUploader (≥1 required) + read-only summary card + "เผยแพร่" / "บันทึกแบบร่าง"
- Validation per step (Zod); price fields cleared when listing_type changes retroactively
- `migrateState()` strips unknown fields + clamps old `#step-5` → `#step-4` for forward compat
- "บันทึกแบบร่าง" in header from step 2 onwards
- Edit mode: pre-filled from existing listing + amenities, no profile check
- `price_note` and `area_sqm` removed from UI (DB columns kept for WP migration)

### db/listings.ts additions
- `getAllAmenities()` — fetch all amenities ordered by name
- `getListingForEdit()` — now selects `listing_amenities(amenity_id)`, `categories`, `provinces`
