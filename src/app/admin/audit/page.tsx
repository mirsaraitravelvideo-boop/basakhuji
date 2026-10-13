import { redirect } from "next/navigation";
import { isStaff } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, FormError } from "@/components/ui";
import { bnDateTime } from "@/lib/format";
import type { AdminAuditRow, Json } from "@/lib/database.types";
import styles from "../admin.module.css";

export const metadata = {
  title: "অডিট লগ — অ্যাডমিন",
};

const ACTION_LABELS: Record<string, string> = {
  listing_approve: "বিজ্ঞাপন অনুমোদন",
  listing_reject: "প্রত্যাখ্যান",
  listing_suspend: "স্থগিত",
  role_change: "ভূমিকা পরিবর্তন",
  user_suspend: "স্থগিতকরণ",
  user_reactivate: "পুনরায় সক্রিয়",
  report_resolve: "অভিযোগ সমাধান",
  report_dismiss: "খারিজ",
};

const ROLE_LABELS: Record<string, string> = {
  tenant: "ভাড়াটিয়া",
  landlord: "বাড়িওয়ালা",
  moderator: "মডারেটর",
  admin: "অ্যাডমিন",
  super_admin: "সুপার অ্যাডমিন",
};

function roleLabel(v: unknown): string {
  if (typeof v === "string" && ROLE_LABELS[v]) return ROLE_LABELS[v];
  return String(v ?? "—");
}

// audit_logs.details JSON → বাংলায় পাঠযোগ্য সংক্ষিপ্ত বিবরণ
function detailText(details: Json | null): string {
  if (!details || typeof details !== "object" || Array.isArray(details))
    return "—";
  const d = details as Record<string, unknown>;
  const parts: string[] = [];
  const note = d.note;
  if (typeof note === "string" && note.trim())
    parts.push(`মন্তব্য: ${note.trim()}`);
  if (d.from !== undefined || d.to !== undefined)
    parts.push(`${roleLabel(d.from)} → ${roleLabel(d.to)}`);
  if (typeof d.from_status === "string" && d.from_status)
    parts.push(`আগের অবস্থা: ${d.from_status}`);
  if (typeof d.suspended === "boolean")
    parts.push(d.suspended ? "স্থগিত করা হয়েছে" : "পুনরায় সক্রিয় করা হয়েছে");
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export default async function AdminAuditPage() {
  if (!(await isStaff())) redirect("/");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_recent_audit", {
    p_limit: 100,
  });
  const logs = (data ?? []) as AdminAuditRow[];

  return (
    <>
      <h1 className={styles.pageTitle}>অডিট লগ</h1>
      <p className={styles.pageSub}>
        প্রশাসকদের সাম্প্রতিক কাজের রেকর্ড (সর্বশেষ{" "}
        {logs.length.toLocaleString("bn-BD")}টি)।
      </p>

      {error ? (
        <FormError message="অডিট লগ আনা যায়নি। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।" />
      ) : logs.length === 0 ? (
        <EmptyState
          title="কোনো রেকর্ড নেই"
          hint="এখনো কোনো প্রশাসনিক কাজের রেকর্ড তৈরি হয়নি।"
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>সময়</th>
                <th>কার্যকারী</th>
                <th>কাজ</th>
                <th>লক্ষ্য</th>
                <th>বিবরণ</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className={`${styles.muted} ${styles.nowrap}`}>
                    {bnDateTime(l.created_at)}
                  </td>
                  <td className={styles.titleCell}>
                    {l.actor_name ?? (
                      <span className={styles.muted}>অজ্ঞাত</span>
                    )}
                  </td>
                  <td>
                    <span className={`${styles.tag} ${styles.tagInfo}`}>
                      {ACTION_LABELS[l.action] ?? l.action}
                    </span>
                  </td>
                  <td className={styles.muted}>
                    {l.target_type ?? "—"}
                    {l.target_id ? (
                      <div className={styles.mono}>
                        {l.target_id.slice(0, 8)}…
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className={styles.muted}>
                      {detailText(l.details)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
