import { redirect } from "next/navigation";
import Link from "next/link";
import { isStaff } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { StatusChip, EmptyState } from "@/components/ui";
import { bnDateTime, bnTaka } from "@/lib/format";
import { PROPERTY_TYPE_LABELS } from "@/lib/labels";
import type { PropertyStatus } from "@/lib/database.types";
import styles from "../admin.module.css";

export const metadata = {
  title: "বিজ্ঞাপন যাচাই — অ্যাডমিন",
};

const FILTERS = [
  { v: "all", label: "সব" },
  { v: "pending", label: "অপেক্ষমাণ" },
  { v: "approved", label: "অনুমোদিত" },
  { v: "rejected", label: "প্রত্যাখ্যান" },
  { v: "suspended", label: "স্থগিত" },
  { v: "draft", label: "খসড়া" },
  { v: "rented", label: "ভাড়া হয়েছে" },
  { v: "inactive", label: "নিষ্ক্রিয়" },
];

const OK_MSG: Record<string, string> = {
  approve: "বিজ্ঞাপন অনুমোদন করা হয়েছে।",
  reject: "বিজ্ঞাপন প্রত্যাখ্যান করা হয়েছে।",
  suspend: "বিজ্ঞাপন স্থগিত করা হয়েছে।",
};

const ERR_MSG: Record<string, string> = {
  bad_request: "অবৈধ অনুরোধ।",
  reason_required: "প্রত্যাখ্যানের কারণ লিখুন।",
  forbidden: "এই কাজের অনুমতি আপনার নেই।",
  not_found: "বিজ্ঞাপন পাওয়া যায়নি।",
  unknown: "কিছু ভুল হয়েছে, আবার চেষ্টা করুন।",
};

function dbErrorCode(msg: string): string {
  if (msg.includes("forbidden")) return "forbidden";
  if (msg.includes("listing not found")) return "not_found";
  if (msg.includes("invalid action")) return "bad_request";
  return "unknown";
}

async function moderateListing(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id || !["approve", "reject", "suspend"].includes(action)) {
    redirect("/admin/listings?err=bad_request");
  }
  if (action === "reject" && note.length === 0) {
    redirect("/admin/listings?err=reason_required");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_listing", {
    p_id: id,
    p_action: action,
    p_note: note || null,
  });
  if (error) redirect(`/admin/listings?err=${dbErrorCode(error.message)}`);
  redirect(`/admin/listings?ok=${action}`);
}

type ListingRow = {
  id: string;
  listing_no: string;
  title: string;
  district: string;
  area: string;
  monthly_rent: number;
  status: string;
  created_at: string;
  landlord_id: string;
  property_type: string;
};

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; ok?: string; err?: string }>;
}) {
  if (!(await isStaff())) redirect("/");

  const sp = await searchParams;
  const filter =
    sp.status && FILTERS.some((f) => f.v === sp.status) ? sp.status : "all";
  const supabase = await createClient();

  const { data: pendingData } = await supabase
    .from("properties")
    .select(
      "id, listing_no, title, district, area, monthly_rent, created_at, landlord_id, property_type"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  let listQuery = supabase
    .from("properties")
    .select(
      "id, listing_no, title, district, area, monthly_rent, status, created_at, landlord_id, property_type"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter !== "all")
    listQuery = listQuery.eq("status", filter as PropertyStatus);
  const { data: listData } = await listQuery;

  const pendingRows = (pendingData ?? []) as ListingRow[];
  const listingRows = (listData ?? []) as ListingRow[];

  const landlordIds = [
    ...new Set(
      [...pendingRows, ...listingRows].map((r) => r.landlord_id)
    ),
  ];
  const names: Record<string, string> = {};
  if (landlordIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", landlordIds);
    for (const p of profs ?? []) names[p.id] = p.full_name;
  }

  return (
    <>
      <h1 className={styles.pageTitle}>বিজ্ঞাপন যাচাই</h1>
      <p className={styles.pageSub}>
        অপেক্ষমাণ বিজ্ঞাপন সবার আগে দেখুন, তারপর সব বিজ্ঞাপনের তালিকা।
      </p>

      {sp.ok && OK_MSG[sp.ok] ? (
        <p className={`${styles.alert} ${styles.alertOk}`}>{OK_MSG[sp.ok]}</p>
      ) : null}
      {sp.err && ERR_MSG[sp.err] ? (
        <p className={`${styles.alert} ${styles.alertErr}`}>
          {ERR_MSG[sp.err]}
        </p>
      ) : null}

      <h2 className={styles.sectionTitle}>
        অপেক্ষমাণ বিজ্ঞাপন{" "}
        <span className={styles.count}>
          ({pendingRows.length.toLocaleString("bn-BD")}টি)
        </span>
      </h2>

      {pendingRows.length === 0 ? (
        <EmptyState
          title="অপেক্ষমাণ বিজ্ঞাপন নেই"
          hint="এই মুহূর্তে যাচাইয়ের অপেক্ষায় কোনো বিজ্ঞাপন নেই।"
        />
      ) : (
        pendingRows.map((p) => (
          <div key={p.id} className={styles.pendingCard}>
            <h3>{p.title}</h3>
            <p className={styles.muted}>
              {p.listing_no} · {PROPERTY_TYPE_LABELS[p.property_type] ?? p.property_type} ·
              বাড়িওয়ালা: {names[p.landlord_id] ?? "—"}
              <br />
              {p.district}, {p.area} · ভাড়া {bnTaka(p.monthly_rent)} · জমা{" "}
              {bnDateTime(p.created_at)}
            </p>
            <form action={moderateListing} className={styles.rejectBox}>
              <input type="hidden" name="id" value={p.id} />
              <textarea
                name="note"
                rows={2}
                placeholder="প্রত্যাখ্যানের কারণ (প্রত্যাখ্যান করলে আবশ্যক)"
                aria-label="প্রত্যাখ্যানের কারণ"
              />
              <div className={styles.rowActions}>
                <button
                  type="submit"
                  name="action"
                  value="approve"
                  className={`${styles.btnSm} ${styles.btnApprove}`}
                >
                  অনুমোদন
                </button>
                <button
                  type="submit"
                  name="action"
                  value="reject"
                  className={`${styles.btnSm} ${styles.btnReject}`}
                >
                  প্রত্যাখ্যান
                </button>
                <button
                  type="submit"
                  name="action"
                  value="suspend"
                  className={`${styles.btnSm} ${styles.btnSuspend}`}
                >
                  স্থগিত
                </button>
              </div>
            </form>
          </div>
        ))
      )}

      <h2 className={styles.sectionTitle}>সব বিজ্ঞাপন</h2>
      <div
        className={styles.filterBar}
        role="navigation"
        aria-label="অবস্থা অনুযায়ী ফিল্টার"
      >
        {FILTERS.map((f) => (
          <Link
            key={f.v}
            href={
              f.v === "all" ? "/admin/listings" : `/admin/listings?status=${f.v}`
            }
            className={`${styles.filterLink} ${
              filter === f.v ? styles.filterActive : ""
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {listingRows.length === 0 ? (
        <EmptyState
          title="কোনো বিজ্ঞাপন নেই"
          hint="এই ফিল্টারে কোনো বিজ্ঞাপন পাওয়া যায়নি।"
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>বিজ্ঞাপন</th>
                <th>বাড়িওয়ালা</th>
                <th>এলাকা</th>
                <th>ভাড়া</th>
                <th>অবস্থা</th>
                <th>জমা</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {listingRows.map((p) => (
                <tr key={p.id}>
                  <td className={styles.titleCell}>
                    {p.title}
                    <div className={styles.mono}>{p.listing_no}</div>
                  </td>
                  <td>{names[p.landlord_id] ?? "—"}</td>
                  <td className={styles.nowrap}>
                    {p.district}, {p.area}
                  </td>
                  <td className={styles.nowrap}>{bnTaka(p.monthly_rent)}</td>
                  <td>
                    <StatusChip status={p.status} />
                  </td>
                  <td className={`${styles.muted} ${styles.nowrap}`}>
                    {bnDateTime(p.created_at)}
                  </td>
                  <td>
                    <form action={moderateListing} className={styles.rowActions}>
                      <input type="hidden" name="id" value={p.id} />
                      {p.status !== "approved" && (
                        <button
                          type="submit"
                          name="action"
                          value="approve"
                          className={`${styles.btnSm} ${styles.btnApprove}`}
                        >
                          অনুমোদন
                        </button>
                      )}
                      {(p.status === "approved" || p.status === "pending") && (
                        <button
                          type="submit"
                          name="action"
                          value="suspend"
                          className={`${styles.btnSm} ${styles.btnSuspend}`}
                        >
                          স্থগিত
                        </button>
                      )}
                    </form>
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
