-- ============================================================
-- বাসাখুঁজি বাংলাদেশ — Seed data (নমুনা লিস্টিং + নোটিস)
-- Run AFTER: schema.sql + rls.sql, and AFTER at least one user
-- has signed up (a landlord profile is required).
--
-- Idempotent: safe to rerun. Existing listing_no rows are kept.
-- ALL seed descriptions start with '[নমুনা] ' so the owner can
-- identify and delete the samples later.
--
-- NOTE on images: storage_path values starting with 'seed-images/'
-- are served from Next.js /public/seed-images/ by the app's image
-- helper — no Supabase Storage upload is needed for these seeds.
-- ============================================================

do $$
declare
  v_landlord uuid;
  v_pid      uuid;
begin
  -- 1) find a landlord (prefer explicit landlord role)
  select p.id into v_landlord
    from profiles p
    join user_roles r on r.user_id = p.id
   where r.role = 'landlord'
   limit 1;

  if v_landlord is null then
    select id into v_landlord from profiles limit 1;
  end if;

  if v_landlord is null then
    raise notice 'SEED SKIPPED: no user profile exists — sign up as landlord first, then rerun this file';
    return;
  end if;

  -- ==========================================================
  -- 2) properties (10 sample listings: BK-000101 .. BK-000110)
  -- ==========================================================

  -- BK-000101: মিরপুর, ঢাকা — ২ বেড ফ্ল্যাট
  insert into properties (listing_no, landlord_id, title, description, property_type,
    district, upazila, area, address_text, latitude, longitude,
    monthly_rent, advance_amount, security_deposit, bedrooms, bathrooms, size_sqft,
    floor_no, furnished, available_from, status, is_verified, published_at, expires_at)
  values ('BK-000101', v_landlord,
    'মিরপুরে আলো-বাতাসপূর্ণ ২ বেডরুম ফ্ল্যাট',
    '[নমুনা] মিরপুর ১০-এর কাছে আলো-বাতাসপূর্ণ ২ বেডরুম ফ্ল্যাট। ড্রয়িং-ডাইনিং আলাদা, রান্নাঘরে গ্যাসের ব্যবস্থা আছে। পরিবারের জন্য উপযুক্ত, নিরাপদ এলাকা।',
    'flat', 'ঢাকা', 'মিরপুর', 'মিরপুর ১০', 'বাড়ি ১২, রোড ৫, মিরপুর ১০, ঢাকা',
    23.8223, 90.3654, 12000, 24000, 24000, 2, 2, 950, 3, 'unfurnished',
    current_date, 'approved', true, now(), now() + interval '60 days')
  on conflict (listing_no) do nothing;

  -- BK-000102: উত্তরা, ঢাকা — ৩ বেড ফ্ল্যাট, লিফট
  insert into properties (listing_no, landlord_id, title, description, property_type,
    district, upazila, area, address_text, latitude, longitude,
    monthly_rent, advance_amount, security_deposit, bedrooms, bathrooms, size_sqft,
    floor_no, furnished, available_from, status, is_verified, published_at, expires_at)
  values ('BK-000102', v_landlord,
    'উত্তরায় লিফটসহ ৩ বেডরুম ফ্ল্যাট',
    '[নমুনা] উত্তরা সেক্টর ১১-এ লিফট ও জেনারেটরসহ আধুনিক ৩ বেডরুম ফ্ল্যাট। বড় ব্যালকনি, পার্কিং সুবিধা আছে। অফিসগামী ও পরিবারের জন্য আদর্শ।',
    'flat', 'ঢাকা', 'উত্তরা', 'উত্তরা সেক্টর ১১', 'হাউস ২৫, রোড ১৮, সেক্টর ১১, উত্তরা, ঢাকা',
    23.8759, 90.3795, 18000, 36000, 36000, 3, 2, 1250, 5, 'unfurnished',
    current_date, 'approved', true, now(), now() + interval '60 days')
  on conflict (listing_no) do nothing;

  -- BK-000103: ধানমন্ডি, ঢাকা — ফার্নিশড ৩ বেড
  insert into properties (listing_no, landlord_id, title, description, property_type,
    district, upazila, area, address_text, latitude, longitude,
    monthly_rent, advance_amount, security_deposit, bedrooms, bathrooms, size_sqft,
    floor_no, furnished, available_from, status, is_verified, published_at, expires_at)
  values ('BK-000103', v_landlord,
    'ধানমন্ডিতে সম্পূর্ণ ফার্নিশড ৩ বেডরুম ফ্ল্যাট',
    '[নমুনা] ধানমন্ডি ২৭-এ সম্পূর্ণ ফার্নিশড ৩ বেডরুম ফ্ল্যাট — এসি, ফ্রিজ, ওয়াশিং মেশিনসহ সব আসবাব। লেকের কাছে, শান্ত পরিবেশ।',
    'flat', 'ঢাকা', 'ধানমন্ডি', 'ধানমন্ডি ২৭', 'বাড়ি ৮, রোড ২৭, ধানমন্ডি, ঢাকা',
    23.7461, 90.3742, 35000, 70000, 70000, 3, 3, 1600, 4, 'furnished',
    current_date, 'approved', true, now(), now() + interval '60 days')
  on conflict (listing_no) do nothing;

  -- BK-000104: মিরপুর, ঢাকা — ১ বেড রুম (সিঙ্গেল)
  insert into properties (listing_no, landlord_id, title, description, property_type,
    district, upazila, area, address_text, latitude, longitude,
    monthly_rent, advance_amount, security_deposit, bedrooms, bathrooms, size_sqft,
    floor_no, furnished, available_from, status, is_verified, published_at, expires_at)
  values ('BK-000104', v_landlord,
    'মিরপুরে সিঙ্গেল রুম (১ বেডরুম)',
    '[নমুনা] মিরপুর ১-এ একজনের জন্য ছোট ১ বেডরুম রুম। আধা-ফার্নিশড, ওয়াইফাই সুবিধা। ছাত্র বা চাকরিজীবীর জন্য উপযুক্ত।',
    'room', 'ঢাকা', 'মিরপুর', 'মিরপুর ১', 'বাড়ি ৩, রোড ২, মিরপুর ১, ঢাকা',
    23.8223, 90.3654, 8500, 17000, 17000, 1, 1, 250, 2, 'semi_furnished',
    current_date, 'approved', false, now(), now() + interval '60 days')
  on conflict (listing_no) do nothing;

  -- BK-000105: উত্তরা, ঢাকা — বাড়ি (house)
  insert into properties (listing_no, landlord_id, title, description, property_type,
    district, upazila, area, address_text, latitude, longitude,
    monthly_rent, advance_amount, security_deposit, bedrooms, bathrooms, size_sqft,
    floor_no, furnished, available_from, status, is_verified, published_at, expires_at)
  values ('BK-000105', v_landlord,
    'উত্তরায় একতলা বাড়ি (৩ বেডরুম)',
    '[নমুনা] উত্তরা সেক্টর ৭-এ একতলা স্বতন্ত্র বাড়ি। সামনে উঠান ও পার্কিং জায়গা। বড় পরিবারের জন্য উপযুক্ত।',
    'house', 'ঢাকা', 'উত্তরা', 'উত্তরা সেক্টর ৭', 'হাউস ৪০, রোড ৯, সেক্টর ৭, উত্তরা, ঢাকা',
    23.8759, 90.3795, 22000, 44000, 44000, 3, 2, 1400, 1, 'unfurnished',
    current_date, 'approved', true, now(), now() + interval '60 days')
  on conflict (listing_no) do nothing;

  -- BK-000106: আগ্রাবাদ, চট্টগ্রাম — ২ বেড ফ্ল্যাট
  insert into properties (listing_no, landlord_id, title, description, property_type,
    district, upazila, area, address_text, latitude, longitude,
    monthly_rent, advance_amount, security_deposit, bedrooms, bathrooms, size_sqft,
    floor_no, furnished, available_from, status, is_verified, published_at, expires_at)
  values ('BK-000106', v_landlord,
    'আগ্রাবাদে লিফটসহ ২ বেডরুম ফ্ল্যাট',
    '[নমুনা] আগ্রাবাদ বাণিজ্যিক এলাকার কাছে লিফটসহ ২ বেডরুম ফ্ল্যাট। অফিস ও বাজারের কাছাকাছি, যোগাযোগ সুবিধাজনক।',
    'flat', 'চট্টগ্রাম', null, 'আগ্রাবাদ', 'বাড়ি ১৫, আগ্রাবাদ, চট্টগ্রাম',
    22.3235, 91.8113, 15000, 30000, 30000, 2, 2, 1050, 4, 'unfurnished',
    current_date, 'approved', true, now(), now() + interval '60 days')
  on conflict (listing_no) do nothing;

  -- BK-000107: হালিশহর, চট্টগ্রাম — ২ বেড ফ্ল্যাট
  insert into properties (listing_no, landlord_id, title, description, property_type,
    district, upazila, area, address_text, latitude, longitude,
    monthly_rent, advance_amount, security_deposit, bedrooms, bathrooms, size_sqft,
    floor_no, furnished, available_from, status, is_verified, published_at, expires_at)
  values ('BK-000107', v_landlord,
    'হালিশহরে সাশ্রয়ী ২ বেডরুম ফ্ল্যাট',
    '[নমুনা] হালিশহরে সাশ্রয়ী দামে ২ বেডরুম ফ্ল্যাট। স্কুল-কলেজের কাছে, পরিবারের জন্য নিরাপদ আবাসিক এলাকা।',
    'flat', 'চট্টগ্রাম', null, 'হালিশহর', 'বাড়ি ৭, ব্লক এ, হালিশহর, চট্টগ্রাম',
    22.3239, 91.7720, 10000, 20000, 20000, 2, 1, 900, 2, 'unfurnished',
    current_date, 'approved', false, now(), now() + interval '60 days')
  on conflict (listing_no) do nothing;

  -- BK-000108: মিরসরাই, চট্টগ্রাম — ২ বেড ফ্ল্যাট
  insert into properties (listing_no, landlord_id, title, description, property_type,
    district, upazila, area, address_text, latitude, longitude,
    monthly_rent, advance_amount, security_deposit, bedrooms, bathrooms, size_sqft,
    floor_no, furnished, available_from, status, is_verified, published_at, expires_at)
  values ('BK-000108', v_landlord,
    'মিরসরাই সদরে ২ বেডরুম ফ্ল্যাট',
    '[নমুনা] মিরসরাই সদরে নতুন ভবনে ২ বেডরুম ফ্ল্যাট। বাজারের কাছে, পার্কিং সুবিধাসহ।',
    'flat', 'চট্টগ্রাম', 'মিরসরাই', 'মিরসরাই সদর', 'মিরসরাই সদর, চট্টগ্রাম',
    22.7811, 91.5753, 7000, 14000, 14000, 2, 1, 800, 2, 'unfurnished',
    current_date, 'approved', true, now(), now() + interval '60 days')
  on conflict (listing_no) do nothing;

  -- BK-000109: ধানমন্ডি, ঢাকা — সাবলেট
  insert into properties (listing_no, landlord_id, title, description, property_type,
    district, upazila, area, address_text, latitude, longitude,
    monthly_rent, advance_amount, security_deposit, bedrooms, bathrooms, size_sqft,
    floor_no, furnished, available_from, status, is_verified, published_at, expires_at)
  values ('BK-000109', v_landlord,
    'ধানমন্ডিতে ফার্নিশড সাবলেট (২ বেডরুম)',
    '[নমুনা] ধানমন্ডিতে বড় ফ্ল্যাটের একটি অংশ সাবলেট হিসেবে ভাড়া। সম্পূর্ণ ফার্নিশড, শেয়ার্ড ড্রয়িং-ডাইনিং। ছোট পরিবারের জন্য ভালো।',
    'sublet', 'ঢাকা', 'ধানমন্ডি', 'ধানমন্ডি ৮', 'বাড়ি ১১, রোড ৮, ধানমন্ডি, ঢাকা',
    23.7461, 90.3742, 28000, 28000, 56000, 2, 2, 1100, 3, 'furnished',
    current_date, 'approved', false, now(), now() + interval '60 days')
  on conflict (listing_no) do nothing;

  -- BK-000110: আগ্রাবাদ, চট্টগ্রাম — অফিস
  insert into properties (listing_no, landlord_id, title, description, property_type,
    district, upazila, area, address_text, latitude, longitude,
    monthly_rent, advance_amount, security_deposit, bedrooms, bathrooms, size_sqft,
    floor_no, furnished, available_from, status, is_verified, published_at, expires_at)
  values ('BK-000110', v_landlord,
    'আগ্রাবাদে অফিস স্পেস (৭০০ বর্গফুট)',
    '[নমুনা] আগ্রাবাদ বাণিজ্যিক এলাকায় ৭০০ বর্গফুট অফিস স্পেস। লিফট ও জেনারেটর সুবিধা। কর্পোরেট অফিসের জন্য উপযুক্ত।',
    'office', 'চট্টগ্রাম', null, 'আগ্রাবাদ', 'বাণিজ্যিক ভবন, আগ্রাবাদ, চট্টগ্রাম',
    22.3235, 91.8113, 13000, 26000, 26000, null, 2, 700, 6, 'unfurnished',
    current_date, 'approved', true, now(), now() + interval '60 days')
  on conflict (listing_no) do nothing;

  -- ==========================================================
  -- 3) images: storage_path starting with 'seed-images/' is
  --    served from /public/seed-images/ by the app image helper
  -- ==========================================================

  -- BK-000101
  select id into v_pid from properties where listing_no = 'BK-000101';
  -- idempotent rerun: clear this listing's seed images, then reinsert
  delete from property_images where property_id = v_pid;
  insert into property_images (property_id, storage_path, sort_order, is_primary) values
    (v_pid, 'seed-images/flat-1.jpg', 0, true),
    (v_pid, 'seed-images/flat-3.jpg', 1, false);

  -- BK-000102
  select id into v_pid from properties where listing_no = 'BK-000102';
  -- idempotent rerun: clear this listing's seed images, then reinsert
  delete from property_images where property_id = v_pid;
  insert into property_images (property_id, storage_path, sort_order, is_primary) values
    (v_pid, 'seed-images/flat-2.jpg', 0, true),
    (v_pid, 'seed-images/flat-4.jpg', 1, false);

  -- BK-000103
  select id into v_pid from properties where listing_no = 'BK-000103';
  -- idempotent rerun: clear this listing's seed images, then reinsert
  delete from property_images where property_id = v_pid;
  insert into property_images (property_id, storage_path, sort_order, is_primary) values
    (v_pid, 'seed-images/flat-7.jpg', 0, true),
    (v_pid, 'seed-images/flat-4.jpg', 1, false);

  -- BK-000104
  select id into v_pid from properties where listing_no = 'BK-000104';
  -- idempotent rerun: clear this listing's seed images, then reinsert
  delete from property_images where property_id = v_pid;
  insert into property_images (property_id, storage_path, sort_order, is_primary) values
    (v_pid, 'seed-images/flat-4.jpg', 0, true);

  -- BK-000105
  select id into v_pid from properties where listing_no = 'BK-000105';
  -- idempotent rerun: clear this listing's seed images, then reinsert
  delete from property_images where property_id = v_pid;
  insert into property_images (property_id, storage_path, sort_order, is_primary) values
    (v_pid, 'seed-images/flat-8.jpg', 0, true),
    (v_pid, 'seed-images/flat-5.jpg', 1, false);

  -- BK-000106
  select id into v_pid from properties where listing_no = 'BK-000106';
  -- idempotent rerun: clear this listing's seed images, then reinsert
  delete from property_images where property_id = v_pid;
  insert into property_images (property_id, storage_path, sort_order, is_primary) values
    (v_pid, 'seed-images/flat-2.jpg', 0, true),
    (v_pid, 'seed-images/flat-3.jpg', 1, false);

  -- BK-000107
  select id into v_pid from properties where listing_no = 'BK-000107';
  -- idempotent rerun: clear this listing's seed images, then reinsert
  delete from property_images where property_id = v_pid;
  insert into property_images (property_id, storage_path, sort_order, is_primary) values
    (v_pid, 'seed-images/flat-3.jpg', 0, true),
    (v_pid, 'seed-images/flat-6.jpg', 1, false);

  -- BK-000108
  select id into v_pid from properties where listing_no = 'BK-000108';
  -- idempotent rerun: clear this listing's seed images, then reinsert
  delete from property_images where property_id = v_pid;
  insert into property_images (property_id, storage_path, sort_order, is_primary) values
    (v_pid, 'seed-images/flat-1.jpg', 0, true),
    (v_pid, 'seed-images/flat-8.jpg', 1, false);

  -- BK-000109
  select id into v_pid from properties where listing_no = 'BK-000109';
  -- idempotent rerun: clear this listing's seed images, then reinsert
  delete from property_images where property_id = v_pid;
  insert into property_images (property_id, storage_path, sort_order, is_primary) values
    (v_pid, 'seed-images/flat-7.jpg', 0, true),
    (v_pid, 'seed-images/flat-5.jpg', 1, false);

  -- BK-000110
  select id into v_pid from properties where listing_no = 'BK-000110';
  -- idempotent rerun: clear this listing's seed images, then reinsert
  delete from property_images where property_id = v_pid;
  insert into property_images (property_id, storage_path, sort_order, is_primary) values
    (v_pid, 'seed-images/flat-6.jpg', 0, true),
    (v_pid, 'seed-images/flat-2.jpg', 1, false);

  -- ==========================================================
  -- 4) amenities (canonical slugs)
  -- ==========================================================

  select id into v_pid from properties where listing_no = 'BK-000101';
  insert into property_amenities (property_id, amenity) values
    (v_pid, 'gas'), (v_pid, 'parking'), (v_pid, 'wifi')
  on conflict do nothing;

  select id into v_pid from properties where listing_no = 'BK-000102';
  insert into property_amenities (property_id, amenity) values
    (v_pid, 'gas'), (v_pid, 'lift'), (v_pid, 'parking'), (v_pid, 'generator')
  on conflict do nothing;

  select id into v_pid from properties where listing_no = 'BK-000103';
  insert into property_amenities (property_id, amenity) values
    (v_pid, 'gas'), (v_pid, 'lift'), (v_pid, 'parking'), (v_pid, 'wifi'),
    (v_pid, 'generator'), (v_pid, 'ac')
  on conflict do nothing;

  select id into v_pid from properties where listing_no = 'BK-000104';
  insert into property_amenities (property_id, amenity) values
    (v_pid, 'gas'), (v_pid, 'wifi')
  on conflict do nothing;

  select id into v_pid from properties where listing_no = 'BK-000105';
  insert into property_amenities (property_id, amenity) values
    (v_pid, 'gas'), (v_pid, 'parking')
  on conflict do nothing;

  select id into v_pid from properties where listing_no = 'BK-000106';
  insert into property_amenities (property_id, amenity) values
    (v_pid, 'gas'), (v_pid, 'lift'), (v_pid, 'parking')
  on conflict do nothing;

  select id into v_pid from properties where listing_no = 'BK-000107';
  insert into property_amenities (property_id, amenity) values
    (v_pid, 'gas')
  on conflict do nothing;

  select id into v_pid from properties where listing_no = 'BK-000108';
  insert into property_amenities (property_id, amenity) values
    (v_pid, 'gas'), (v_pid, 'parking')
  on conflict do nothing;

  select id into v_pid from properties where listing_no = 'BK-000109';
  insert into property_amenities (property_id, amenity) values
    (v_pid, 'gas'), (v_pid, 'lift'), (v_pid, 'wifi')
  on conflict do nothing;

  select id into v_pid from properties where listing_no = 'BK-000110';
  insert into property_amenities (property_id, amenity) values
    (v_pid, 'lift'), (v_pid, 'parking'), (v_pid, 'generator')
  on conflict do nothing;

  -- ==========================================================
  -- 5) notices (2 sample notices, guarded by NOT EXISTS)
  -- ==========================================================

  if not exists (select 1 from notices where title like '[নমুনা]%') then
    insert into notices (title, body, notice_type, priority, target_audience,
      is_published, published_at, created_by)
    values
      ('[নমুনা] স্বাগতম — প্ল্যাটফর্ম চালু হয়েছে',
       '[নমুনা] বাসাখুঁজি বাংলাদেশ প্ল্যাটফর্মে আপনাকে স্বাগতম! এখান থেকে আপনি সহজে বাসা খুঁজতে বা ভাড়া দিতে পারবেন। এটি একটি নমুনা নোটিস — প্রকৃত তথ্য দিয়ে প্রতিস্থাপন করুন।',
       'announcement', 10, 'all', true, now(), v_landlord),
      ('[নমুনা] নির্ধারিত রক্ষণাবেক্ষণ',
       '[নমুনা] আগামী শুক্রবার রাত ২টা থেকে ৪টা পর্যন্ত সিস্টেম রক্ষণাবেক্ষণের জন্য সাইট সাময়িকভাবে বন্ধ থাকতে পারে। এটি একটি নমুনা নোটিস।',
       'maintenance', 5, 'all', true, now(), v_landlord);
  end if;

  raise notice 'SEED DONE: sample listings + notices inserted (rerun is safe)';
end $$;
