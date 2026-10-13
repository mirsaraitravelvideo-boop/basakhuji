import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type EnvName = "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY";

/**
 * সরাসরি process.env.X আকারে পড়া — Next.js বিল্ডের সময় মান বসিয়ে দেয়।
 * process.env[name] (ডাইনামিক) ব্যবহার করা যাবে না: Cloudflare Workers-এ
 * রানটাইমে সেটি খালি থাকে, ফলে 500 এরর হয়।
 */
function env(name: EnvName): string {
  const v =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!v) throw new Error(`পরিবেশ চলক ${name} সেট করা নেই`);
  return v;
}

/** সার্ভার-সাইড Supabase ক্লায়েন্ট (anon key; RLS প্রযোজ্য)। */
export async function sbServer() {
  const store = await cookies();
  return createServerClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (
          toSet: { name: string; value: string; options: CookieOptions }[]
        ) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            );
          } catch {
            /* সার্ভার কম্পোনেন্টে কুকি লেখা যায় না — উপেক্ষা করুন */
          }
        },
      },
    }
  );
}

export type Role =
  | "tenant"
  | "landlord"
  | "moderator"
  | "admin"
  | "super_admin";

const STAFF_ROLES: Role[] = ["moderator", "admin", "super_admin"];
export const isStaffRole = (r: Role): boolean => STAFF_ROLES.includes(r);

/** বর্তমান লগইন-করা ব্যবহারকারী (না থাকলে user = null)। */
export async function getUser() {
  const sb = await sbServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { sb, user };
}

/** my_role() RPC দিয়ে নিরাপদ রোল লুকআপ (ডিফল্ট: tenant)। */
export async function getRole(): Promise<Role> {
  const { sb, user } = await getUser();
  if (!user) return "tenant";
  const { data, error } = await sb.rpc("my_role");
  if (error || !data) return "tenant";
  return data as Role;
}

export const ROLE_BN: Record<Role, string> = {
  tenant: "ভাড়াটিয়া",
  landlord: "বাড়িওয়ালা",
  moderator: "মডারেটর",
  admin: "প্রশাসক",
  super_admin: "প্রধান প্রশাসক",
};
