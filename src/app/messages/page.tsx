import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getRole, isStaff, getMyProfile } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader, EmptyState } from "@/components/ui";
import type { ConversationPeerRow } from "@/lib/database.types";
import styles from "./messages.module.css";

export const metadata = {
  title: "বার্তা — বাসাখুঁজি বাংলাদেশ",
  description: "বাড়িওয়ালা ও ভাড়াটিয়ার মধ্যে নিরাপদ বার্তালাপ।",
};

function fmtTs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("bn-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

type ThreadItem = {
  id: string;
  name: string;
  propertyTitle: string | null;
  preview: string;
  time: string;
  sortKey: string;
  unread: number;
};

export default async function MessagesPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login?next=/messages");

  const [role, staff, profile] = await Promise.all([
    getRole(),
    isStaff(),
    getMyProfile(),
  ]);
  const supabase = await createClient();

  const { data: membershipRows } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);
  const convIds = (membershipRows ?? []).map((m) => m.conversation_id);

  if (convIds.length === 0) {
    return (
      <>
        <SiteHeader
          name={profile?.full_name ?? null}
          role={role}
          isStaff={staff}
        />
        <main className="container">
          <h1 className={styles.pageTitle}>বার্তা</h1>
          <EmptyState
            title="এখনো কোনো বার্তা নেই"
            hint="পছন্দের বাসার বিজ্ঞাপন খুলে বাড়িওয়ালাকে সরাসরি বার্তা পাঠাতে পারবেন।"
            actionHref="/search"
            actionLabel="বাসা খুঁজুন"
          />
        </main>
      </>
    );
  }

  const [{ data: convRows }, { data: msgRows }, { data: unreadRows }] =
    await Promise.all([
      supabase
        .from("conversations")
        .select("id, property_id, created_at")
        .in("id", convIds),
      supabase
        .from("messages")
        .select("conversation_id, body, attachment_path, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", convIds)
        .eq("is_read", false)
        .neq("sender_id", user.id)
        .limit(2000),
    ]);

  const convs = convRows ?? [];

  const propIds = [
    ...new Set(
      convs.map((c) => c.property_id).filter((p): p is string => !!p)
    ),
  ];
  let propRows: { id: string; title: string; landlord_id: string }[] = [];
  if (propIds.length > 0) {
    const { data } = await supabase
      .from("properties")
      .select("id, title, landlord_id")
      .in("id", propIds);
    propRows = data ?? [];
  }
  const propById = new Map(propRows.map((p) => [p.id, p]));

  // অপর পক্ষের নাম — conversation_peer() RPC (security definer; শুধু সদস্য দেখতে পারে)
  const nameByConv = new Map<string, string>();
  await Promise.all(
    convs.map(async (c) => {
      const { data } = await supabase.rpc("conversation_peer", {
        p_conversation_id: c.id,
      });
      const peer = (data ?? [])[0] as ConversationPeerRow | undefined;
      nameByConv.set(
        c.id,
        peer?.full_name?.trim() ? peer.full_name : "আলাপচারী"
      );
    })
  );

  const lastByConv = new Map<
    string,
    { body: string | null; attachment_path: string | null; created_at: string }
  >();
  for (const r of msgRows ?? []) {
    if (!lastByConv.has(r.conversation_id)) lastByConv.set(r.conversation_id, r);
  }
  const unreadByConv = new Map<string, number>();
  for (const r of unreadRows ?? []) {
    unreadByConv.set(r.conversation_id, (unreadByConv.get(r.conversation_id) ?? 0) + 1);
  }

  const items: ThreadItem[] = convs
    .map((c) => {
      const last = lastByConv.get(c.id);
      const prop = c.property_id ? propById.get(c.property_id) : undefined;
      return {
        id: c.id,
        name: nameByConv.get(c.id) ?? "আলাপচারী",
        propertyTitle: prop?.title ?? null,
        preview: last
          ? last.body && last.body.trim()
            ? last.body.trim().slice(0, 80)
            : "📷 ছবি পাঠানো হয়েছে"
          : "—",
        time: fmtTs(last?.created_at ?? c.created_at),
        sortKey: last?.created_at ?? c.created_at,
        unread: unreadByConv.get(c.id) ?? 0,
      };
    })
    .sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));

  return (
    <>
      <SiteHeader
        name={profile?.full_name ?? null}
        role={role}
        isStaff={staff}
      />
      <main className="container">
        <h1 className={styles.pageTitle}>বার্তা</h1>
        <div className={styles.list}>
          {items.map((t) => (
            <Link key={t.id} href={`/messages/${t.id}`} className={styles.row}>
              <span className={styles.avatar} aria-hidden="true">
                {t.name.charAt(0)}
              </span>
              <span className={styles.body}>
                <span className={styles.nameRow}>
                  <span className={styles.name}>{t.name}</span>
                  <span className={styles.time}>{t.time}</span>
                </span>
                {t.propertyTitle ? (
                  <span className={styles.prop}>🏠 {t.propertyTitle}</span>
                ) : null}
                <span className={styles.previewRow}>
                  <span className={styles.preview}>{t.preview}</span>
                  {t.unread > 0 ? (
                    <span className={styles.badge} aria-label={`${t.unread}টি অপঠিত বার্তা`}>
                      {t.unread}
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
