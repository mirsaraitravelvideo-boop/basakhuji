import { redirect } from "next/navigation";
import { getUser } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { ConversationPeerRow, MessagesRow } from "@/lib/database.types";
import Thread from "./_components/Thread";

export const metadata = {
  title: "কথোপকথন — বাসাখুঁজি বাংলাদেশ",
};

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/messages/${id}`)}`);

  const supabase = await createClient();

  // আমি এই কথোপকথনের সদস্য কি না — না হলে তালিকায় ফেরত
  const { data: membership } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect("/messages");

  const [{ data: conv }, { data: msgs }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, property_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, attachment_path, is_read, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(200),
  ]);

  // অপর পক্ষের পরিচয় — conversation_peer() RPC (security definer; শুধু সদস্য দেখতে পারে)
  let propertyTitle: string | null = null;
  let otherName = "আলাপচারী";
  const propId = conv?.property_id ?? null;
  if (propId) {
    const { data: prop } = await supabase
      .from("properties")
      .select("title")
      .eq("id", propId)
      .maybeSingle();
    propertyTitle = prop?.title ?? null;
  }
  const { data: peerRows } = await supabase.rpc("conversation_peer", {
    p_conversation_id: id,
  });
  const peerRow = (peerRows ?? [])[0] as ConversationPeerRow | undefined;
  if (peerRow?.full_name?.trim()) otherName = peerRow.full_name;

  // রিড রসিদ: অন্যের পাঠানো অপঠিত বার্তা পড়া হিসেবে চিহ্নিত
  // (RLS msg_update_read_receipt সদস্যদের অনুমতি দেয়; trigger শুধু body-এডিট ঠেকায়)
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", id)
    .neq("sender_id", user.id)
    .eq("is_read", false);

  const initialMessages: MessagesRow[] = (msgs ?? []).map((m) => ({ ...m }));

  return (
    <Thread
      conversationId={id}
      myId={user.id}
      initialMessages={initialMessages}
      otherName={otherName}
      propertyTitle={propertyTitle}
    />
  );
}
