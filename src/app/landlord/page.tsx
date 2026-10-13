import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getRole, isStaffRole } from "../_lib/server";
import { publicImageUrl } from "../_lib/client";
import {
  PageHeader,
  StatusChip,
  EmptyState,
  StatCard,
} from "../_components/ui";
import { SiteHeader } from "@/components/ui";
import type { UserRole } from "@/lib/database.types";
import { setListingStatus } from "./actions";
import formCss from "../_components/forms.module.css";
import styles from "./landlord.module.css";

export const dynamic = "force-dynamic";

type StatusAction = { to: string; label: string; cls: string };

function actionsFor(status: string): StatusAction[] {
  switch (status) {
    case "draft":
      return [
        { to: "pending", label: "জমা দিন", cls: formCss.btnGreen },
      ];
    case "pending":
      return [{ to: "draft", label: "প্রত্যাহার", cls: formCss.btnOutline }];
    case "approved":
      return [
        { to: "inactive", label: "নিষ্ক্রিয় করুন", cls: formCss.btnOutline },
        { to: "rented", label: "ভাড়া হয়ে গেছে", cls: formCss.btnGreen },
      ];
    case "inactive":
    case "rented":
      return [{ to: "pending", label: "পুনরায় সক্রিয়", cls: formCss.btnOrange }];
    default:
      return []; // rejected / suspended / expired — কোনো মালিক-অ্যাকশন নেই
  }
}

type Listing = {
  id: string;
  listing_no: string;
  title: string;
  status: string;
  view_count: number;
  monthly_rent: number;
  district: string;
  area: string;
  updated_at: string;
  property_images: { storage_path: string; is_primary: boolean; sort_order: number }[];
};

function thumbOf(l: Listing): string | null {
  if (!l.property_images || l.property_images.length === 0) return null;
  const sorted = [...l.property_images].sort((a, b) => a.sort_order - b.sort_order);
  const primary = sorted.find((i) => i.is_primary);
  return publicImageUrl((primary ?? sorted[0]).storage_path);
}

export default async function LandlordPage() {
  const { sb, user } = await getUser();
  if (!user) redirect("/auth/login");
  const role = await getRole();
  if (role !== "landlord" && !isStaffRole(role)) redirect("/dashboard");

  const { data: listings } = await sb
    .from("properties")
    .select(
      "id, listing_no, title, status, view_count, monthly_rent, district, area, updated_at, property_images(storage_path, is_primary, sort_order)"
    )
    .eq("landlord_id", user.id)
    .order("updated_at", { ascending: false });

  const rows = (listings ?? []) as Listing[];
  const totalViews = rows.reduce((s, l) => s + (l.view_count ?? 0), 0);
  const live = rows.filter((l) => l.status === "approved").length;
  const pending = rows.filter((l) => l.status === "pending").length;

  /* ----- জিজ্ঞাসা (আমার বিজ্ঞাপন নিয়ে বার্তা) ----- */
  const { data: myMembers } = await sb
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);
  const myConvIds = (myMembers ?? []).map((m) => m.conversation_id);

  type Inquiry = {
    id: string;
    updated_at: string;
    property_title: string;
    other_name: string;
    unread: number;
  };
  let inquiries: Inquiry[] = [];
  if (myConvIds.length > 0) {
    const { data: convs } = await sb
      .from("conversations")
      .select("id, updated_at, properties!inner(id, title)")
      .eq("properties.landlord_id", user.id)
      .in("id", myConvIds)
      .order("updated_at", { ascending: false });
    const list = (convs ?? []) as unknown as {
      id: string;
      updated_at: string;
      properties: { id: string; title: string };
    }[];
    const convIds = list.map((c) => c.id);
    if (convIds.length > 0) {
      const { data: unreadMsgs } = await sb
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", convIds)
        .neq("sender_id", user.id)
        .eq("is_read", false);
      const unreadByConv = new Map<string, number>();
      for (const m of unreadMsgs ?? [])
        unreadByConv.set(
          m.conversation_id,
          (unreadByConv.get(m.conversation_id) ?? 0) + 1
        );
      // অপর পক্ষের নাম — conversation_peer() RPC (RLS-এ অন্যের প্রোফাইল সরাসরি পড়া যায় না)
      const nameByConv = new Map<string, string>();
      await Promise.all(
        convIds.map(async (cid) => {
          const { data } = await sb.rpc("conversation_peer", {
            p_conversation_id: cid,
          });
          const peer = (data ?? [])[0] as
            | { full_name: string | null }
            | undefined;
          nameByConv.set(
            cid,
            peer?.full_name?.trim() ? peer.full_name : "ভাড়াটিয়া"
          );
        })
      );
      inquiries = list.map((c) => ({
        id: c.id,
        updated_at: c.updated_at,
        property_title: c.properties.title,
        other_name: nameByConv.get(c.id) ?? "ভাড়াটিয়া",
        unread: unreadByConv.get(c.id) ?? 0,
      }));
    }
  }

  return (
    <>
      <SiteHeader
        name={(user.user_metadata?.full_name as string | undefined) ?? null}
        role={role as UserRole}
        isStaff={isStaffRole(role)}
      />
      <main className="container">
        <PageHeader
          title="আমার বিজ্ঞাপন"
          subtitle="বাসার বিজ্ঞাপন দিন, অবস্থা বদলান, জিজ্ঞাসার জবাব দিন"
          action={
            <Link href="/landlord/new" className="btn btn-accent">
              ＋ নতুন বিজ্ঞাপন
            </Link>
          }
        />

        <div className={formCss.statGrid}>
          <StatCard label="মোট বিজ্ঞাপন" value={rows.length} />
          <StatCard label="লাইভ বিজ্ঞাপন" value={live} />
          <StatCard label="পর্যালোচনাধীন" value={pending} />
          <StatCard
            label="মোট দেখা হয়েছে"
            value={totalViews.toLocaleString("bn-BD")}
          />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="এখনো কোনো বিজ্ঞাপন নেই"
            text="প্রথম বিজ্ঞাপন দিন — মাত্র কয়েক মিনিটে তৈরি হয়ে যাবে"
            action={
              <Link href="/landlord/new" className="btn btn-primary">
                নতুন বিজ্ঞাপন দিন
              </Link>
            }
          />
        ) : (
          <div>
            {rows.map((l) => {
              const thumb = thumbOf(l);
              return (
                <article key={l.id} className={styles.listingRow}>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className={styles.thumb} />
                  ) : (
                    <div className={styles.thumbEmpty}>🏠</div>
                  )}
                  <div className={styles.rowMain}>
                    <h3 className={styles.rowTitle}>{l.title}</h3>
                    <div className={styles.rowMeta}>
                      <StatusChip status={l.status} />
                      <span>
                        ৳{l.monthly_rent.toLocaleString("bn-BD")}/মাস
                      </span>
                      <span>
                        {l.district} • {l.area}
                      </span>
                      <span>
                        {(l.view_count ?? 0).toLocaleString("bn-BD")} বার দেখা
                        হয়েছে
                      </span>
                    </div>
                    <div className={styles.rowActions}>
                      <Link
                        href={`/landlord/${l.id}/edit`}
                        className={formCss.btnSmall + " " + formCss.btnOutline}
                      >
                        সম্পাদনা
                      </Link>
                      {actionsFor(l.status).map((a) => (
                        <form
                          key={a.to}
                          action={setListingStatus.bind(null, l.id, a.to)}
                        >
                          <button
                            type="submit"
                            className={formCss.btnSmall + " " + a.cls}
                          >
                            {a.label}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <h2 className={formCss.sectionTitle} style={{ marginTop: 8 }}>
          জিজ্ঞাসা
        </h2>
        {inquiries.length === 0 ? (
          <EmptyState
            title="কোনো জিজ্ঞাসা নেই"
            text="ভাড়াটিয়ারা আপনার বিজ্ঞাপন দেখে বার্তা পাঠালে এখানে দেখা যাবে"
          />
        ) : (
          <div>
            {inquiries.map((q) => (
              <Link
                key={q.id}
                href="/messages"
                className={styles.inquiryRow}
              >
                <div className={styles.inquiryMain}>
                  <p className={styles.inquiryTitle}>{q.property_title}</p>
                  <p className={styles.inquirySub}>
                    {q.other_name} •{" "}
                    {new Date(q.updated_at).toLocaleDateString("bn-BD", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                {q.unread > 0 && (
                  <span className={styles.unread}>
                    {q.unread.toLocaleString("bn-BD")}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
