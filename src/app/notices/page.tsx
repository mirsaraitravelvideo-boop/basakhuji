import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader, EmptyState } from "@/components/ui";
import { bnDate } from "@/lib/format";
import styles from "./notices.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "নোটিশ বোর্ড — বাসাখুঁজি বাংলাদেশ",
  description:
    "বাসাখুঁজি বাংলাদেশের সর্বশেষ ঘোষণা, তথ্য ও নীতিমালার নোটিশ দেখুন।",
};

const TYPE_META: Record<string, { label: string; cls: string }> = {
  information: { label: "তথ্য", cls: styles.tbInfo },
  announcement: { label: "ঘোষণা", cls: styles.tbAnnounce },
  maintenance: { label: "রক্ষণাবেক্ষণ", cls: styles.tbMaint },
  safety_alert: { label: "নিরাপত্তা সতর্কতা", cls: styles.tbSafety },
  policy_update: { label: "নীতি পরিবর্তন", cls: styles.tbPolicy },
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: "সবাই",
  tenants: "ভাড়াটিয়া",
  landlords: "বাড়িওয়ালা",
};

type NoticeRow = {
  id: string;
  title: string;
  body: string;
  notice_type: string;
  priority: number;
  target_audience: string;
  published_at: string;
  expires_at: string | null;
};

export default async function NoticesPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("notices")
    .select(
      "id, title, body, notice_type, priority, target_audience, published_at, expires_at"
    )
    .eq("is_published", true)
    .not("published_at", "is", null)
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("priority", { ascending: false })
    .order("published_at", { ascending: false });

  const notices = (data ?? []) as NoticeRow[];

  return (
    <>
      <SiteHeader name={null} role={null} isStaff={false} />
      <main className="container">
        <div className={styles.head}>
          <h1>নোটিশ বোর্ড</h1>
          <p>বাসাখুঁজি বাংলাদেশের সর্বশেষ ঘোষণা ও গুরুত্বপূর্ণ তথ্য।</p>
        </div>

        {error ? (
          <EmptyState
            title="নোটিশ আনা যায়নি"
            hint="পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।"
          />
        ) : notices.length === 0 ? (
          <EmptyState
            title="কোনো নোটিশ নেই"
            hint="এই মুহূর্তে প্রকাশিত কোনো নোটিশ নেই। পরে আবার দেখুন।"
          />
        ) : (
          <div className={styles.grid}>
            {notices.map((n) => {
              const meta = TYPE_META[n.notice_type] ?? {
                label: n.notice_type,
                cls: styles.tbInfo,
              };
              return (
                <Link
                  key={n.id}
                  href={`/notices/${n.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                  aria-label={n.title}
                >
                  <article className={styles.card}>
                    <div className={styles.badges}>
                      <span className={`${styles.typeBadge} ${meta.cls}`}>
                        {meta.label}
                      </span>
                      <span className={styles.aud}>
                        {AUDIENCE_LABELS[n.target_audience] ??
                          n.target_audience}
                      </span>
                    </div>
                    <h2>{n.title}</h2>
                    <p className={styles.body}>{n.body}</p>
                    <p className={styles.meta}>
                      প্রকাশ: {bnDate(n.published_at)}
                      {n.expires_at
                        ? ` · মেয়াদ: ${bnDate(n.expires_at)} পর্যন্ত`
                        : ""}
                    </p>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
