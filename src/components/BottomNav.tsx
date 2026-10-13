"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

const ITEMS = [
  { href: "/", label: "হোম", icon: "🏠" },
  { href: "/search", label: "খুঁজুন", icon: "🔍" },
  { href: "/dashboard", label: "পছন্দ", icon: "❤️" },
  { href: "/messages", label: "মেসেজ", icon: "💬" },
  { href: "/dashboard", label: "প্রোফাইল", icon: "👤" },
];

/** মোবাইল বটম ন্যাভিগেশন — ৭২০px-এর নিচে দেখায় */
export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="মোবাইল মেনু">
      {ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.label + item.href}
            href={item.href}
            className={`${styles.item} ${active ? styles.active : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className={styles.icon} aria-hidden="true">
              {item.icon}
            </span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
