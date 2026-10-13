-- ============================================================
-- বাসাখুঁজি বাংলাদেশ — Row Level Security v1 (Phase 1)
-- Run AFTER schema.sql in Supabase SQL Editor.
-- Principle: DENY BY DEFAULT. Every table gets RLS enabled;
-- only explicit allow-policies below grant access.
-- Frontend NEVER holds the service-role key.
-- ============================================================

alter table profiles             enable row level security;
alter table user_roles           enable row level security;
alter table properties           enable row level security;
alter table property_images      enable row level security;
alter table property_amenities   enable row level security;
alter table saved_properties     enable row level security;
alter table search_alerts        enable row level security;
alter table conversations        enable row level security;
alter table conversation_members enable row level security;
alter table messages             enable row level security;
alter table notices              enable row level security;
alter table notifications        enable row level security;
alter table reports              enable row level security;
alter table subscription_plans   enable row level security;
alter table payment_transactions enable row level security;
alter table audit_logs           enable row level security;
alter table app_settings         enable row level security;

-- ---------- helpers (security definer: can read user_roles which clients cannot) ----------
create or replace function public.is_staff() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role in ('moderator','admin','super_admin')
  );
$$;

create or replace function public.is_approved_listing(p_property_id uuid) returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from properties
    where id = p_property_id
      and status = 'approved'
      and (expires_at is null or expires_at > now())
  );
$$;

-- Public contact card for an approved listing (privacy by design:
-- only name/phone/verified, nothing else from profiles).
create or replace function public.listing_owner(p_property_id uuid)
returns table (full_name text, phone text, is_verified boolean)
language sql security definer stable as $$
  select p.full_name, p.phone, p.is_verified
  from profiles p
  join properties pr on pr.landlord_id = p.id
  where pr.id = p_property_id
    and pr.status = 'approved'
    and (pr.expires_at is null or pr.expires_at > now());
$$;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_approved_listing(uuid) to anon, authenticated;
grant execute on function public.listing_owner(uuid) to anon, authenticated;

-- ---------- profiles ----------
create policy profiles_select_own_or_staff on profiles for select to authenticated
  using (auth.uid() = id or public.is_staff());
create policy profiles_insert_self on profiles for insert to authenticated
  with check (auth.uid() = id);
create policy profiles_update_self on profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
-- NOTE: is_verified can only be flipped by staff via service role / edge function.

-- ---------- user_roles: NO client access at all (service role only) ----------
-- (intentionally no policies)

-- ---------- properties ----------
create policy properties_select_public on properties for select to anon, authenticated
  using (status = 'approved' and (expires_at is null or expires_at > now()));
create policy properties_select_owner_staff on properties for select to authenticated
  using (landlord_id = auth.uid() or public.is_staff());
create policy properties_insert_landlord on properties for insert to authenticated
  with check (landlord_id = auth.uid() and status in ('draft','pending'));
create policy properties_update_owner on properties for update to authenticated
  using (landlord_id = auth.uid() or public.is_staff())
  with check (
    landlord_id = auth.uid()
    and status in ('draft','pending','inactive','rented')  -- owner can never self-approve
  );
-- No delete policy: listings are retired via status, never hard-deleted by clients.

-- ---------- property_images ----------
create policy pimg_select on property_images for select to anon, authenticated
  using (
    public.is_approved_listing(property_id)
    or exists (select 1 from properties p where p.id = property_id and p.landlord_id = auth.uid())
    or public.is_staff()
  );
create policy pimg_write_owner on property_images for all to authenticated
  using (
    exists (select 1 from properties p where p.id = property_id and (p.landlord_id = auth.uid() or public.is_staff()))
  )
  with check (
    exists (select 1 from properties p where p.id = property_id and (p.landlord_id = auth.uid() or public.is_staff()))
  );

-- ---------- property_amenities ----------
create policy pam_select on property_amenities for select to anon, authenticated
  using (
    public.is_approved_listing(property_id)
    or exists (select 1 from properties p where p.id = property_id and p.landlord_id = auth.uid())
    or public.is_staff()
  );
create policy pam_write_owner on property_amenities for all to authenticated
  using (
    exists (select 1 from properties p where p.id = property_id and (p.landlord_id = auth.uid() or public.is_staff()))
  )
  with check (
    exists (select 1 from properties p where p.id = property_id and (p.landlord_id = auth.uid() or public.is_staff()))
  );

-- ---------- saved_properties / search_alerts / notifications: owner only ----------
create policy saved_all_owner on saved_properties for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy alerts_all_owner on search_alerts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_all_owner on notifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- (notifications are created for users by edge functions via service role)

-- ---------- conversations ----------
create policy conv_select_member on conversations for select to authenticated
  using (
    exists (select 1 from conversation_members m where m.conversation_id = id and m.user_id = auth.uid())
    or public.is_staff()
  );
create policy conv_insert_auth on conversations for insert to authenticated
  with check (created_by = auth.uid());

-- ---------- conversation_members ----------
create policy cm_select_member on conversation_members for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from conversation_members m2 where m2.conversation_id = conversation_id and m2.user_id = auth.uid())
    or public.is_staff()
  );
create policy cm_insert_controlled on conversation_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from conversations c
      left join properties p on p.id = c.property_id
      where c.id = conversation_id
        and (c.created_by = auth.uid() or p.landlord_id = auth.uid())
    )
  );
-- No update/delete: membership is append-only for clients.

-- ---------- messages ----------
create policy msg_select_member on messages for select to authenticated
  using (
    exists (select 1 from conversation_members m where m.conversation_id = messages.conversation_id and m.user_id = auth.uid())
    or public.is_staff()
  );
create policy msg_insert_member on messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (select 1 from conversation_members m where m.conversation_id = messages.conversation_id and m.user_id = auth.uid())
  );
create policy msg_update_read_receipt on messages for update to authenticated
  using (
    exists (select 1 from conversation_members m where m.conversation_id = messages.conversation_id and m.user_id = auth.uid())
  );
-- Body/attachment immutability is enforced by the trigger in schema.sql.

-- ---------- notices ----------
create policy notices_select_public on notices for select to anon, authenticated
  using (
    is_published
    and (published_at is null or published_at <= now())
    and (expires_at is null or expires_at > now())
  );
create policy notices_staff_all on notices for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------- reports ----------
create policy reports_insert_auth on reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy reports_select_own_staff on reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_staff());
create policy reports_update_staff on reports for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
-- A report never auto-convicts: status changes only by staff review.

-- ---------- subscription_plans ----------
create policy plans_select_public on subscription_plans for select to anon, authenticated
  using (is_active = true);
create policy plans_staff_all on subscription_plans for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------- payment_transactions ----------
create policy pay_select_own_staff on payment_transactions for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy pay_insert_pending on payment_transactions for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
-- Status transitions (pending → success/failed/refunded) happen ONLY via
-- gateway webhook / edge function with the service-role key. Clients can
-- never mark their own payment as success.

-- ---------- audit_logs / app_settings: service role only ----------
-- (intentionally no policies; public settings are exposed via edge function)

-- ============================================================
-- Storage buckets (create in Dashboard → Storage, then run below)
-- Buckets: 'property-images' (public), 'chat-attachments' (private)
-- Path convention: property-images/<property_uuid>/file.jpg
-- ============================================================

-- property-images: anyone can view images of approved listings
create policy storage_pimg_select on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'property-images'
    and public.is_approved_listing(((storage.foldername(name))[1])::uuid)
  );
-- landlords can upload ONLY under their own property folders; 5MB cap, images only
create policy storage_pimg_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'property-images'
    and exists (
      select 1 from properties p
      where p.id = ((storage.foldername(name))[1])::uuid and p.landlord_id = auth.uid()
    )
  );
create policy storage_pimg_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'property-images'
    and exists (
      select 1 from properties p
      where p.id = ((storage.foldername(name))[1])::uuid and (p.landlord_id = auth.uid() or public.is_staff())
    )
  );

-- chat-attachments: only conversation members
create policy storage_chat_select on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from conversation_members m
      where m.user_id = auth.uid()
        and m.conversation_id = ((storage.foldername(name))[1])::uuid
    )
  );
create policy storage_chat_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from conversation_members m
      where m.user_id = auth.uid()
        and m.conversation_id = ((storage.foldername(name))[1])::uuid
    )
  );
