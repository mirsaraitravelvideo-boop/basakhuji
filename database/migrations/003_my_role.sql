-- ============================================================
-- বাসাখুঁজি বাংলাদেশ — Migration 003: my_role()
--
-- অ্যাপের রোল-চেক (getRole) এই RPC-এর উপর নির্ভরশীল, কিন্তু
-- ফাংশনটি ডাটাবেসে ছিল না — ফলে সবাই 'tenant' হিসেবে ফিরত
-- এবং অ্যাডমিন প্যানেলে ঢোকা যেত না। এই মাইগ্রেশন সেটি যোগ করে।
--
-- শুধু নিজের (auth.uid()) রোল ফেরত দেয় — অন্যেরটা নয়।
-- Run via Supabase Management API (idempotent — safe to rerun).
-- ============================================================

create or replace function my_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from user_roles where user_id = auth.uid()
$$;

comment on function my_role() is
  'বর্তমান ব্যবহারকারীর ভূমিকা (user_roles থেকে, শুধু নিজেরটা)।';

revoke all on function my_role() from public;
grant execute on function my_role() to anon, authenticated;
