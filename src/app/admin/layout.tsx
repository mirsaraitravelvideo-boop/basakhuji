import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/roles";
import styles from "./admin.module.css";

export const metadata = {
  title: "অ্যাডমিন প্যানেল — বাসাখুঁজি বাংলাদেশ",
};

const NAV = [
  { href: "/admin", label: "ড্যাশবোর্ড" },
  { href: "/admin/listings", label: "বিজ্ঞাপন" },
  { href: "/admin/users", label: "ব্যবহারকারী" },
  { href: "/admin/reports", label: "অভিযোগ" },
  { href: "/admin/notices", label: "নোটিশ" },
  { href: "/admin/audit", label: "অডিট লগ" },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await isStaff())) redirect("/");

  return (
    <div className={styles.wrap}>
      <header className={styles.topbar}>
        <Link href="/admin" className={styles.brand}>
          🛡️ কন্ট্রোল রুম
        </Link>
        <span className={styles.badge}>অ্যাডমিন</span>
        <Link href="/" className={styles.backLink}>
          🌐 সাইট দেখুন →
        </Link>
      </header>
      <nav className={styles.nav} aria-label="অ্যাডমিন মেনু">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}>
            {n.label}
          </Link>
        ))}
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
