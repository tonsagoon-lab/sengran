-- Track when images were removed (expiry)
alter table listings add column if not exists images_removed_at timestamptz;

-- Reports table
create table if not exists reports (
  id          serial primary key,
  listing_id  uuid not null references listings(id) on delete cascade,
  reporter_id uuid references profiles(id) on delete set null,
  reason      text not null,
  detail      text,
  status      text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at  timestamptz not null default now()
);

alter table reports enable row level security;

-- Authenticated users can insert reports
create policy "reports_insert" on reports
  for insert with check (auth.uid() is not null);

-- Only service role can read/update (admin via API)
