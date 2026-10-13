import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import type { ProfilesRow, UserRole } from "./database.types";

/** বর্তমানে লগইন করা ইউজার (সার্ভার); লগইন না থাকলে null */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/**
 * বর্তমান ইউজারের রোল — `my_role()` RPC দিয়ে (user_roles টেবিলে ক্লায়েন্ট
 * RLS নেই বলে সরাসরি পড়া যায় না)। রোল না পাওয়া গেলে 'tenant'।
 */
export async function getRole(): Promise<UserRole> {
  const user = await getUser();
  if (!user) return "tenant";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_role");
  if (error || !data) return "tenant";
  return data as UserRole;
}

function roleIsStaff(role: UserRole): boolean {
  return role === "moderator" || role === "admin" || role === "super_admin";
}

/** বর্তমান ইউজার স্টাফ (moderator/admin/super_admin) কি না */
export async function isStaff(): Promise<boolean> {
  return roleIsStaff(await getRole());
}

/**
 * স্টাফ নয় এমন কাউকে হোমপেজে পাঠিয়ে দেয়।
 * রোলও ফেরত দেয় যাতে পেজে আবার RPC না ডাকতে হয়।
 */
export async function requireStaff(): Promise<UserRole> {
  const role = await getRole();
  if (!roleIsStaff(role)) redirect("/");
  return role;
}

/** বর্তমান ইউজারের profiles রো; না থাকলে null */
export async function getMyProfile(): Promise<ProfilesRow | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data;
}
