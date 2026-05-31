alter table listings
  add column if not exists revenue_amount integer,
  add column if not exists revenue_period text check (revenue_period in ('yearly', 'quarterly_avg', 'monthly_last'));
