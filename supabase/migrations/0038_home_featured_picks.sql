-- Admin-curated "ประกาศแนะนำ" that pins listings to the very top of the home page
-- (above เซ้งร้านใกล้ฉัน). Separate from editorial_picks and from the paid
-- is_featured promotion. Listings here are deduped out of all other home sections.
create table if not exists home_featured_picks (
  id            serial primary key,
  listing_id    uuid not null references listings(id) on delete cascade,
  display_order int not null default 0,
  added_by      uuid references profiles(id),
  created_at    timestamptz not null default now(),
  unique(listing_id)
);

alter table home_featured_picks enable row level security;

create policy "home_featured_picks_select" on home_featured_picks
  for select using (true);
