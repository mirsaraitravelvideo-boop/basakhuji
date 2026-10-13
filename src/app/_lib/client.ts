import { createBrowserClient } from "@supabase/ssr";

/** ব্রাউজার-সাইড Supabase ক্লায়েন্ট (শুধু ক্লায়েন্ট কম্পোনেন্টে ব্যবহার করুন)। */
export function sbBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

/** property-images বাকেটের পাবলিক URL। */
export function publicImageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${path}`;
}
