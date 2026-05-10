create table if not exists rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  count         int not null default 1,
  primary key (key, window_start)
);

create index if not exists rate_limits_window_start_idx on rate_limits (window_start);

-- Auto-cleanup rows older than 1 hour (runs via the function itself)
create or replace function increment_rate_limit(
  p_key text,
  p_window_start timestamptz,
  p_limit int
) returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  -- Delete old windows
  delete from rate_limits where window_start < now() - interval '1 hour';

  insert into rate_limits (key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start)
  do update set count = rate_limits.count + 1
  returning count into v_count;

  return v_count;
end;
$$;

revoke all on function increment_rate_limit(text, timestamptz, int) from public;
grant execute on function increment_rate_limit(text, timestamptz, int) to service_role;
