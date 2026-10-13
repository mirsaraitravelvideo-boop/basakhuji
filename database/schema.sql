-- ============================================================
-- বাসাখুঁজি বাংলাদেশ — Database Schema v1 (Phase 1)
-- Target: Supabase Postgres (free tier)
-- Run: Supabase Dashboard → SQL Editor → paste & run
-- Conventions: UUID PKs, created_at/updated_at everywhere,
-- FK ownership, CHECK constraints on money/counts.
-- Auth data (passwords/keys) lives ONLY in Supabase Auth,
-- never in these tables.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type user_role as enum ('tenant','landlord','moderator','admin','super_admin');
create type property_status as enum ('draft','pending','approved','rejected','suspended','expired','rented','inactive');
create type property_type as enum ('flat','house','room','sublet','office','shop','plot');
create type furnished_state as enum ('unfurnished','semi_furnished','furnished');
create type notice_type as enum ('information','announcement','maintenance','safety_alert','policy_update');
create type audience as enum ('all','tenants','landlords');
create type report_status as enum ('open','in_review','resolved','dismissed');
create type payment_status as enum ('pending','success','failed','refunded');

-- ---------- profiles (1:1 with auth.users) ----------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text,
  avatar_url  text,
  is_verified boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- user_roles (server-side only; client never reads) ----------
create table user_roles (
  user_id    uuid primary key references profiles(id) on delete cascade,
  role       user_role not null default 'tenant',
  granted_by uuid references profiles(id) on delete set null,
  granted_at timestamptz not null default now()
);

-- ---------- properties ----------
create table properties (
  id              uuid primary key default gen_random_uuid(),
  listing_no      text unique not null,              -- human-readable unique ID, e.g. BK-000123
  landlord_id     uuid not null references profiles(id) on delete restrict,
  title           text not null,
  description     text,
  property_type   property_type not null,
  district        text not null,
  upazila         text,
  area            text not null,
  address_text    text,
  latitude        double precision,
  longitude       double precision,
  monthly_rent    integer not null check (monthly_rent >= 0),
  advance_amount  integer check (advance_amount is null or advance_amount >= 0),
  security_deposit integer check (security_deposit is null or security_deposit >= 0),
  bedrooms        smallint check (bedrooms is null or bedrooms >= 0),
  bathrooms       smallint check (bathrooms is null or bathrooms >= 0),
  size_sqft       integer check (size_sqft is null or size_sqft >= 0),
  floor_no        smallint,
  furnished       furnished_state not null default 'unfurnished',
  available_from  date,
  status          property_status not null default 'draft',
  is_verified     boolean not null default false,
  published_at    timestamptz,
  expires_at      timestamptz,
  view_count      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table property_images (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  storage_path text not null,                        -- path inside 'property-images' bucket
  sort_order  smallint not null default 0,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);

create table property_amenities (
  property_id uuid not null references properties(id) on delete cascade,
  amenity     text not null,                         -- canonical slug: gas, lift, parking, generator...
  primary key (property_id, amenity)
);

-- ---------- tenant side ----------
create table saved_properties (
  user_id     uuid not null references profiles(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table search_alerts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  filters    jsonb not null default '{}',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- messaging ----------
create table conversations (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete set null,
  created_by  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  body            text,
  attachment_path text,                              -- path inside 'chat-attachments' bucket
  is_read         boolean not null default false,
  created_at      timestamptz not null default now(),
  check (body is not null or attachment_path is not null)
);

-- ---------- notices & notifications ----------
create table notices (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  body            text not null,
  notice_type     notice_type not null default 'information',
  priority        smallint not null default 0,
  target_audience audience not null default 'all',
  is_published    boolean not null default false,
  published_at    timestamptz,
  expires_at      timestamptz,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,                           -- new_message, listing_approved, ...
  title      text not null,
  body       text,
  ref_type   text,
  ref_id     uuid,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- reports ----------
create table reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references profiles(id) on delete cascade,
  property_id      uuid references properties(id) on delete set null,
  reported_user_id uuid references profiles(id) on delete set null,
  reason           text not null,
  details          text,
  status           report_status not null default 'open',
  resolved_by      uuid references profiles(id) on delete set null,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now()
);

-- ---------- payments (future-ready; sandbox only until approved gateway) ----------
create table subscription_plans (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  price         integer not null default 0 check (price >= 0),
  duration_days integer not null default 30,
  features      jsonb not null default '[]',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table payment_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  plan_id     uuid references subscription_plans(id) on delete set null,
  amount      integer not null check (amount >= 0),
  currency    text not null default 'BDT',
  gateway     text,
  gateway_ref text unique,
  status      payment_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- audit & settings ----------
create table audit_logs (                             -- append-only; service role only
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   uuid,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create table app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- indexes (search-critical) ----------
create index idx_properties_status_published on properties (status, published_at desc);
create index idx_properties_district_area   on properties (district, area);
create index idx_properties_rent            on properties (monthly_rent);
create index idx_properties_location        on properties (latitude, longitude);
create index idx_properties_landlord        on properties (landlord_id);
create index idx_property_images_property   on property_images (property_id, sort_order);
create index idx_messages_conversation       on messages (conversation_id, created_at);
create index idx_conversation_members_user   on conversation_members (user_id);
create index idx_notifications_user          on notifications (user_id, is_read, created_at desc);
create index idx_notices_published            on notices (is_published, published_at desc);
create index idx_reports_status               on reports (status, created_at desc);
create index idx_audit_actor                   on audit_logs (actor_id, created_at desc);

-- ---------- updated_at auto-maintenance ----------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated  before update on profiles            for each row execute function set_updated_at();
create trigger trg_properties_updated before update on properties          for each row execute function set_updated_at();
create trigger trg_conversations_updated before update on conversations   for each row execute function set_updated_at();
create trigger trg_notices_updated   before update on notices             for each row execute function set_updated_at();
create trigger trg_payments_updated  before update on payment_transactions for each row execute function set_updated_at();
create trigger trg_settings_updated  before update on app_settings         for each row execute function set_updated_at();

-- ---------- messages are immutable (edit = new message) ----------
create or replace function forbid_message_edit() returns trigger as $$
begin
  if new.body is distinct from old.body or new.attachment_path is distinct from old.attachment_path
     or new.sender_id is distinct from old.sender_id or new.conversation_id is distinct from old.conversation_id then
    raise exception 'messages are immutable; send a new message instead';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_messages_immutable before update on messages for each row execute function forbid_message_edit();
