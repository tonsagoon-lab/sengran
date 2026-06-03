create table if not exists site_settings (
  key   text primary key,
  value text not null
);

alter table site_settings enable row level security;

create policy "public read site_settings"
  on site_settings for select using (true);

create policy "service role write site_settings"
  on site_settings for all using (auth.role() = 'service_role');

insert into site_settings (key, value) values
  ('show_view_count', 'true')
on conflict (key) do nothing;
