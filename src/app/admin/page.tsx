import { redirect } from "next/navigation";
import Link from "next/link";
import { isStaff } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { StatCard, FormError } from "@/components/ui";
import { bnNum } from "@/lib/format";
import styles from "./admin.module.css";

export const metadata = {
  title: "অ্যাডমিন ড্যাশবোর্ড — বাসাখুঁজি বাংলাদেশ",
};

type Stats = {
  users: number | null;
  landlords: number | null;
  tenants: number | null;
  active_listings: number | null;
  pending_listings: number | null;
  expired_listings: number | null;
  open_reports: number | null;
};

const LINKS = [
  {
    href: "/admin/listings",
    title: "বিজ্ঞাপন যাচাই",
    desc: "অপেক্ষমাণ বিজ্ঞাপন অনুমোদন, প্রত্যাখ্যান বা স্থগিত করুন।",
  },
  {
    href: "/admin/users",
    title: "ব্যবহারকারী",
    desc: "ভূমিকা বদলান, অ্যাকাউন্ট স্থগিত বা পুনরায় সক্রিয় করুন।",
  },
  {
    href: "/admin/reports",
    title: "অভিযোগ",
    desc: "ব্যবহারকারীদের অভিযোগ পর্যালোচনা করে সমাধান করুন।",
  },
  {
    href: "/admin/notices",
    title: "নোটিশ",
    desc: "সবার জন্য নোটিশ তৈরি, সম্পাদনা ও প্রকাশ করুন।",
  },
  {
    href: "/admin/audit",
    title: "অডিট লগ",
    desc: "প্রশাসকদের সব কাজের রেকর্ড দেখুন।",
  },
];

export default async function AdminDashboardPage() {
  if (!(await isStaff())) redirect("/");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats");
  const s = (data ?? {}) as Partial<Stats>;

  return (
    <>
      <h1 className={styles.pageTitle}>অ্যাডমিন ড্যাশবোর্ড</h1>
      <p className={styles.pageSub}>
        নিচের প্রতিটি সংখ্যা ডেটাবেসের বাস্তব গণনা থেকে আসে।
      </p>

      {error ? (
        <FormError message="পরিসংখ্যান আনা যায়নি। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।" />
      ) : (
        <div className={styles.statGrid}>
          <StatCard label="মোট ব্যবহারকারী" value={bnNum(s.users)} />
          <StatCard label="বাড়িওয়ালা" value={bnNum(s.landlords)} />
          <StatCard label="ভাড়াটিয়া" value={bnNum(s.tenants)} />
          <StatCard label="সক্রিয় বিজ্ঞাপন" value={bnNum(s.active_listings)} />
          <StatCard
            label="অপেক্ষমাণ বিজ্ঞাপন"
            value={bnNum(s.pending_listings)}
          />
          <StatCard
            label="মেয়াদোত্তীর্ণ বিজ্ঞাপন"
            value={bnNum(s.expired_listings)}
          />
          <StatCard label="খোলা অভিযোগ" value={bnNum(s.open_reports)} />
        </div>
      )}

      <h2 className={styles.sectionTitle}>দ্রুত লিংক</h2>
      <div className={styles.linkGrid}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={styles.linkCard}>
            <strong>{l.title}</strong>
            <span>{l.desc}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
