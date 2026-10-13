import Link from "next/link";
import type { ReactNode } from "react";
import type { UserRole } from "@/lib/database.types";
import styles from "./ui.module.css";

/* ================= SiteHeader ================= */

export type SiteHeaderProps = {
  /** লগইন করা ইউজারের নাম; লগইন না থাকলে null */
  name: string | null;
  role: UserRole | null;
  isStaff: boolean;
};

export function SiteHeader({ name, role, isStaff }: SiteHeaderProps) {
  const loggedIn = !!name;
  return (
    <header className="site-header">
      <div className="container">
        <div className="header-top">
          <Link href="/" className="brand">
            🏠 বাসাখুঁজি
          </Link>
          <Link href="/search" className="loc-pill">
            📍 সারা বাংলাদেশ
          </Link>
        </div>
        <nav className="nav-links" aria-label="প্রধান মেনু">
          <Link href="/search">বাসা খুঁজুন</Link>
          <Link href="/notices">নোটিশ</Link>
          {loggedIn ? (
            <>
              <Link href="/landlord/new">বাসা দিন</Link>
              <Link href="/messages">বার্তা</Link>
              <Link href="/dashboard">ড্যাশবোর্ড</Link>
              {isStaff ? <Link href="/admin">অ্যাডমিন</Link> : null}
              <span className={styles.headerUser} title={role ?? ""}>
                {name}
              </span>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="btn btn-outline"
                  style={{ padding: "8px 18px", fontSize: "0.9rem" }}
                >
                  লগ আউট
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login">লগইন</Link>
              <Link
                href="/auth/signup"
                className="btn btn-primary"
                style={{ padding: "8px 18px", fontSize: "0.9rem" }}
              >
                সাইন আপ
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ================= Field / FormError ================= */

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
      {error ? <span className={styles.fieldError}>{error}</span> : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div className={styles.formError} role="alert">
      {message}
    </div>
  );
}

/* ================= EmptyState ================= */

export function EmptyState({
  title,
  hint,
  actionHref,
  actionLabel,
}: {
  title: string;
  hint: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className={styles.empty}>
      <h2>{title}</h2>
      <p>{hint}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn btn-primary">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

/* ================= StatusChip ================= */

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "অনুমোদনের অপেক্ষায়", bg: "#fef3c7", fg: "#92400e" },
  approved: { label: "সক্রিয়", bg: "#dcfce7", fg: "#166534" },
  rejected: { label: "প্রত্যাখ্যাত", bg: "#fee2e2", fg: "#991b1b" },
  suspended: { label: "স্থগিত", bg: "#fee2e2", fg: "#991b1b" },
  expired: { label: "মেয়াদোত্তীর্ণ", bg: "#f3f4f6", fg: "#4b5563" },
  rented: { label: "ভাড়া হয়ে গেছে", bg: "#dbeafe", fg: "#1e40af" },
  draft: { label: "খসড়া", bg: "#f3f4f6", fg: "#4b5563" },
  inactive: { label: "নিষ্ক্রিয়", bg: "#f3f4f6", fg: "#4b5563" },
  open: { label: "খোলা", bg: "#fef3c7", fg: "#92400e" },
  in_review: { label: "পর্যালোচনাধীন", bg: "#dbeafe", fg: "#1e40af" },
  resolved: { label: "সমাধান হয়েছে", bg: "#dcfce7", fg: "#166534" },
  dismissed: { label: "খারিজ", bg: "#f3f4f6", fg: "#4b5563" },
};

export function StatusChip({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    bg: "#f3f4f6",
    fg: "#4b5563",
  };
  return (
    <span
      className={styles.chip}
      style={{ background: meta.bg, color: meta.fg }}
    >
      {meta.label}
    </span>
  );
}

/* ================= StatCard ================= */

export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className={styles.statCard}>
      <p className={styles.value}>{value}</p>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
