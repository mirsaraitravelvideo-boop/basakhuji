-- ============================================================
-- বাসাখুঁজি বাংলাদেশ — Server-side functions v1 (Phase 2+)
-- Run AFTER schema.sql and rls.sql in Supabase SQL Editor.
-- All functions are SECURITY DEFINER: they enforce the rules
-- themselves (role checks inside), so clients can never bypass RLS.
-- The service-role key is NEVER needed by the web app.
-- ============================================================

-- ---------- account suspension flag (spec: admin can suspend accounts) ----------
alter table profiles add column if not exists is_suspended boolean not null default false;

-- ---------- Realtime for chat (messages table) ----------
do $$
begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then
  -- already a member; fine
  null;
end $$;

-- ---------- auto-create profile + role on signup ----------
-- Signup passes raw_user_meta_data: { full_name, phone, role }.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role := 'tenant';
begin
  if new.raw_user_meta_data ->> 'role' in ('tenant', 'landlord') then
    v_role := (new.raw_user_meta_data ->> 'role')::user_role;
  end if;
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '')
  )
  on conflict (id) do nothing;
  -- full_name is NOT NULL: fall back to email prefix if empty
  update public.profiles
  set full_name = split_part(new.email, '@', 1)
  where id = new.id and (full_name is null or full_name = '');
  insert into public.user_roles (user_id, role)
  values (new.id, v_role)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- my_role(): safe role lookup for the web app ----------
create or replace function public.my_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role from user_roles where user_id = auth.uid()),
    'tenant'::user_role
  );
$$;
grant execute on function public.my_role() to authenticated;

-- ---------- create_conversation_with_message ----------
-- Tenant/user contacts a landlord about an approved listing.
-- Reuses an existing 1:1 conversation for the same property.
create or replace function public.create_conversation_with_message(
  p_property_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv uuid;
  v_landlord uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'message body required';
  end if;
  select landlord_id into v_landlord
  from properties
  where id = p_property_id
    and status = 'approved'
    and (expires_at is null or expires_at > now());
  if not found then
    raise exception 'listing not available';
  end if;
  if v_landlord = auth.uid() then
    raise exception 'cannot message yourself';
  end if;

  select c.id into v_conv
  from conversations c
  join conversation_members m1 on m1.conversation_id = c.id and m1.user_id = auth.uid()
  join conversation_members m2 on m2.conversation_id = c.id and m2.user_id = v_landlord
  where c.property_id = p_property_id
  limit 1;

  if v_conv is null then
    insert into conversations (property_id, created_by)
    values (p_property_id, auth.uid())
    returning id into v_conv;
    insert into conversation_members (conversation_id, user_id)
    values (v_conv, auth.uid()), (v_conv, v_landlord);
  end if;

  insert into messages (conversation_id, sender_id, body)
  values (v_conv, auth.uid(), trim(p_body));

  return v_conv;
end;
$$;
grant execute on function public.create_conversation_with_message(uuid, text) to authenticated;

-- ---------- bump_listing_view ----------
create or replace function public.bump_listing_view(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update properties set view_count = view_count + 1 where id = p_id;
$$;
grant execute on function public.bump_listing_view(uuid) to anon, authenticated;

-- ---------- moderate_listing (staff only) ----------
create or replace function public.moderate_listing(
  p_id uuid,
  p_action text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old property_status;
begin
  if not public.is_staff() then
    raise exception 'forbidden: staff only';
  end if;
  if p_action not in ('approve', 'reject', 'suspend') then
    raise exception 'invalid action';
  end if;
  select status into v_old from properties where id = p_id;
  if not found then
    raise exception 'listing not found';
  end if;

  update properties
  set status = case p_action
                 when 'approve' then 'approved'::property_status
                 when 'reject'  then 'rejected'::property_status
                 else 'suspended'::property_status
               end,
      published_at = case
                       when p_action = 'approve' then coalesce(published_at, now())
                       else published_at
                     end
  where id = p_id;

  insert into audit_logs (actor_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'listing_' || p_action,
    'property',
    p_id,
    jsonb_build_object('from_status', v_old, 'note', p_note)
  );
end;
$$;
grant execute on function public.moderate_listing(uuid, text, text) to authenticated;

-- ---------- admin_stats (staff only): every number from real COUNTs ----------
create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.is_staff() then
    raise exception 'forbidden: staff only';
  end if;
  select jsonb_build_object(
    'users',            (select count(*) from profiles),
    'landlords',        (select count(*) from user_roles where role = 'landlord'),
    'tenants',          (select count(*) from user_roles where role = 'tenant'),
    'active_listings',  (select count(*) from properties where status = 'approved' and (expires_at is null or expires_at > now())),
    'pending_listings', (select count(*) from properties where status = 'pending'),
    'expired_listings', (select count(*) from properties where expires_at is not null and expires_at <= now()),
    'open_reports',     (select count(*) from reports where status = 'open'),
    'unread_messages',  null
  ) into v;
  return v;
end;
$$;
grant execute on function public.admin_stats() to authenticated;

-- ---------- admin_list_users (staff only) ----------
create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  full_name text,
  phone text,
  is_verified boolean,
  is_suspended boolean,
  role user_role,
  listings_count bigint,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden: staff only';
  end if;
  return query
  select p.id, p.full_name, p.phone, p.is_verified, p.is_suspended,
         coalesce(r.role, 'tenant'::user_role),
         (select count(*) from properties pr where pr.landlord_id = p.id),
         p.created_at
  from profiles p
  left join user_roles r on r.user_id = p.id
  order by p.created_at desc;
end;
$$;
grant execute on function public.admin_list_users() to authenticated;

-- ---------- set_user_role (super_admin only, cannot change self) ----------
create or replace function public.set_user_role(p_user uuid, p_role user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller user_role;
  v_old user_role;
begin
  select public.my_role() into v_caller;
  if v_caller <> 'super_admin' then
    raise exception 'forbidden: super_admin only';
  end if;
  if p_user = auth.uid() then
    raise exception 'cannot change your own role';
  end if;
  select role into v_old from user_roles where user_id = p_user;
  insert into user_roles (user_id, role, granted_by)
  values (p_user, p_role, auth.uid())
  on conflict (user_id) do update
    set role = excluded.role, granted_by = excluded.granted_by, granted_at = now();
  insert into audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'role_change', 'profile', p_user,
          jsonb_build_object('from', v_old, 'to', p_role));
end;
$$;
grant execute on function public.set_user_role(uuid, user_role) to authenticated;

-- ---------- set_user_suspended (admin/super_admin, cannot suspend self) ----------
create or replace function public.set_user_suspended(p_user uuid, p_suspended boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller user_role;
begin
  v_caller := public.my_role();
  if v_caller not in ('admin', 'super_admin') then
    raise exception 'forbidden: admin only';
  end if;
  if p_user = auth.uid() then
    raise exception 'cannot suspend yourself';
  end if;
  update profiles set is_suspended = p_suspended where id = p_user;
  insert into audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(),
          case when p_suspended then 'user_suspend' else 'user_reactivate' end,
          'profile', p_user, jsonb_build_object('suspended', p_suspended));
end;
$$;
grant execute on function public.set_user_suspended(uuid, boolean) to authenticated;

-- ---------- resolve_report (staff only) ----------
create or replace function public.resolve_report(
  p_id uuid,
  p_action text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden: staff only';
  end if;
  if p_action not in ('resolve', 'dismiss') then
    raise exception 'invalid action';
  end if;
  update reports
  set status = case when p_action = 'resolve' then 'resolved'::report_status else 'dismissed'::report_status end,
      resolved_by = auth.uid(),
      resolved_at = now()
  where id = p_id;
  if not found then
    raise exception 'report not found';
  end if;
  insert into audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'report_' || p_action, 'report', p_id, jsonb_build_object('note', p_note));
end;
$$;
grant execute on function public.resolve_report(uuid, text, text) to authenticated;

-- ---------- admin_recent_audit (staff only) ----------
create or replace function public.admin_recent_audit(p_limit int default 50)
returns table (
  id uuid,
  actor_id uuid,
  actor_name text,
  action text,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden: staff only';
  end if;
  return query
  select a.id, a.actor_id, p.full_name, a.action, a.target_type, a.target_id, a.details, a.created_at
  from audit_logs a
  left join profiles p on p.id = a.actor_id
  order by a.created_at desc
  limit greatest(1, least(p_limit, 200));
end;
$$;
grant execute on function public.admin_recent_audit(int) to authenticated;

-- ---------- conversation_peer (members only): safe display name for chat ----------
-- Reveals ONLY full_name + is_verified of the other participant to a fellow
-- member. RLS on profiles blocks cross-user reads, so the chat UI uses this.
create or replace function public.conversation_peer(p_conversation_id uuid)
returns table (full_name text, is_verified boolean)
language sql
security definer
stable
set search_path = public
as $$
  select p.full_name, p.is_verified
  from conversation_members m
  join profiles p on p.id = m.user_id
  where m.conversation_id = p_conversation_id
    and m.user_id <> auth.uid()
    and exists (
      select 1 from conversation_members m2
      where m2.conversation_id = p_conversation_id
        and m2.user_id = auth.uid()
    )
  limit 1;
$$;
grant execute on function public.conversation_peer(uuid) to authenticated;
