import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * সার্ভার-ONLY অ্যাডমিন ক্লায়েন্ট — RLS বাইপাস করে।
 *
 * কী: `SUPABASE_SECRET_KEY` (নতুন ফরম্যাট: sb_secret_...) অথবা
 * `SUPABASE_SERVICE_ROLE_KEY` (পুরনো ফরম্যাট) — যেটা সেট করা থাকবে সেটাই নেবে।
 *
 * ⚠️ কঠোর নিয়ম:
 * - শুধু সার্ভার কম্পোনেন্ট, Route Handler বা Server Action থেকে ডাকুন।
 * - কখনোই ক্লায়েন্ট কম্পোনেন্টে import করবেন না (রানটাইমে ব্লক করা আছে)।
 * - কখনোই এই কী NEXT_PUBLIC_ ভেরিয়েবলে রাখবেন না।
 *
 * বর্তমান অ্যাপে এটি বাধ্যতামূলক নয় — সব অ্যাক্সেস RLS নীতি ও
 * SECURITY DEFINER RPC ফাংশন দিয়ে হয়। ভবিষ্যতে সার্ভার-সাইড
 * অ্যাডমিন কাজে (যেমন: নোটিফিকেশন তৈরি, স্টোরেজ রক্ষণাবেক্ষণ) ব্যবহার করুন।
 */
export function createAdminClient(): SupabaseClient<Database> {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient শুধু সার্ভারে ব্যবহার করা যায় — ব্রাউজারে কখনোই নয়"
    );
  }
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY (নতুন) বা SUPABASE_SERVICE_ROLE_KEY (পুরনো) সেট করা নেই"
    );
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL সেট করা নেই");
  }
  const client = createSupabaseClient<Database>(url, key);
  return client as unknown as SupabaseClient<Database>;
}
