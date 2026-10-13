"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import styles from "../detail.module.css";

const REPORT_REASONS = [
  "ভুয়া বিজ্ঞাপন",
  "ভুল তথ্য",
  "ভুল ভাড়া বা ঠিকানা",
  "অন্যান্য",
];

/** সংরক্ষণ / শেয়ার / রিপোর্ট / যোগাযোগ */
export default function ListingActions({
  propertyId,
  title,
}: {
  propertyId: string;
  title: string;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [contactBody, setContactBody] = useState("");
  const [contactMsg, setContactMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser(u);
      if (u) {
        supabase
          .from("saved_properties")
          .select("property_id")
          .eq("user_id", u.id)
          .eq("property_id", propertyId)
          .maybeSingle()
          .then(({ data: row }) => setSaved(!!row));
      }
    });
  }, [propertyId]);

  function needLogin() {
    router.push(`/auth/login?next=/p/${propertyId}`);
  }

  async function toggleSave() {
    if (!user) return needLogin();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    try {
      if (saved) {
        const { error } = await supabase
          .from("saved_properties")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", propertyId);
        if (error) throw error;
        setSaved(false);
        setMsg("সংরক্ষণ থেকে সরানো হয়েছে।");
      } else {
        const { error } = await supabase
          .from("saved_properties")
          .insert({ user_id: user.id, property_id: propertyId });
        if (error) throw error;
        setSaved(true);
        setMsg("সংরক্ষণ করা হয়েছে।");
      }
    } catch {
      setMsg("দুঃখিত, আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        return; // ইউজার বাতিল করেছে
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("লিংক কপি হয়েছে");
      window.setTimeout(() => setShareMsg(null), 2500);
    } catch {
      setShareMsg("লিংক কপি করা যায়নি");
    }
  }

  async function submitReport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return needLogin();
    setBusy(true);
    setReportMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      property_id: propertyId,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (error) {
      setReportMsg("দুঃখিত, রিপোর্ট পাঠানো যায়নি। আবার চেষ্টা করুন।");
      return;
    }
    setReportMsg("রিপোর্ট পাঠানো হয়েছে। আমাদের টিম যাচাই করে দেখবে।");
    setDetails("");
  }

  async function submitContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return needLogin();
    const body = contactBody.trim();
    if (!body) {
      setContactMsg("মেসেজ লিখুন।");
      return;
    }
    setBusy(true);
    setContactMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc(
      "create_conversation_with_message",
      { p_property_id: propertyId, p_body: body }
    );
    setBusy(false);
    if (error) {
      const m = error.message ?? "";
      if (m.includes("cannot message yourself")) {
        setContactMsg("এটি আপনার নিজের বিজ্ঞাপন।");
      } else if (m.includes("listing not available")) {
        setContactMsg("বিজ্ঞাপনটি আর উপলব্ধ নেই।");
      } else {
        setContactMsg("দুঃখিত, মেসেজ পাঠানো যায়নি। আবার চেষ্টা করুন।");
      }
      return;
    }
    router.push(`/messages/${data}`);
  }

  return (
    <div className={styles.actions}>
      <div className={styles.actionRow}>
        <button
          type="button"
          className={`btn ${saved ? "btn-primary" : "btn-outline"}`}
          onClick={toggleSave}
          disabled={busy}
        >
          {saved ? "★ সংরক্ষিত" : "☆ সংরক্ষণ"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={share}
          aria-live="polite"
        >
          {shareMsg ?? "🔗 শেয়ার"}
        </button>
      </div>
      {msg && (
        <p className={styles.inlineMsg} role="status">
          {msg}
        </p>
      )}

      <div className={styles.actionRow}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setShowContact((v) => !v)}
          aria-expanded={showContact}
        >
          💬 যোগাযোগ করুন
        </button>
        <button
          type="button"
          className={`btn ${showReport ? "btn-primary" : "btn-outline"}`}
          onClick={() => setShowReport((v) => !v)}
          aria-expanded={showReport}
        >
          ⚠️ রিপোর্ট
        </button>
      </div>

      {showContact && (
        <form onSubmit={submitContact} className={styles.subForm}>
          <label>
            বাড়িওয়ালাকে মেসেজ
            <textarea
              rows={3}
              placeholder="যেমন: বাসাটি কি এখনো খালি আছে? দেখতে কবে আসতে পারি?"
              value={contactBody}
              onChange={(e) => setContactBody(e.target.value)}
              maxLength={1000}
            />
          </label>
          {contactMsg && (
            <p className={styles.inlineMsg} role="status">
              {contactMsg}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            মেসেজ পাঠান
          </button>
        </form>
      )}

      {showReport && (
        <form onSubmit={submitReport} className={styles.subForm}>
          <label>
            কারণ
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            বিস্তারিত (ঐচ্ছিক)
            <textarea
              rows={3}
              placeholder="কী সমস্যা দেখলেন, সংক্ষেপে লিখুন"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
            />
          </label>
          {reportMsg && (
            <p className={styles.inlineMsg} role="status">
              {reportMsg}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            রিপোর্ট পাঠান
          </button>
        </form>
      )}
    </div>
  );
}
