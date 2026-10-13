import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/ui";
import { bnDate } from "@/lib/format";
import styles from "../notices.module.css";

export const dynamic = "force-dynamic";

type NoticeRow = {
  id: string;
  title: string;
  body: string;
  notice_type: string;
  target_audience: string;
  published_at: string;
  expires_at: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  information: "তথ্য",
  announcement: "ঘোষণা",
  maintenance: "রক্ষণাবেক্ষণ",
  safety_alert: "নিরাপত্তা সতর্কতা",
  policy_update: "নীতি পরিবর্তন",
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: "সবাই",
  tenants: "ভাড়াটিয়া",
  landlords: "বাড়িওয়ালা",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("notices")
    .select("title")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  return { title: data ? `${data.title} — নোটিশ` : "নোটিশ — বাসাখুঁজি বাংলাদেশ" };
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("notices")
    .select(
      "id, title, body, notice_type, target_audience, published_at, expires_at"
    )
    .eq("id", id)
    .eq("is_published", true)
    .not("published_at", "is", null)
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle();

  const notice = data as NoticeRow | null;
  if (!notice) notFound();

  return (
    <>
      <SiteHeader name={null} role={null} isStaff={false} />
      <main className="container">
        <p style={{ margin: "16px 0 0" }}>
          <Link href="/notices" style={{ fontWeight: 700 }}>
            ← সব নোটিশ
          </Link>
        </p>
        <article
          className={styles.card}
          style={{ marginTop: 12, cursor: "default" }}
        >
          <div className={styles.badges}>
            <span className={`${styles.typeBadge} ${styles.tbInfo}`}>
              {TYPE_LABELS[notice.notice_type] ?? notice.notice_type}
            </span>
            <span className={styles.aud}>
              {AUDIENCE_LABELS[notice.target_audience] ??
                notice.target_audience}
            </span>
          </div>
          <h1 style={{ fontSize: "1.4rem", margin: "8px 0" }}>
            {notice.title}
          </h1>
          <p className={styles.body} style={{ whiteSpace: "pre-wrap" }}>
            {notice.body}
          </p>
          <p className={styles.meta}>
            প্রকাশ: {bnDate(notice.published_at)}
            {notice.expires_at
              ? ` · মেয়াদ: ${bnDate(notice.expires_at)} পর্যন্ত`
              : ""}
          </p>
        </article>
      </main>
    </>
  );
}
