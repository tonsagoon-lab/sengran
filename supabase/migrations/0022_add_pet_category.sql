insert into categories (name_th, slug, icon, display_order, is_active)
values (
  'ร้านสัตว์เลี้ยง',
  'pet-shop',
  'PawPrint',
  (select coalesce(max(display_order), 0) + 1 from categories),
  true
)
on conflict (slug) do nothing;
