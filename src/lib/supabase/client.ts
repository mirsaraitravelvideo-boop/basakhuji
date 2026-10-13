import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** ব্রাউজার (ক্লায়েন্ট কম্পোনেন্ট) থেকে ব্যবহারের জন্য Supabase ক্লায়েন্ট */
export function createClient(): SupabaseClient<Database> {
  const client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  // @supabase/ssr 0.5-এর Schema জেনেরিক অনুমান ত্রুটিপূর্ণ (any-তে পড়ে),
  // তাই সরাসরি প্রমাণিত SupabaseClient<Database> টাইপে নেওয়া হলো।
  return client as unknown as SupabaseClient<Database>;
}
