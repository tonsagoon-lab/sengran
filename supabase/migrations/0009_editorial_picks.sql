create table if not exists editorial_picks (
  id          serial primary key,
  listing_id  uuid not null references listings(id) on delete cascade,
  display_order int not null default 0,
  added_by    uuid references profiles(id),
  created_at  timestamptz not null default now(),
  unique(listing_id)
);

alter table editorial_picks enable row level security;

-- Public can read picks (for homepage display)
create policy "editorial_picks_select" on editorial_picks
  for select using (true);

-- Only authenticated users whose email is admin/staff can insert/update/delete
-- (enforced at API level; RLS uses service role client which bypasses policies)
