import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./forms.module.css";

/* ---------------- হেডার ---------------- */
export function SiteHeader({ name }: { name?: string | null }) {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand">
          বাসাখুঁজি
        </Link>
        <nav className="nav-links">
          <Link href="/search">খুঁজুন</Link>
          <Link href="/dashboard">ড্যাশবোর্ড</Link>
          <Link href="/landlord">বিজ্ঞাপন দিন</Link>
          {name ? (
            <span className={styles.userName}>{name}</span>
          ) : (
            <Link href="/auth/login">লগইন</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ---------------- পেজ শিরোনাম ---------------- */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <p className={styles.pageSub}>{subtitle}</p>}
      </div>
      {action && <div className={styles.pageAction}>{action}</div>}
    </div>
  );
}

/* ---------------- ফর্ম ফিল্ড ---------------- */
export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>
        {label}
        {required && <span className={styles.req}> *</span>}
      </span>
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.err}>{error}</span>}
    </label>
  );
}

/* ---------------- ত্রুটি বাক্স ---------------- */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className={styles.formError}>{message}</div>;
}

/* ---------------- খালি অবস্থা ---------------- */
export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {text && <p className={styles.emptyText}>{text}</p>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

/* ---------------- স্ট্যাটাস চিপ ---------------- */
const STATUS_BN: Record<string, string> = {
  draft: "খসড়া",
  pending: "পর্যালোচনাধীন",
  approved: "অনুমোদিত",
  rejected: "বাতিল",
  suspended: "স্থগিত",
  expired: "মেয়াদোত্তীর্ণ",
  rented: "ভাড়া হয়ে গেছে",
  inactive: "নিষ্ক্রিয়",
  open: "খোলা",
  in_review: "পর্যালোচনাধীন",
  resolved: "সমাধান হয়েছে",
  dismissed: "বাতিল",
};

const STATUS_CLS: Record<string, string> = {
  draft: styles.chipDraft,
  pending: styles.chipPending,
  in_review: styles.chipPending,
  open: styles.chipPending,
  approved: styles.chipApproved,
  resolved: styles.chipApproved,
  rejected: styles.chipRejected,
  rented: styles.chipRented,
  inactive: styles.chipInactive,
  expired: styles.chipInactive,
  dismissed: styles.chipInactive,
  suspended: styles.chipSuspended,
};

export function StatusChip({ status }: { status: string }) {
  const cls = STATUS_CLS[status] ?? styles.chipDraft;
  return (
    <span className={`${styles.chip} ${cls}`}>{STATUS_BN[status] ?? status}</span>
  );
}

/* ---------------- পরিসংখ্যান কার্ড ---------------- */
export function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const inner = (
    <>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className={styles.statCard}>
      {inner}
    </Link>
  ) : (
    <div className={styles.statCard}>{inner}</div>
  );
}
