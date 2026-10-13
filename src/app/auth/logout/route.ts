import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** লগ আউট — হেডারের ফর্ম থেকে POST হয় */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
