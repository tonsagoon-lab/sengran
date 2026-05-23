# Handoff: เซ้งร้าน Mobile App — V1 "Classic"

This package contains the **mobile-first redesign** of [เซ้งร้าน.com](https://xn--12c1bik6bbd8af5l3d.com) (sengran.com) — the Thai marketplace for buying, selling, and leasing shop businesses (เซ้ง / ให้เช่า ร้านค้า). It targets the existing codebase at `github.com/tonsagoon-lab/sengran` (Next.js 16 + Tailwind v4 + shadcn/ui + Supabase).

## About the design files

The files in this bundle are **design references created in HTML/React** — clickable prototypes that show the intended look, feel, copy, and behavior. They are **NOT production code to copy verbatim**.

Your task is to **recreate these designs in the existing Next.js codebase** using its established patterns:

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 with the `@theme inline { ... }` directive from `src/app/globals.css`
- **Component primitives:** `shadcn/ui` ("new-york" style, `neutral` baseColor) — already in `src/components/ui/`
- **Icons:** `lucide-react` — already a dependency
- **Backend:** Supabase (data, auth, storage) — already wired up
- **Font:** Sarabun via `next/font/google`

Do **not** introduce new dependencies, new design systems, or new icon libraries. Where the prototype uses raw `<div style={...}>` inline styles, **convert to Tailwind utility classes**. Where it hand-rolls a button, **swap in shadcn's `<Button>`**. Where it inlines an SVG icon, **import the matching name from `lucide-react`**.

## Fidelity

**High-fidelity (hifi).** Colors, type, spacing, radii, and interactions are final. Match them exactly. The only thing that's intentionally placeholder is **listing imagery** (the prototype uses CSS gradients with a category glyph) — replace with the real Supabase Storage URLs from the `listings.images[]` column in production.

## What's in this bundle

```
design_handoff_sengran_app/
├── README.md                ← you are here
├── screenshots/             ← 7 PNGs, one per screen
│   ├── 01-home.png
│   ├── 02-browse-list.png
│   ├── 03-browse-map.png
│   ├── 04-detail.png
│   ├── 05-contact-sheet.png
│   ├── 06-saved.png
│   └── 07-profile.png
├── template/                ← working Next.js Home page (reference impl)
│   ├── README.md            ← how to use the template + patterns
│   ├── app/page.tsx
│   ├── components/          ← ListingCard, TypeBadge, HeartBtn, BottomNav, …
│   ├── lib/types.ts + format.ts
│   └── hooks/use-favorites.tsx
├── prototype/
│   ├── index.html           ← runnable V1-only prototype (open in browser)
│   └── screenshots.html     ← variant used to generate the PNGs above
├── src/                     ← React/JSX source (Babel-transformed at runtime)
│   ├── data.jsx             ← sample CATS, LISTINGS, TYPE_BADGES, formatters
│   ├── icons.jsx            ← Lucide-style inline SVG icon set
│   ├── shared.jsx           ← theme builder, primitives (Screen, Photo, TypeBadge, HeartBtn, ContactSheet, …)
│   └── v1-classic.jsx       ← the V1 screens (HomeV1, BrowseV1, DetailV1, SavedV1, ProfileV1)
└── assets/
    ├── colors_and_type.css  ← all design tokens as CSS custom properties
    └── fonts/               ← Sarabun TTF files + face declarations
```

**Recommended reading order for Claude Code:**

1. **This file** — product context, terminology, tokens, copy
2. **`screenshots/`** — see what each screen looks like (referenced by section below)
3. **`template/README.md`** — Next.js patterns established for the Home page
4. **`template/app/page.tsx`** + **`template/components/home/home-screen.tsx`** — the working reference implementation
5. **`src/v1-classic.jsx`** — the design's behaviour as runnable code (interactions, state, transitions)

## Reference screenshots

| Screen | File |
|--------|------|
| Home | `screenshots/01-home.png` |
| Browse — list view | `screenshots/02-browse-list.png` |
| Browse — map view | `screenshots/03-browse-map.png` |
| Detail | `screenshots/04-detail.png` |
| Contact sheet (modal) | `screenshots/05-contact-sheet.png` |
| Saved | `screenshots/06-saved.png` |
| Profile | `screenshots/07-profile.png` |

Open `prototype/index.html` in a browser to interact with all of them in one app. Tap cards to drill in, tap nav tabs to switch screens, tap heart to favorite, tap call/LINE/message to open the contact sheet.

---

## Product overview

เซ้งร้าน.com is a vertically-focused classifieds marketplace. Users:
- **Buy** a business (เซ้งร้าน) by paying a transfer fee + taking over the lease
- **Rent** (ให้เช่า) a shop space directly
- Both flows can apply to the same listing (`type: 'both'`)

Every listing has: title, type (`'sale' | 'rent' | 'both'`), category (ร้านอาหาร / ร้านกาแฟ / …), province + district + area, sale_price and/or rent_price, deposit (months), seller info (name + LINE id + mobile), images, posted date.

**Terminology mapping (binding):**
- DB stores English `'sale' | 'rent' | 'both'`
- UI **always** says: `เซ้ง` (sale) / `ให้เช่า` (rent) / `เซ้ง+เช่า` (both card) or `เซ้งและให้เช่า` (both detail)
- **NEVER use ขาย in user-facing copy.** Always use เซ้ง.

---

## Screens

Five screens, all in one tab system. Navigation:

```
HomeV1 ─┬─→ BrowseV1 ─┬─→ DetailV1 ─→ ContactSheet (modal)
        ├─→ DetailV1 ─┤
        ├─→ SavedV1 ──┤
        └─→ ProfileV1 ┘
```

### 1. Home (`HomeV1`)
**Purpose:** Discovery entry point — show location, search, popular categories, featured listings, latest listings, post-CTA.

**Layout (top to bottom):**
1. **Status bar** — system. (iOS frame, not part of design)
2. **Location header** — 16px padding, flex row, `space-between`
   - Left: stacked `ตำแหน่งปัจจุบัน` (11px, `text-neutral-500`) + `<MapPin>` icon (16px, orange-500) + city (`font-bold text-base`) + `<ChevronDown>` (14px, neutral-500)
   - Right: `<Bell badge={3}>` + `<MessageCircle badge={1}>` round icon buttons (36×36, no bg)
3. **Search input** — `bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-3`, flex row with `<Search>` icon, placeholder `ค้นหาร้าน...`, trailing `<SlidersHorizontal>`. Whole row is tappable → routes to `/listings`
4. **Type pills** — 3 equal-width buttons in flex row, gap-2. Default state: `bg-neutral-50 border-neutral-200 text-neutral-700`. Active (first one in mock = `เซ้ง`): `bg-orange-50 border-orange-200 text-orange-700`. Labels: `เซ้ง · ให้เช่า · ทั้งคู่`
5. **Section: หมวดหมู่** — section header (font-semibold text-base) + `ดูทั้งหมด ›` link (orange-700, text-xs). Grid of 4 cols × 2 rows of category buttons. Each: `flex flex-col items-center gap-1.5 p-3 bg-white border border-neutral-200 rounded-xl`. Bubble: `w-10 h-10 rounded-full bg-orange-100 text-orange-600 grid place-items-center` with lucide icon at 20px. Label below: text-[11px] text-neutral-700.
6. **Section: ประกาศแนะนำ** — horizontal scrollable strip of `ListingCard`s, each 200px wide, no padding-right. Show all `featured: true` then fill from non-featured.
7. **Section: 🆕 ประกาศล่าสุด** — 2-col grid (gap-3) of `ListingCard`s. First 4 latest listings.
8. **CTA banner** — `bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3.5`. Round orange (`bg-orange-500 text-white`) `<Plus>` icon button on left. Title `ลงประกาศฟรี!` (font-bold text-orange-700) + subtitle `เซ้ง / ให้เช่าร้านของคุณ ไม่มีค่าใช้จ่าย` (text-xs text-neutral-500). Trailing `<ChevronRight>`.
9. **Bottom tab bar** — fixed. See "Bottom nav" below.

### 2. Browse / Search results (`BrowseV1`)
**Purpose:** Filtered listings results with list ↔ map toggle.

**Layout:**
1. **Top bar** — back chevron · title `ประกาศทั้งหมด` (font-bold text-[17px]) · subtitle `พบ 2,847 รายการ` (text-xs neutral-500). Right: list/map toggle button + `<SlidersHorizontal badge={2}>` button.
2. **Filter pills row** — `flex gap-1.5 px-4 py-2.5 overflow-x-auto border-b`. Pills are capsule-shaped. Active first pill (ทั้งหมด): `bg-orange-500 text-white border-orange-500 font-semibold`. Others: `bg-white text-neutral-700 border-neutral-200`. Some pills have trailing `<ChevronDown>` (กรุงเทพฯ, ร้านอาหาร, ฿ ราคา). Tapping opens a Sheet/popover (use shadcn `<Sheet>` from `right` on desktop, `bottom` on mobile).
3. **Body — toggles between two views:**
   - **List view** (default): `bg-neutral-50` scrollable area, vertical stack of `ListingRow` cards (gap-2.5, px-4 py-3).
   - **Map view**: full-bleed map (use Google Maps embed in prod) with price-pin overlays + a card preview docked at the bottom showing the currently-selected listing. Pins look like teardrop labels showing the formatted compact price (`฿850K`, `฿1.2M`). Cluster pins are blue circles with a number.
4. **Bottom tab bar** (active = `ค้นหา`)

### 3. Detail (`DetailV1`)
**Purpose:** Full listing detail with sticky-bottom contact actions.

**Layout (vertical scroll):**
1. **Hero gallery** — 4:3 aspect ratio, edge-to-edge image. Floating round buttons (white/92% opacity, blur, 36×36): back chevron (top-left); share + heart (top-right). Page counter pill (`1 / 8`) bottom-right with `bg-black/55 text-white text-[11px]`.
2. **Title block** — px-4, gap-1.5:
   - Row of badges: `<TypeBadge>` + `<CategoryBadge>` (neutral chip)
   - `<h1>` — text-[19px] font-bold leading-snug
   - Location line — `<MapPin>` 13px + `{district}, {province}` (text-xs neutral-500)
3. **Price block** — `bg-orange-50 border border-orange-200 rounded-xl p-4`, contains rows:
   - `<Store>` icon + `ราคาเซ้ง: {salePrice} บาท` if sale_price
   - `<Layers>` icon + `ค่าเช่า: {rentPrice} บาท/เดือน` if rent_price
   - `มัดจำ {deposit} เดือน` (text-xs) if deposit && (type=rent|both)
4. **Meta row** — `<Eye>` + `{views} ครั้ง` · `<Clock>` + `{posted}`. text-xs neutral-500.
5. **Divider, รายละเอียด** section — h2 (text-[15px] font-semibold) + `<p>` text-[13.5px] leading-relaxed.
6. **สิ่งอำนวยความสะดวก** — 2-col grid of `<Check>` icon + label rows. Source from `listing.amenities[]`.
7. **Divider, ผู้ขาย** — card with avatar (orange-100 bubble with first character), name, LINE id, trailing chevron.
8. **`pb-28` spacer** to clear the sticky contact bar.
9. **Sticky bottom bar** — `fixed bottom-0 inset-x-0 border-t bg-white px-4 py-3 flex gap-2 shadow-[0_-4px_16px_rgb(0_0_0_/_0.06)]`. Three buttons full-flex:
   - **โทร** — `bg-orange-500 text-white` + `<Phone>` icon
   - **LINE** — `bg-[#06C755] text-white` + custom LINE SVG mark (see `icons.jsx` `LineIcon`)
   - **ข้อความ** — `bg-white border border-neutral-300 text-neutral-700` + `<MessageCircle>` icon

### 4. Saved (`SavedV1`)
**Purpose:** Favorited listings.

**Layout:** Top bar with title `ประกาศที่บันทึก` + count subtitle. Then tab row: `ทั้งหมด · เซ้ง · ให้เช่า` with a count chip, active tab has orange underline + bold text. Body is `bg-neutral-50` scroll area of `ListingRow` cards. Bottom tab bar active = `บันทึก`.

### 5. Profile (`ProfileV1`)
**Purpose:** User account & settings.

**Layout:** Avatar + name header + edit button. Then 3-stat grid (`ประกาศ · ดู · บันทึก`) in light-bg boxes. Then a section "บัญชี" header (uppercase, text-xs) + a list of menu items separated by 1px dividers. Each menu item: 18px lucide icon + label + optional value + `<ChevronRight>`. Tap goes to subpages (build stubs).

---

## Components to build

Implement these as reusable React components in `src/components/`:

### `<ListingCard>` — vertical card
Used in: Home featured strip, Home latest grid.

```
┌─────────────────┐
│ [photo 4:3]     │  ← <TypeBadge> top-left, <HeartBtn> top-right
│                 │
├─────────────────┤
│ ฿850,000        │  ← font-bold text-[15px]
│ Title (2 lines) │  ← font-medium text-[13px] line-clamp-2
│ 📍 Area, City   │  ← text-[11px] neutral-500
└─────────────────┘
```

`border border-neutral-200 rounded-xl overflow-hidden bg-white`. Hover: `hover:shadow-md hover:scale-[1.02] transition-all duration-200`. Tap → router push to `/property/[slug]`.

### `<ListingRow>` — horizontal card
Used in: Browse list view, Saved screen.

```
┌────┬─────────────────────────┐
│img │ <TypeBadge> ⭐    27 พ.ย.│
│100 │ Title (2 lines)         │
│ ×  │ 📍 Area, City           │
│100 │                         │
│    │ ฿850,000  · /เดือน   ❤  │
└────┴─────────────────────────┘
```

Same chrome treatment as ListingCard. Image is 100×100 square with rounded-lg, separate from card surface so card can keep its rounded-xl outer corners.

### `<TypeBadge>`
Three variants by `type` prop:

| Type | bg | border | fg | Label |
|------|----|--------|----|----|
| `sale` | `bg-blue-100`   | `border-blue-200`   | `text-blue-700`   | `เซ้ง`     |
| `rent` | `bg-green-100`  | `border-green-200`  | `text-green-700`  | `ให้เช่า`   |
| `both` | `bg-purple-100` | `border-purple-200` | `text-purple-700` | `เซ้ง+เช่า` |

Capsule pill: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-medium`. If `featured` prop, prepend a `⭐` emoji at text-[10px].

### `<HeartBtn>`
Floating round button on photos: `absolute top-2 right-2 w-8 h-8 rounded-full bg-white/92 shadow-sm backdrop-blur grid place-items-center`. `<Heart>` lucide icon inside, color `text-red-500` when active (filled), `text-neutral-500` when inactive (outlined, strokeWidth 2). Click stops propagation (don't open detail).

### `<BottomNav>`
5 tabs: `หน้าแรก · ค้นหา · ลงประกาศ · บันทึก · โปรไฟล์`. Sticky bottom, `border-t bg-white`, 5-col grid, `pt-1.5 pb-2`. Each tab is a column: lucide icon (22px) + label (text-[10px]). Active tab: `text-orange-500 font-semibold`. Inactive: `text-neutral-500`.

**Center tab (`ลงประกาศ`) is special** — a protruding orange round button:
- `w-11 h-11 rounded-full bg-orange-500 text-white grid place-items-center -mt-3 shadow-[0_4px_12px_rgb(0_0_0_/_0.15)]`
- `<Plus>` icon inside (22px)
- Tap → `router.push("/listings/new")`

### `<ContactSheet>` — bottom-sheet modal
Trigger: any of the 3 buttons on the sticky bottom bar of `DetailV1`.

Layout: full-width sheet anchored to bottom, `rounded-t-3xl bg-white p-4 pb-7`. Top: a small 36×4 neutral-300 drag handle, centered. Header row: seller avatar bubble + name + "ผู้ขาย · ตอบเร็ว" subtitle + close X button on right.

Then three big buttons stacked, gap-3.5. Each: `bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3.5 flex items-center gap-3`:
- Phone — orange round icon bubble + label `โทร` + mobile number
- LINE — `bg-[#06C755]` round icon bubble + label `LINE` + LINE id
- Message — neutral round icon bubble + label `ส่งข้อความในแอป` + `แชทกับ {sellerName}`

Backdrop: `bg-black/50`. Animation: slide-up 250ms ease-out. Use shadcn's `<Sheet>` from `bottom`.

---

## Design tokens

All tokens are in `assets/colors_and_type.css` as `:root { --foo: ... }`. The existing codebase already has equivalents in `src/app/globals.css` — reuse those. Reference:

### Colors

**Brand orange** (the one accent):
```
--orange-50:  #fff7ed
--orange-100: #ffedd5
--orange-200: #fed7aa
--orange-300: #fdba74
--orange-400: #fb923c
--orange-500: #f97316   ← brand primary (CTAs, links, badges, focus ring)
--orange-600: #ea580c   ← hover state
--orange-700: #c2410c
--orange-800: #9a3412
```

**Neutrals** — shadcn `neutral` baseColor (pure grayscale, OKLCH). Already in codebase.

**Type badges** (only place palette widens beyond orange+neutral):
- `sale` → `blue-100/700/200`
- `rent` → `green-100/700/200`
- `both` → `purple-100/700/200`

**External brand:**
- LINE green: `#06C755` (button bg), hover `#05b34c`
- "ลงประกาศฟรี!" pill: `green-500 #22c55e` (only this CTA — not LINE)

**Feedback:**
- Heart fill: `red-500 #ef4444`
- Destructive: shadcn default

**No gradients** anywhere except the one subtle `from-orange-50 to-white` on the desktop hero. No glassmorphism. No background patterns.

### Type

- **Family:** Sarabun (`next/font/google`, weights 100–800 + italics). One family for both Thai and Latin glyphs.
- **Scale:** Tailwind defaults — `text-[10px]` to `text-3xl` (30px). Do not invent sizes.
- **Weights used:** 400 / 500 / 600 / 700.

### Radii

- Buttons / inputs: `rounded-md` (8px)
- Pills / badges: `rounded-full`
- Cards: `rounded-xl` (14px)
- Modals / sheets / hero search: `rounded-2xl` (18px)

### Spacing

Tailwind default 4px scale. Cards use `gap-3` (12px), section padding `py-8` to `py-12`.

### Shadows

- Default surfaces: flat with 1px border
- Card hover: `shadow-md`
- Modals / sticky mobile contact bar: `shadow-lg` / custom `0 -4px 16px rgb(0 0 0 / 0.06)`
- Navbar: no shadow (just `border-b`)
- **No colored shadows. No inner shadows.**

---

## Interactions & behavior

### Navigation
Use Next.js App Router. The mobile prototype routes:
- `/` → Home
- `/listings` → Browse (with optional `?type=sale&category=coffee&province=bangkok&q=...` searchParams)
- `/property/[slug]` → Detail
- `/saved` → Saved
- `/profile` → Profile
- `/listings/new` → Create wizard (out of scope for this handoff; matches existing 3-step wizard)

The existing codebase already has these routes — connect the new components to them.

### Browse list ↔ map toggle
Local component state, no URL param needed. The icon flips between `<Map>` and `<List>`. The pin overlay on the map uses real Google Maps embed in production (the prototype draws a fake SVG map). Selected pin → bottom preview card showing that listing → tap → route to detail.

### Favorites
- Toggling heart updates `favorites` table in Supabase (insert/delete row).
- UI optimistic: flip heart instantly, then call mutation.
- Use existing `useFavorites()` hook if present in codebase, else add a thin wrapper around supabase.

### Contact actions
- **โทร** — open `tel:{seller.mobile}` link
- **LINE** — open `https://line.me/R/ti/p/{seller.line_id}` if URL-style, or copy `seller.line` to clipboard + toast
- **ข้อความ** — route to `/messages/{seller_id}?listing={listing_id}` (existing messaging surface)

The `<ContactSheet>` shows all three options together; the sticky-bottom-bar buttons can either:
- (a) open the sheet directly, OR
- (b) bypass the sheet and trigger the action immediately (decide with @product)

The prototype currently uses (a) for all 3, which is the safer default.

### Animations
Use `tw-animate-css` (already a dependency):
- Sheet slide-up: `animate-in slide-in-from-bottom duration-250 ease-out`
- Card hover: `transition-all duration-200 hover:shadow-md hover:scale-[1.02]`
- Pill / button hover: `transition-colors` (~150ms)

No springs, no bounces, no parallax, no scroll-jacking.

### Focus states
- Inputs: `focus:ring-2 focus:ring-orange-200 focus:border-orange-400`
- Buttons: shadcn defaults

### Empty / loading states
- **Loading** — skeleton cards matching the layout, `bg-neutral-100 animate-pulse`
- **Empty saved** — illustration placeholder + `ยังไม่มีประกาศที่บันทึก` + CTA `เริ่มค้นหา`
- **No results** — `ไม่พบประกาศที่ตรงกับเงื่อนไข` + `ล้างตัวกรอง` link

---

## Content / copy

All Thai. Verbatim from the design — use these strings exactly:

| Surface | Copy |
|---------|------|
| Home location header label | `ตำแหน่งปัจจุบัน` |
| Search placeholder | `ค้นหาร้าน...` |
| Type pills | `เซ้ง` · `ให้เช่า` · `ทั้งคู่` |
| Home section: categories | `หมวดหมู่` |
| Home section: featured | `ประกาศแนะนำ` |
| Home section: latest | `🆕 ประกาศล่าสุด` |
| Section "see all" link | `ดูทั้งหมด ›` |
| Browse title | `ประกาศทั้งหมด` |
| Browse subtitle | `พบ {count} รายการ` |
| Detail price line (sale) | `ราคาเซ้ง: {price} บาท` |
| Detail price line (rent) | `ค่าเช่า: {price} บาท/เดือน` |
| Detail deposit line | `มัดจำ {n} เดือน` |
| Detail amenities | `สิ่งอำนวยความสะดวก` |
| Detail seller header | `ผู้ขาย` |
| Sticky bar buttons | `โทร` · `LINE` · `ข้อความ` |
| Contact sheet seller meta | `ผู้ขาย · ตอบเร็ว` |
| Free-listing banner title | `ลงประกาศฟรี!` |
| Free-listing banner body | `เซ้ง / ให้เช่าร้านของคุณ ไม่มีค่าใช้จ่าย` |
| Empty contact fallback | `ติดต่อสอบถาม` |

**Numbers/currency:** Always `Intl.NumberFormat("th-TH")` for comma grouping. Prefix `฿` in dense contexts (cards, map pins, sticky CTAs). Suffix ` บาท` / ` บาท/เดือน` in spacious contexts (detail price block). Map pin compact format: `฿850K`, `฿1.2M` (see `fmtCompact` in `data.jsx`).

**Date format:** `27 พ.ย. 25` (compact, Thai short month). Already a utility in the codebase.

**Voice:** Functional, transactional, classifieds-app neutral. Imperative buttons. No คุณ in promotional copy. The "ลงประกาศฟรี!" is the ONLY copy that earns an exclamation mark.

---

## State / data

The Supabase schema is in the repo. Key tables for these screens:

- `listings` — main entity
- `categories` — `id, slug, name_th, icon_name` (icon_name = lucide name string)
- `favorites` — `user_id, listing_id, created_at`
- `users` (auth.users + profiles) — `display_name, mobile, line_id`

Use the existing data-access hooks in `src/hooks/` and `src/lib/supabase/`. The prototype's `data.jsx` is sample-only.

**Required data per screen:**

- **Home** — current location (geolocation API or province dropdown), top 8 categories, all featured listings, latest 4 listings
- **Browse** — paginated listings filtered by searchParams (type, category, province, price range, q), 20 per page
- **Detail** — single listing by slug + 2 related listings (same category, same province)
- **Saved** — user's favorites joined with listings, with tab filter by type
- **Profile** — auth.user + profile + counts (listings, total views, favorites)

---

## Assets

- **Fonts** — `assets/fonts/` contains the full Sarabun TTF matrix. The production codebase loads Sarabun via `next/font/google` instead, which is preferred for the WOFF2 + subset pipeline. Use that path.
- **Icons** — all icons in the prototype map directly to a `lucide-react` component:
  - `home`, `search`, `mapPin` → `Home, Search, MapPin`
  - `heart`, `bookmark`, `user`, `bell` → `Heart, Bookmark, User, Bell`
  - `sliders` → `SlidersHorizontal`
  - `chevDown/Right/Left`, `x`, `plus`, `check` → `ChevronDown, ChevronRight, ChevronLeft, X, Plus, Check`
  - `phone`, `msgCircle`, `eye`, `clock`, `camera`, `share` → `Phone, MessageCircle, Eye, Clock, Camera, Share2`
  - `utensils`, `coffee`, `scissors`, `sparkles`, `basket`, `washing`, `car`, `store`, `music` — same lucide names (`UtensilsCrossed, Coffee, Scissors, Sparkles, ShoppingBasket, WashingMachine, Car, Store, Music`)
  - `grid`, `menu`, `settings`, `logout`, `edit`, `trash`, `arrowUp/Down`, `layers`, `map`, `list` → `LayoutGrid, Menu, Settings, LogOut, Pencil, Trash2, ArrowUp, ArrowDown, Layers, Map, List`
- **LINE logo** — not in lucide. Inline SVG, see `icons.jsx` → `LineIcon`. One-path SVG with `<svg viewBox="0 0 24 24" fill="currentColor">…</svg>`. Copy verbatim.
- **Facebook logo** — also inline SVG, for the footer (existing in `home-footer.tsx`)
- **Listing photos** — placeholder gradients in the prototype. In production, use real images from Supabase Storage (`listings.image_urls[]`). Image components should use `next/image` with proper `sizes` and `priority` props for the LCP image.

---

## Source files reference

| File | What's in it |
|------|--------------|
| `src/data.jsx` | Sample data: `CATS`, `LISTINGS`, `TYPE_BADGES`, `fmtTH()`, `fmtCompact()`. Mirrors the production schema's shape — useful for understanding which fields matter to UI. |
| `src/icons.jsx` | The icon lookup. Every icon name used in the prototype maps to a lucide-react component (see "Assets" table above). |
| `src/shared.jsx` | Primitives: `buildTheme()` (CSS vars from a tweaks object), `Screen` (root wrapper), `ScrollArea`, `TopBar`, `IconBtn`, `Wordmark`, `TypeBadge`, `HeartBtn`, `Photo` (placeholder), `priceText()`, `priceUnit()`, `CategoryGrid` (renders categories in 4 modes — pick `icons` mode for V1), `ContactSheet`. |
| `src/v1-classic.jsx` | The 5 screens: `HomeV1`, `BrowseV1`, `DetailV1`, `SavedV1`, `ProfileV1`, plus internal helpers (`BottomTabs`, `CardV`, `CardRow`, `MapPanel`, `MapPin`, `FakeMap`, `Section`). |
| `assets/colors_and_type.css` | Full design-token sheet — colors + type + radii + spacing + shadows. The codebase's `globals.css` already mirrors this. |

---

## Implementation order (suggested)

1. **Tokens** — verify all color/spacing/radius values in `globals.css` match `assets/colors_and_type.css`. Add any missing tokens.
2. **Primitives** — build `<TypeBadge>`, `<HeartBtn>`, `<ListingCard>`, `<ListingRow>`, `<BottomNav>`, `<ContactSheet>` as reusable components.
3. **Home page** — `app/page.tsx` mobile layout. Wire to Supabase queries (already exist for categories + listings).
4. **Browse page** — `app/listings/page.tsx`. The list view first, then the map toggle (use `@vis.gl/react-google-maps` or `react-map-gl` — match what's already in the repo).
5. **Detail page** — `app/property/[slug]/page.tsx`. Hero + price block + description + amenities + map + seller + sticky contact bar.
6. **Saved page** — `app/saved/page.tsx`. Reuse `<ListingRow>`.
7. **Profile page** — `app/profile/page.tsx`. Mostly settings rows; the existing profile probably handles most of this.

Each step is a clean PR. Don't try to ship everything in one go.

---

## Out of scope for this handoff

- **Create listing wizard** (`/listings/new`) — 3-step form. The existing implementation works; only minor visual polish needed to match the new design language.
- **Auth flows** — login / register / forgot password. Existing pages stay.
- **Messages / chat** — existing.
- **Admin** — existing.
- **Desktop layout** — this design is mobile-first. Desktop should responsively widen to a 4-col grid for cards and use a sidebar/top-bar nav instead of bottom tabs (matches the current desktop pattern in `tonsagoon-lab/sengran`).

If we decide to extend the design to those surfaces, we'll do another round in the design environment first.

---

## Questions before you start

If anything in this README is ambiguous or contradicts what's already in the codebase, **stop and ask the user**. Don't guess. The voice of the existing codebase (its CLAUDE.md + how shadcn is wired + how Supabase queries are factored) is the ground truth — this handoff documents the *visual intent*, not the right way to wire it into Next.js.

Good luck. 🍊
