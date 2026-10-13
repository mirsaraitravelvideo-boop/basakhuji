"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { MessagesRow } from "@/lib/database.types";
import styles from "../thread.module.css";

export type ChatMessage = Pick<
  MessagesRow,
  "id" | "sender_id" | "body" | "attachment_path" | "is_read" | "created_at"
>;

type ThreadProps = {
  conversationId: string;
  myId: string;
  initialMessages: ChatMessage[];
  otherName: string;
  propertyTitle: string | null;
};

function fmtTime(iso: string): string {
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

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export default function Thread({
  conversationId,
  myId,
  initialMessages,
  otherName,
  propertyTitle,
}: ThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // রিয়েলটাইম: নতুন বার্তা এলে তালিকায় যোগ (id দিয়ে ডিডুপ)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id)
              ? prev
              : [...prev, incoming]
          );
          // অন্যের বার্তা দেখা মাত্র পড়া হিসেবে চিহ্নিত
          if (incoming.sender_id !== myId) {
            void supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", incoming.id);
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, myId]);

  // ছবির সাইনড URL — একবার বানিয়ে ক্যাশে রাখা হয়
  useEffect(() => {
    const missing = [
      ...new Set(
        messages
          .map((m) => m.attachment_path)
          .filter((p): p is string => !!p && !signedUrls[p])
      ),
    ];
    if (missing.length === 0) return;
    const supabase = createClient();
    (async () => {
      const entries = await Promise.all(
        missing.map(async (path) => {
          const { data } = await supabase.storage
            .from("chat-attachments")
            .createSignedUrl(path, 3600);
          return [path, data?.signedUrl ?? ""] as const;
        })
      );
      setSignedUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [messages, signedUrls]);

  // নতুন বার্তায় নিচে স্ক্রল
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("লগইন মেয়াদ শেষ হয়েছে। আবার লগইন করুন।");
        return;
      }
      const { data, error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          body: text,
        })
        .select("id, sender_id, body, attachment_path, is_read, created_at")
        .single();
      if (insertError) throw insertError;
      const row = data as ChatMessage;
      setMessages((prev) =>
        prev.some((m) => m.id === row.id) ? prev : [...prev, row]
      );
      setDraft("");
    } catch {
      setError("বার্তা পাঠানো যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setSending(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("শুধু ছবি (JPG/PNG) পাঠানো যাবে।");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("ছবির আকার ৫MB-এর বেশি হতে পারবে না।");
      return;
    }
    setAttaching(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("লগইন মেয়াদ শেষ হয়েছে। আবার লগইন করুন।");
        return;
      }
      const ext =
        file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
        "jpg";
      const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data, error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          body: null,
          attachment_path: path,
        })
        .select("id, sender_id, body, attachment_path, is_read, created_at")
        .single();
      if (insertError) throw insertError;
      const row = data as ChatMessage;
      setMessages((prev) =>
        prev.some((m) => m.id === row.id) ? prev : [...prev, row]
      );
    } catch {
      setError("ছবি পাঠানো যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setAttaching(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <Link
          href="/messages"
          className={styles.backLink}
          aria-label="বার্তা তালিকায় ফিরুন"
        >
          ← বার্তা
        </Link>
        <div className={styles.peer}>
          <p className={styles.peerName}>{otherName}</p>
          {propertyTitle ? (
            <p className={styles.propTitle}>🏠 {propertyTitle}</p>
          ) : null}
        </div>
      </div>

      <div ref={scrollRef} className={styles.scroll} aria-live="polite">
        {messages.length === 0 ? (
          <p className={styles.emptyNote}>
            এখনো কোনো বার্তা নেই। নিচে লিখে প্রথম বার্তা পাঠান।
          </p>
        ) : null}
        {messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div
              key={m.id}
              className={`${styles.row} ${mine ? styles.mine : styles.theirs}`}
            >
              <div className={styles.bubble}>
                {m.attachment_path ? (
                  signedUrls[m.attachment_path] ? (
                    <img
                      src={signedUrls[m.attachment_path]}
                      alt="পাঠানো ছবি"
                      className={styles.img}
                      loading="lazy"
                    />
                  ) : (
                    <span className={styles.imgLoading}>ছবি লোড হচ্ছে…</span>
                  )
                ) : null}
                {m.body ? <p className={styles.text}>{m.body}</p> : null}
                <span className={styles.meta}>
                  {fmtTime(m.created_at)}
                  {mine ? (m.is_read ? " ✓✓" : " ✓") : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {attaching ? (
        <p className={styles.uploading}>ছবি আপলোড হচ্ছে…</p>
      ) : null}

      <form className={styles.composer} onSubmit={handleSend}>
        <button
          type="button"
          className={styles.attachBtn}
          onClick={() => fileRef.current?.click()}
          disabled={attaching}
          aria-label="ছবি পাঠান"
          title="ছবি পাঠান"
        >
          📷
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFile}
          tabIndex={-1}
          aria-hidden="true"
        />
        <input
          className={styles.textInput}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="বার্তা লিখুন…"
          maxLength={2000}
          aria-label="বার্তা"
          autoComplete="off"
        />
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={!draft.trim() || sending}
        >
          {sending ? "…" : "পাঠান"}
        </button>
      </form>
    </div>
  );
}
