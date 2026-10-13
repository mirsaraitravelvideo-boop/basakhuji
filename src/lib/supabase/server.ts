import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

/** সার্ভার (Server Component / Route Handler) থেকে ব্যবহারের জন্য Supabase ক্লায়েন্ট */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component থেকে set() করা যায় না — সেখানে শুধু পড়াই যথেষ্ট
          }
        },
      },
    }
  );
  // @supabase/ssr 0.5-এর Schema জেনেরিক অনুমান ত্রুটিপূর্ণ (any-তে পড়ে),
  // তাই সরাসরি প্রমাণিত SupabaseClient<Database> টাইপে নেওয়া হলো।
  return client as unknown as SupabaseClient<Database>;
}
