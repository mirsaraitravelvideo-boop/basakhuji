import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getRole, isStaffRole, ROLE_BN } from "../_lib/server";
import { publicImageUrl } from "../_lib/client";
import {
  PageHeader,
  Field,
  StatusChip,
  EmptyState,
  StatCard,
} from "../_components/ui";
import { SiteHeader } from "@/components/ui";
import type { UserRole } from "@/lib/database.types";
import {
  unsaveProperty,
  createAlert,
  toggleAlert,
  deleteAlert,
  updateProfile,
} from "./actions";
import formCss from "../_components/forms.module.css";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

const PROPERTY_TYPE_BN: Record<string, string> = {
  flat: "ফ্ল্যাট",
  house: "বাড়ি",
  room: "রুম",
  sublet: "সাবলেট",
  office: "অফিস",
  shop: "দোকান",
  plot: "প্লট",
};

type AlertFilters = {
  district?: string;
  area?: string;
  from_area?: string;
  min_rent?: number;
  max_rent?: number;
  property_type?: string;
};

function alertLabel(f: AlertFilters): string {
  const parts: string[] = [];
  if (f.district) parts.push(f.district);
  if (f.area) parts.push(f.area);
  if (f.from_area) parts.push(`${f.from_area} থেকে`);
  if (f.min_rent != null || f.max_rent != null) {
    const fmt = (n: number) => "৳" + n.toLocaleString("bn-BD");
    parts.push(
      `${f.min_rent != null ? fmt(f.min_rent) : ""}–${
        f.max_rent != null ? fmt(f.max_rent) : "∞"
      }`
    );
  }
  if (f.property_type)
    parts.push(PROPERTY_TYPE_BN[f.property_type] ?? f.property_type);
  return parts.join(" • ") || "সব বাসা";
}

type SavedRow = {
  properties: {
    id: string;
    title: string;
    district: string;
    area: string;
    monthly_rent: number;
    property_type: string;
    bedrooms: number | null;
    status: string;
    property_images: {
      storage_path: string;
      is_primary: boolean;
      sort_order: number;
    }[];
  } | null;
};

export default async function DashboardPage() {
  const { sb, user } = await getUser();
  if (!user) redirect("/auth/login");
  const role = await getRole();

  /* ----- সংরক্ষিত বাসা ----- */
  const { data: savedRaw } = await sb
    .from("saved_properties")
    .select(
      "properties(id, title, district, area, monthly_rent, property_type, bedrooms, status, property_images(storage_path, is_primary, sort_order))"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const saved = ((savedRaw ?? []) as unknown as SavedRow[])
    .map((s) => s.properties)
    .filter((p) => p !== null);

  /* ----- সার্চ অ্যালার্ট ----- */
  const { data: alertsRaw } = await sb
    .from("search_alerts")
    .select("id, filters, is_active, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const alerts = (alertsRaw ?? []) as {
    id: string;
    filters: AlertFilters;
    is_active: boolean;
    created_at: string;
  }[];

  /* ----- অপঠিত বার্তা ----- */
  const { data: myMembers } = await sb
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);
  const convIds = (myMembers ?? []).map((m) => m.conversation_id);
  let unread = 0;
  if (convIds.length > 0) {
    const { count } = await sb
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .neq("sender_id", user.id)
      .eq("is_read", false);
    unread = count ?? 0;
  }

  /* ----- আমার রিপোর্ট ----- */
  const { data: reportsRaw } = await sb
    .from("reports")
    .select("id, reason, details, status, created_at, properties(title)")
    .eq("reporter_id", user.id)
    .order("created_at", { ascending: false });
  const reports = (reportsRaw ?? []) as unknown as {
    id: string;
    reason: string;
    details: string | null;
    status: string;
    created_at: string;
    properties: { title: string } | null;
  }[];

  /* ----- প্রোফাইল ----- */
  const { data: profile } = await sb
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .single();

  const activeAlerts = alerts.filter((a) => a.is_active).length;

  return (
    <>
      <SiteHeader
        name={profile?.full_name ?? null}
        role={role as UserRole}
        isStaff={isStaffRole(role)}
      />
      <main className="container">
        <PageHeader
          title="আমার ড্যাশবোর্ড"
          subtitle={`${ROLE_BN[role]} হিসেবে লগইন করেছেন`}
        />

        <div className={formCss.statGrid}>
          <StatCard label="সংরক্ষিত বাসা" value={saved.length} />
          <StatCard label="সক্রিয় অ্যালার্ট" value={activeAlerts} />
          <StatCard label="অপঠিত বার্তা" value={unread} href="/messages" />
          <StatCard label="আমার রিপোর্ট" value={reports.length} />
        </div>

        {/* ----- সংরক্ষিত বাসা ----- */}
        <section className={formCss.sectionCard}>
          <h2 className={formCss.sectionTitle}>সংরক্ষিত বাসা</h2>
          {saved.length === 0 ? (
            <EmptyState
              title="কোনো বাসা সংরক্ষণ করেননি"
              text="পছন্দের বাসা খুঁজে সংরক্ষণ করুন — পরে এখানে পাবেন"
              action={
                <Link href="/search" className="btn btn-primary">
                  বাসা খুঁজুন
                </Link>
              }
            />
          ) : (
            <div className={styles.grid}>
              {saved.map((p) => {
                const imgs = [...(p.property_images ?? [])].sort(
                  (a, b) => a.sort_order - b.sort_order
                );
                const primary =
                  imgs.find((i) => i.is_primary) ?? imgs[0] ?? null;
                return (
                  <article key={p.id} className={styles.savedCard}>
                    {primary ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={publicImageUrl(primary.storage_path)}
                        alt={p.title}
                        className={styles.savedImg}
                      />
                    ) : (
                      <div className={styles.savedImgEmpty}>🏠</div>
                    )}
                    <div className={styles.savedBody}>
                      <h3 className={styles.savedTitle}>
                        <Link href={`/p/${p.id}`}>{p.title}</Link>
                      </h3>
                      <p className={styles.savedMeta}>
                        {PROPERTY_TYPE_BN[p.property_type] ?? p.property_type} •{" "}
                        {p.district} • {p.area}
                        {p.bedrooms != null &&
                          ` • ${p.bedrooms.toLocaleString("bn-BD")} বেডরুম`}
                      </p>
                      <div className={styles.savedFoot}>
                        <span className={styles.rent}>
                          ৳{p.monthly_rent.toLocaleString("bn-BD")}/মাস
                        </span>
                        <form
                          action={unsaveProperty.bind(null, p.id)}
                        >
                          <button
                            type="submit"
                            className={formCss.btnSmall + " " + formCss.btnDanger}
                          >
                            বাদ দিন
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ----- সার্চ অ্যালার্ট ----- */}
        <section className={formCss.sectionCard}>
          <h2 className={formCss.sectionTitle}>সার্চ অ্যালার্ট</h2>
          {alerts.length === 0 ? (
            <EmptyState
              title="কোনো অ্যালার্ট নেই"
              text="পছন্দের শর্তে অ্যালার্ট বানান — নতুন বিজ্ঞাপন এলে জানতে পারবেন"
            />
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className={`${styles.alertRow} ${a.is_active ? "" : styles.off}`}
              >
                <span className={styles.alertDesc}>{alertLabel(a.filters)}</span>
                <div className={styles.alertBtns}>
                  <form
                    action={toggleAlert.bind(null, a.id, !a.is_active)}
                  >
                    <button
                      type="submit"
                      className={
                        formCss.btnSmall +
                        " " +
                        (a.is_active ? formCss.btnOutline : formCss.btnGreen)
                      }
                    >
                      {a.is_active ? "বন্ধ করুন" : "চালু করুন"}
                    </button>
                  </form>
                  <form action={deleteAlert.bind(null, a.id)}>
                    <button
                      type="submit"
                      className={formCss.btnSmall + " " + formCss.btnDanger}
                    >
                      মুছুন
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
          <h3 className={formCss.sectionTitle} style={{ marginTop: 18 }}>
            নতুন অ্যালার্ট
          </h3>
          <form action={createAlert}>
            <div className={formCss.grid2}>
              <Field label="জেলা" required>
                <input
                  name="district"
                  className={formCss.input}
                  placeholder="যেমন: চট্টগ্রাম"
                  maxLength={60}
                  required
                />
              </Field>
              <Field label="এলাকা">
                <input
                  name="area"
                  className={formCss.input}
                  placeholder="যেমন: মিরসরাই"
                  maxLength={80}
                />
              </Field>
              <Field label="বর্তমান এলাকা (ঐচ্ছিক)">
                <input
                  name="from_area"
                  className={formCss.input}
                  placeholder="যেমন: মিরসরাই — এখন যেখানে থাকেন"
                  maxLength={80}
                />
              </Field>
              <Field label="সর্বনিম্ন ভাড়া (টাকা)">
                <input
                  name="min_rent"
                  type="number"
                  min={0}
                  className={formCss.input}
                />
              </Field>
              <Field label="সর্বোচ্চ ভাড়া (টাকা)">
                <input
                  name="max_rent"
                  type="number"
                  min={0}
                  className={formCss.input}
                />
              </Field>
              <Field label="বাসার ধরন">
                <select name="property_type" className={formCss.select}>
                  <option value="">সব ধরন</option>
                  {Object.entries(PROPERTY_TYPE_BN).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className={formCss.btnRow}>
              <button type="submit" className="btn btn-primary">
                অ্যালার্ট তৈরি করুন
              </button>
            </div>
          </form>
        </section>

        {/* ----- আমার বার্তা ----- */}
        <section className={formCss.sectionCard}>
          <h2 className={formCss.sectionTitle}>আমার বার্তা</h2>
          <Link href="/messages" className={styles.msgLink}>
            <span>বার্তা দেখুন</span>
            {unread > 0 ? (
              <span className={styles.msgCount}>
                {unread.toLocaleString("bn-BD")}টি নতুন
              </span>
            ) : (
              <span className={styles.msgCount} style={{ background: "#9aa5a0" }}>
                নতুন নেই
              </span>
            )}
          </Link>
        </section>

        {/* ----- আমার রিপোর্ট ----- */}
        <section className={formCss.sectionCard}>
          <h2 className={formCss.sectionTitle}>আমার রিপোর্ট</h2>
          {reports.length === 0 ? (
            <EmptyState
              title="কোনো রিপোর্ট করেননি"
              text="সন্দেহজনক বিজ্ঞাপন বা ব্যবহারকারী সম্পর্কে রিপোর্ট করলে এখানে দেখা যাবে"
            />
          ) : (
            reports.map((r) => (
              <div key={r.id} className={styles.reportRow}>
                <div className={styles.reportTop}>
                  <p className={styles.reportReason}>{r.reason}</p>
                  <StatusChip status={r.status} />
                </div>
                {r.properties && (
                  <p className={styles.reportMeta}>{r.properties.title}</p>
                )}
                {r.details && (
                  <p className={styles.reportMeta}>{r.details}</p>
                )}
                <p className={styles.reportMeta}>
                  {new Date(r.created_at).toLocaleDateString("bn-BD", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))
          )}
        </section>

        {/* ----- অ্যাকাউন্ট ----- */}
        <section className={formCss.sectionCard}>
          <h2 className={formCss.sectionTitle}>অ্যাকাউন্ট</h2>
          <div className={styles.accountRow}>
            <span className={styles.accountLabel}>ভূমিকা</span>
            <span>{ROLE_BN[role]}</span>
          </div>
          <form action={updateProfile} style={{ marginTop: 12 }}>
            <div className={formCss.grid2}>
              <Field label="পুরো নাম" required>
                <input
                  name="full_name"
                  className={formCss.input}
                  defaultValue={profile?.full_name ?? ""}
                  maxLength={80}
                  required
                />
              </Field>
              <Field label="ফোন নম্বর">
                <input
                  name="phone"
                  className={formCss.input}
                  defaultValue={profile?.phone ?? ""}
                  maxLength={20}
                  placeholder="01XXXXXXXXX"
                />
              </Field>
            </div>
            <div className={formCss.btnRow}>
              <button type="submit" className="btn btn-primary">
                সংরক্ষণ করুন
              </button>
            </div>
          </form>
          <form action="/auth/logout" method="post" style={{ marginTop: 12 }}>
            <button
              type="submit"
              className={formCss.btnSmall + " " + formCss.btnDanger}
            >
              লগআউট
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
