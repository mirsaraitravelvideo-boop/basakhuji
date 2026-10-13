"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser, getRole, isStaffRole } from "../_lib/server";

/* ---------------- ধরন ---------------- */
export type ListingInput = {
  title?: string;
  description?: string;
  property_type?: string;
  district?: string;
  upazila?: string;
  area?: string;
  address_text?: string;
  latitude?: number | null;
  longitude?: number | null;
  monthly_rent?: number | null;
  advance_amount?: number | null;
  security_deposit?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  size_sqft?: number | null;
  floor_no?: number | null;
  furnished?: string;
  available_from?: string | null;
  amenities?: string[];
};

const PROPERTY_TYPES = ["flat", "house", "room", "sublet", "office", "shop", "plot"];
const FURNISHED_STATES = ["unfurnished", "semi_furnished", "furnished"];
const AMENITY_SLUGS = ["gas", "lift", "parking", "generator", "wifi", "cctv", "darowan", "balcony"];
/** মালিক নিজে যে স্ট্যাটাসগুলোতে নিতে পারবেন (self-approve নিষেধ)। */
const OWNER_SETTABLE = ["pending", "draft", "inactive", "rented"] as const;

/* ---------------- সহায়ক ---------------- */
async function requireLandlord() {
  const { sb, user } = await getUser();
  if (!user) redirect("/auth/login");
  const role = await getRole();
  if (role !== "landlord" && !isStaffRole(role))
    throw new Error("অনুমতি নেই — শুধু বাড়িওয়ালা বিজ্ঞাপন দিতে পারেন");
  return { sb, user, role };
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0)
    throw new Error("সংখ্যা সঠিক নয় — ০ বা তার বেশি পূর্ণসংখ্যা হতে হবে");
  return Math.floor(n);
}

function coord(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error("অবস্থান সঠিক নয়");
  return n;
}

/** শুধু অনুমোদিত কলাম রাখুন; status কখনোই ক্লায়েন্ট থেকে নেওয়া যাবে না। */
function sanitize(data: ListingInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (data.title !== undefined) out.title = String(data.title).trim();
  if (data.description !== undefined)
    out.description = String(data.description).trim() || null;
  if (data.property_type !== undefined) {
    const t = String(data.property_type);
    if (!PROPERTY_TYPES.includes(t)) throw new Error("বাসার ধরন সঠিক নয়");
    out.property_type = t;
  }
  if (data.district !== undefined) out.district = String(data.district).trim();
  if (data.upazila !== undefined)
    out.upazila = String(data.upazila).trim() || null;
  if (data.area !== undefined) out.area = String(data.area).trim();
  if (data.address_text !== undefined)
    out.address_text = String(data.address_text).trim() || null;
  if (data.latitude !== undefined) out.latitude = coord(data.latitude);
  if (data.longitude !== undefined) out.longitude = coord(data.longitude);
  if (data.monthly_rent !== undefined) out.monthly_rent = num(data.monthly_rent);
  if (data.advance_amount !== undefined) out.advance_amount = num(data.advance_amount);
  if (data.security_deposit !== undefined)
    out.security_deposit = num(data.security_deposit);
  if (data.bedrooms !== undefined) out.bedrooms = num(data.bedrooms);
  if (data.bathrooms !== undefined) out.bathrooms = num(data.bathrooms);
  if (data.size_sqft !== undefined) out.size_sqft = num(data.size_sqft);
  if (data.floor_no !== undefined) out.floor_no = num(data.floor_no);
  if (data.furnished !== undefined) {
    const fz = String(data.furnished);
    if (!FURNISHED_STATES.includes(fz)) throw new Error("আসবাবের অবস্থা সঠিক নয়");
    out.furnished = fz;
  }
  if (data.available_from !== undefined)
    out.available_from = data.available_from ? String(data.available_from) : null;
  return out;
}

async function ownListing(
  sb: Awaited<ReturnType<typeof getUser>>["sb"],
  userId: string,
  role: Awaited<ReturnType<typeof getRole>>,
  propertyId: string
) {
  const { data, error } = await sb
    .from("properties")
    .select("id, landlord_id")
    .eq("id", propertyId)
    .single();
  if (error || !data) throw new Error("বিজ্ঞাপন পাওয়া যায়নি");
  if (data.landlord_id !== userId && !isStaffRole(role))
    throw new Error("অনুমতি নেই");
  return data;
}

async function syncAmenities(
  sb: Awaited<ReturnType<typeof getUser>>["sb"],
  propertyId: string,
  amenities: string[] | undefined
) {
  await sb.from("property_amenities").delete().eq("property_id", propertyId);
  const slugs = (amenities ?? []).filter((a) => AMENITY_SLUGS.includes(a));
  if (slugs.length === 0) return;
  const { error } = await sb
    .from("property_amenities")
    .insert(slugs.map((a) => ({ property_id: propertyId, amenity: a })));
  if (error) throw new Error("সুবিধা সংরক্ষণ করা যায়নি");
}

function genListingNo(): string {
  return (
    "BK-" +
    Date.now().toString().slice(-8) +
    String(Math.floor(1000 + Math.random() * 9000))
  );
}

/* ---------------- অ্যাকশন ---------------- */

/** নতুন খসড়া বিজ্ঞাপন তৈরি করুন → { id } ফেরত দেয়। */
export async function createListingDraft(
  data: ListingInput
): Promise<{ id: string }> {
  const { sb, user } = await requireLandlord();

  const title = String(data.title ?? "").trim();
  if (!title) throw new Error("বিজ্ঞাপনের শিরোনাম দিন");
  const district = String(data.district ?? "").trim();
  if (!district) throw new Error("জেলা দিন");
  const area = String(data.area ?? "").trim();
  if (!area) throw new Error("এলাকা দিন");
  const monthly_rent = num(data.monthly_rent);
  if (!monthly_rent || monthly_rent <= 0)
    throw new Error("মাসিক ভাড়া ০-এর বেশি হতে হবে");

  const row = {
    ...sanitize(data),
    title,
    district,
    area,
    monthly_rent,
    listing_no: genListingNo(),
    landlord_id: user.id,
    status: "draft" as const,
  };
  const { data: inserted, error } = await sb
    .from("properties")
    .insert(row)
    .select("id")
    .single();
  if (error || !inserted)
    throw new Error(
      "খসড়া সংরক্ষণ করা যায়নি: " + (error?.message ?? "অজানা ত্রুটি")
    );
  await syncAmenities(sb, inserted.id, data.amenities);
  revalidatePath("/landlord");
  return { id: inserted.id };
}

/** নিজের বিজ্ঞাপন হালনাগাদ করুন (status ফিল্ড উপেক্ষা করা হয়)। */
export async function updateListing(
  id: string,
  data: ListingInput
): Promise<{ ok: true }> {
  const { sb, user, role } = await requireLandlord();
  await ownListing(sb, user.id, role, id);

  if (data.title !== undefined && !String(data.title).trim())
    throw new Error("বিজ্ঞাপনের শিরোনাম দিন");
  if (data.district !== undefined && !String(data.district).trim())
    throw new Error("জেলা দিন");
  if (data.area !== undefined && !String(data.area).trim())
    throw new Error("এলাকা দিন");
  if (data.monthly_rent !== undefined) {
    const r = num(data.monthly_rent);
    if (!r || r <= 0) throw new Error("মাসিক ভাড়া ০-এর বেশি হতে হবে");
  }

  const row = sanitize(data);
  if (Object.keys(row).length > 0) {
    const { error } = await sb.from("properties").update(row).eq("id", id);
    if (error) throw new Error("হালনাগাদ করা যায়নি: " + error.message);
  }
  if (data.amenities !== undefined) await syncAmenities(sb, id, data.amenities);
  revalidatePath("/landlord");
  return { ok: true };
}

/** মালিকের স্ট্যাটাস পরিবর্তন (pending/draft/inactive/rented — approved নয়)। */
export async function setListingStatus(
  id: string,
  status: string
): Promise<void> {
  const { sb, user, role } = await requireLandlord();
  if (!(OWNER_SETTABLE as readonly string[]).includes(status))
    throw new Error("এই অবস্থায় নেওয়া যাবে না");
  await ownListing(sb, user.id, role, id);
  const { error } = await sb
    .from("properties")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error("অবস্থা পরিবর্তন করা যায়নি: " + error.message);
  revalidatePath("/landlord");
}

/** ছবির storage path যোগ করুন (প্রথম ছবি প্রধান হবে)। */
export async function addImages(
  propertyId: string,
  paths: string[]
): Promise<{ ok: true }> {
  const { sb, user, role } = await requireLandlord();
  await ownListing(sb, user.id, role, propertyId);
  const { count } = await sb
    .from("property_images")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);
  const base = count ?? 0;
  const rows = paths.map((p, i) => ({
    property_id: propertyId,
    storage_path: p,
    sort_order: base + i,
    is_primary: base === 0 && i === 0,
  }));
  const { error } = await sb.from("property_images").insert(rows);
  if (error) throw new Error("ছবি যোগ করা যায়নি: " + error.message);
  revalidatePath("/landlord");
  return { ok: true };
}

/** প্রধান ছবি নির্ধারণ করুন। */
export async function setPrimaryImage(
  propertyId: string,
  imageId: string
): Promise<{ ok: true }> {
  const { sb, user, role } = await requireLandlord();
  await ownListing(sb, user.id, role, propertyId);
  const { error: e1 } = await sb
    .from("property_images")
    .update({ is_primary: false })
    .eq("property_id", propertyId);
  if (e1) throw new Error("প্রধান ছবি বদলানো যায়নি");
  const { error: e2 } = await sb
    .from("property_images")
    .update({ is_primary: true })
    .eq("id", imageId)
    .eq("property_id", propertyId);
  if (e2) throw new Error("প্রধান ছবি বদলানো যায়নি");
  revalidatePath("/landlord");
  return { ok: true };
}

/** ছবির ক্রম বদলান (ids = নতুন ক্রমে সাজানো ছবির id তালিকা)। */
export async function reorderImages(
  propertyId: string,
  ids: string[]
): Promise<{ ok: true }> {
  const { sb, user, role } = await requireLandlord();
  await ownListing(sb, user.id, role, propertyId);
  for (let i = 0; i < ids.length; i++) {
    const { error } = await sb
      .from("property_images")
      .update({ sort_order: i })
      .eq("id", ids[i])
      .eq("property_id", propertyId);
    if (error) throw new Error("ক্রম বদলানো যায়নি");
  }
  revalidatePath("/landlord");
  return { ok: true };
}

/** ছবি মুছুন (ডাটাবেজ + স্টোরেজ দুটো থেকেই)। */
export async function deleteImage(
  propertyId: string,
  imageId: string
): Promise<{ ok: true }> {
  const { sb, user, role } = await requireLandlord();
  await ownListing(sb, user.id, role, propertyId);
  const { data: img } = await sb
    .from("property_images")
    .select("id, storage_path, is_primary")
    .eq("id", imageId)
    .eq("property_id", propertyId)
    .single();
  if (!img) throw new Error("ছবি পাওয়া যায়নি");
  const { error } = await sb.from("property_images").delete().eq("id", imageId);
  if (error) throw new Error("ছবি মোছা যায়নি");
  await sb.storage.from("property-images").remove([img.storage_path]);
  // মুছে ফেলা ছবিটি প্রধান হলে পরের প্রথম ছবিকে প্রধান করুন
  if (img.is_primary) {
    const { data: rest } = await sb
      .from("property_images")
      .select("id")
      .eq("property_id", propertyId)
      .order("sort_order")
      .limit(1);
    if (rest && rest.length > 0)
      await sb
        .from("property_images")
        .update({ is_primary: true })
        .eq("id", rest[0].id);
  }
  revalidatePath("/landlord");
  return { ok: true };
}
