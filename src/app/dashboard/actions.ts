"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "../_lib/server";

async function requireUser() {
  const { sb, user } = await getUser();
  if (!user) redirect("/auth/login");
  return { sb, user };
}

function intOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0)
    throw new Error("টাকার অঙ্ক সঠিক নয় — ০ বা তার বেশি হতে হবে");
  return Math.floor(n);
}

/** সংরক্ষণ থেকে বাদ দিন। */
export async function unsaveProperty(propertyId: string) {
  const { sb, user } = await requireUser();
  const { error } = await sb
    .from("saved_properties")
    .delete()
    .eq("user_id", user.id)
    .eq("property_id", propertyId);
  if (error) throw new Error("সংরক্ষণ বাতিল করা যায়নি");
  revalidatePath("/dashboard");
}

/** নতুন সার্চ অ্যালার্ট তৈরি করুন। */
export async function createAlert(formData: FormData) {
  const { sb, user } = await requireUser();
  const district = String(formData.get("district") ?? "").trim();
  if (!district) throw new Error("জেলা দিন");
  const area = String(formData.get("area") ?? "").trim();
  const property_type = String(formData.get("property_type") ?? "").trim();
  const filters: Record<string, unknown> = { district };
  if (area) filters.area = area;
  const from_area = String(formData.get("from_area") ?? "").trim();
  if (from_area) filters.from_area = from_area;
  const min_rent = intOrNull(formData.get("min_rent"));
  const max_rent = intOrNull(formData.get("max_rent"));
  if (min_rent !== null) filters.min_rent = min_rent;
  if (max_rent !== null) filters.max_rent = max_rent;
  if (property_type) filters.property_type = property_type;
  const { error } = await sb
    .from("search_alerts")
    .insert({ user_id: user.id, filters });
  if (error) throw new Error("অ্যালার্ট তৈরি করা যায়নি");
  revalidatePath("/dashboard");
}

/** অ্যালার্ট চালু/বন্ধ করুন। */
export async function toggleAlert(id: string, next: boolean) {
  const { sb, user } = await requireUser();
  const { data } = await sb
    .from("search_alerts")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!data) throw new Error("অ্যালার্ট পাওয়া যায়নি");
  const { error } = await sb
    .from("search_alerts")
    .update({ is_active: next })
    .eq("id", id);
  if (error) throw new Error("অ্যালার্ট বদলানো যায়নি");
  revalidatePath("/dashboard");
}

/** অ্যালার্ট মুছুন। */
export async function deleteAlert(id: string) {
  const { sb, user } = await requireUser();
  const { error } = await sb
    .from("search_alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error("অ্যালার্ট মোছা যায়নি");
  revalidatePath("/dashboard");
}

/** প্রোফাইল হালনাগাদ করুন। */
export async function updateProfile(formData: FormData) {
  const { sb, user } = await requireUser();
  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) throw new Error("আপনার নাম দিন");
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const { error } = await sb
    .from("profiles")
    .update({ full_name, phone })
    .eq("id", user.id);
  if (error) throw new Error("প্রোফাইল হালনাগাদ করা যায়নি");
  revalidatePath("/dashboard");
}
