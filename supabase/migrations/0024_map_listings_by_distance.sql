create or replace function map_listings_by_distance(
  user_lat float8,
  user_lng float8,
  p_offset int default 0,
  p_limit  int default 10
)
returns json
language sql
security definer
set search_path = public
as $$
  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  from (
    select
      l.id, l.slug, l.title, l.listing_type,
      l.sale_price, l.rent_price, l.latitude, l.longitude, l.district,
      (
        select coalesce(json_agg(json_build_object(
          'storage_path', li.storage_path,
          'display_order', li.display_order
        )), '[]'::json)
        from listing_images li where li.listing_id = l.id
      ) as listing_images,
      (
        select json_build_object('name_th', pr.name_th)
        from provinces pr where pr.id = l.province_id
      ) as provinces,
      (
        select json_build_object('name_th', c.name_th, 'slug', c.slug)
        from categories c where c.id = l.category_id
      ) as categories,
      (
        6371 * acos(least(1.0,
          cos(radians(user_lat)) * cos(radians(l.latitude)) *
          cos(radians(l.longitude) - radians(user_lng)) +
          sin(radians(user_lat)) * sin(radians(l.latitude))
        ))
      ) as distance_km
    from listings l
    where l.status = 'published'
      and l.latitude  is not null
      and l.longitude is not null
    order by distance_km asc
    offset p_offset
    limit  p_limit
  ) t
$$;

revoke all on function map_listings_by_distance(float8,float8,int,int) from public;
grant execute on function map_listings_by_distance(float8,float8,int,int) to anon, authenticated;
