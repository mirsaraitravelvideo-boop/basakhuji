import { redirect } from "next/navigation";
import Link from "next/link";
import { isStaff } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { StatusChip, EmptyState } from "@/components/ui";
import { bnDateTime } from "@/lib/format";
import type { ReportStatus } from "@/lib/database.types";
import styles from "../admin.module.css";

export const metadata = {
  title: "অভিযোগ — অ্যাডমিন",
};

const FILTERS = [
  { v: "all", label: "সব" },
  { v: "open", label: "খোলা" },
  { v: "in_review", label: "পর্যালোচনাধীন" },
  { v: "resolved", label: "সমাধান হয়েছে" },
  { v: "dismissed", label: "খারিজ" },
];

const OK_MSG: Record<string, string> = {
  resolve: "অভিযোগ সমাধান হয়েছে হিসেবে চিহ্নিত করা হয়েছে।",
  dismiss: "অভিযোগ খারিজ করা হয়েছে।",
};

const ERR_MSG: Record<string, string> = {
  bad_request: "অবৈধ অনুরোধ।",
  forbidden: "এই কাজের অনুমতি আপনার নেই।",
  not_found: "অভিযোগ পাওয়া যায়নি।",
  unknown: "কিছু ভুল হয়েছে, আবার চেষ্টা করুন।",
};

function dbErrorCode(msg: string): string {
  if (msg.includes("forbidden")) return "forbidden";
  if (msg.includes("report not found")) return "not_found";
  if (msg.includes("invalid action")) return "bad_request";
  return "unknown";
}

async function resolveReportAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id || !["resolve", "dismiss"].includes(action)) {
    redirect("/admin/reports?err=bad_request");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_report", {
    p_id: id,
    p_action: action,
    p_note: note || null,
  });
  if (error) redirect(`/admin/reports?err=${dbErrorCode(error.message)}`);
  redirect(`/admin/reports?ok=${action}`);
}

type ReportRow = {
  id: string;
  reporter_id: string;
  property_id: string | null;
  reported_user_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; ok?: string; err?: string }>;
}) {
  if (!(await isStaff())) redirect("/");

  const sp = await searchParams;
  const filter =
    sp.status && FILTERS.some((f) => f.v === sp.status) ? sp.status : "all";
  const supabase = await createClient();

  let rq = supabase
    .from("reports")
    .select(
      "id, reporter_id, property_id, reported_user_id, reason, details, status, resolved_by, resolved_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter !== "all") rq = rq.eq("status", filter as ReportStatus);
  const { data } = await rq;
  const reports = (data ?? []) as ReportRow[];

  const profileIds = [
    ...new Set(
      reports
        .flatMap((r) => [r.reporter_id, r.reported_user_id, r.resolved_by])
        .filter((x): x is string => !!x)
    ),
  ];
  const propIds = [
    ...new Set(
      reports.map((r) => r.property_id).filter((x): x is string => !!x)
    ),
  ];
  const names: Record<string, string> = {};
  if (profileIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);
    for (const p of profs ?? []) names[p.id] = p.full_name;
  }
  const titles: Record<string, string> = {};
  if (propIds.length > 0) {
    const { data: props } = await supabase
      .from("properties")
      .select("id, title")
      .in("id", propIds);
    for (const p of props ?? []) titles[p.id] = p.title;
  }

  return (
    <>
      <h1 className={styles.pageTitle}>অভিযোগ</h1>
      <p className={styles.pageSub}>
        ব্যবহারকারীদের পাঠানো অভিযোগ পর্যালোচনা করে সমাধান বা খারিজ করুন।
      </p>

      {sp.ok && OK_MSG[sp.ok] ? (
        <p className={`${styles.alert} ${styles.alertOk}`}>{OK_MSG[sp.ok]}</p>
      ) : null}
      {sp.err && ERR_MSG[sp.err] ? (
        <p className={`${styles.alert} ${styles.alertErr}`}>
          {ERR_MSG[sp.err]}
        </p>
      ) : null}

      <div
        className={styles.filterBar}
        role="navigation"
        aria-label="অবস্থা অনুযায়ী ফিল্টার"
      >
        {FILTERS.map((f) => (
          <Link
            key={f.v}
            href={
              f.v === "all" ? "/admin/reports" : `/admin/reports?status=${f.v}`
            }
            className={`${styles.filterLink} ${
              filter === f.v ? styles.filterActive : ""
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {reports.length === 0 ? (
        <EmptyState
          title="কোনো অভিযোগ নেই"
          hint="এই ফিল্টারে কোনো অভিযোগ পাওয়া যায়নি।"
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>অভিযোগকারী</th>
                <th>বিষয়</th>
                <th>কারণ ও বিবরণ</th>
                <th>অবস্থা</th>
                <th>তারিখ</th>
                <th>নিষ্পত্তি</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className={styles.titleCell}>
                    {names[r.reporter_id] ?? "—"}
                  </td>
                  <td>
                    {r.property_id ? (
                      <span>
                        বিজ্ঞাপন: {titles[r.property_id] ?? "—"}
                      </span>
                    ) : r.reported_user_id ? (
                      <span>
                        ব্যবহারকারী: {names[r.reported_user_id] ?? "—"}
                      </span>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td>
                    <strong>{r.reason}</strong>
                    {r.details ? (
                      <div
                        className={`${styles.detailsBox} ${styles.clamp}`}
                        style={{ marginTop: 6 }}
                      >
                        {r.details}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <StatusChip status={r.status} />
                  </td>
                  <td className={`${styles.muted} ${styles.nowrap}`}>
                    {bnDateTime(r.created_at)}
                  </td>
                  <td className={styles.muted}>
                    {r.resolved_at ? (
                      <>
                        {names[r.resolved_by ?? ""] ?? "—"}
                        <br />
                        <span className={styles.nowrap}>
                          {bnDateTime(r.resolved_at)}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {r.status === "open" || r.status === "in_review" ? (
                      <form
                        action={resolveReportAction}
                        className={styles.rejectBox}
                      >
                        <input type="hidden" name="id" value={r.id} />
                        <input
                          type="text"
                          name="note"
                          className={styles.noteInline}
                          placeholder="মন্তব্য (ঐচ্ছিক)"
                          aria-label="মন্তব্য"
                        />
                        <div className={styles.rowActions}>
                          <button
                            type="submit"
                            name="action"
                            value="resolve"
                            className={`${styles.btnSm} ${styles.btnApprove}`}
                          >
                            সমাধান
                          </button>
                          <button
                            type="submit"
                            name="action"
                            value="dismiss"
                            className={`${styles.btnSm} ${styles.btnReject}`}
                          >
                            খারিজ
                          </button>
                        </div>
                      </form>
                    ) : (
                      <span className={styles.muted}>নিষ্পন্ন</span>
                    )}
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
