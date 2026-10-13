-- ============================================================
-- বাসাখুঁজি বাংলাদেশ — Migration 002: demand_by_area()
--
-- চাহিদা (demand) ম্যাপ লেয়ারের জন্য সমষ্টিগত ডেটা।
-- search_alerts.filters (jsonb) থেকে শুধু এলাকা/জেলা + সক্রিয়
-- অ্যালার্টের সংখ্যা বের করে — কোনো user_id, নাম, ফোন বা অন্য
-- ব্যক্তিগত তথ্য ফেরত দেয় না।
--
-- Run via Supabase Management API (idempotent — safe to rerun).
-- ============================================================

create or replace function demand_by_area()
returns table (
  district text,   -- লক্ষ্য জেলা (filters->>'district')
  area     text,   -- লক্ষ্য এলাকা (filters->>'area'), না থাকলে null
  seekers  int,    -- কতজন সক্রিয়ভাবে খুঁজছেন
  top_from text    -- সবচেয়ে বেশি কোন এলাকা থেকে খুঁজছেন (filters->>'from_area'), না থাকলে null
)
language sql
security definer
set search_path = public
stable
as $$
  with base as (
    select
      nullif(btrim(filters ->> 'district'),  '') as district,
      nullif(btrim(filters ->> 'area'),      '') as area,
      nullif(btrim(filters ->> 'from_area'), '') as from_area
    from search_alerts
    where is_active = true
  ),
  agg as (
    select district, area, count(*)::int as seekers
    from base
    where district is not null
    group by district, area
  ),
  origins as (
    select district, area, from_area,
           row_number() over (
             partition by district, area
             order by count(*) desc
           ) as rn
    from base
    where district is not null and from_area is not null
    group by district, area, from_area
  )
  select
    a.district,
    a.area,
    a.seekers,
    o.from_area as top_from
  from agg a
  left join origins o
    on o.district = a.district
   and o.area is not distinct from a.area
   and o.rn = 1
  order by a.seekers desc;
$$;

comment on function demand_by_area() is
  'চাহিদা ম্যাপ: প্রতি এলাকায় কতজন বাসা খুঁজছেন (সমষ্টিগত, ব্যক্তিগত তথ্যহীন)।';

-- বেস টেবিলের RLS অপরিবর্তিত; শুধু function-এ execute অনুমতি।
revoke all on function demand_by_area() from public;
grant execute on function demand_by_area() to anon, authenticated;
