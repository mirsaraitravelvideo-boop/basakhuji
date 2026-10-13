import { redirect } from "next/navigation";
import Link from "next/link";
import { isStaff } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, Field } from "@/components/ui";
import { bnDateTime, toLocalInput } from "@/lib/format";
import type { Audience, NoticeType } from "@/lib/database.types";
import uiStyles from "@/components/ui.module.css";
import { DeleteNoticeButton } from "./DeleteNoticeButton";
import styles from "../admin.module.css";

export const metadata = {
  title: "নোটিশ ব্যবস্থাপনা — অ্যাডমিন",
};

const TYPE_OPTIONS = [
  { v: "information", label: "তথ্য" },
  { v: "announcement", label: "ঘোষণা" },
  { v: "maintenance", label: "রক্ষণাবেক্ষণ" },
  { v: "safety_alert", label: "নিরাপত্তা সতর্কতা" },
  { v: "policy_update", label: "নীতি পরিবর্তন" },
];
const AUDIENCE_OPTIONS = [
  { v: "all", label: "সবাই" },
  { v: "tenants", label: "ভাড়াটিয়া" },
  { v: "landlords", label: "বাড়িওয়ালা" },
];
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

const OK_MSG: Record<string, string> = {
  created: "নোটিশ তৈরি হয়েছে।",
  updated: "নোটিশ আপডেট হয়েছে।",
  deleted: "নোটিশ মুছে ফেলা হয়েছে।",
};
const ERR_MSG: Record<string, string> = {
  required: "শিরোনাম ও বিবরণ আবশ্যক।",
  bad_request: "অবৈধ অনুরোধ।",
  forbidden: "এই কাজের অনুমতি আপনার নেই।",
  unknown: "কিছু ভুল হয়েছে, আবার চেষ্টা করুন।",
};

function parseDt(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

type NoticeInput = {
  title: string;
  body: string;
  notice_type: NoticeType;
  target_audience: Audience;
  priority: number;
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
};

const VALID_TYPES: NoticeType[] = [
  "information",
  "announcement",
  "maintenance",
  "safety_alert",
  "policy_update",
];
const VALID_AUDIENCES: Audience[] = ["all", "tenants", "landlords"];

function readCommon(formData: FormData): NoticeInput {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const rawType = String(formData.get("notice_type") ?? "information");
  const rawAud = String(formData.get("target_audience") ?? "all");
  const notice_type: NoticeType = VALID_TYPES.includes(rawType as NoticeType)
    ? (rawType as NoticeType)
    : "information";
  const target_audience: Audience = VALID_AUDIENCES.includes(rawAud as Audience)
    ? (rawAud as Audience)
    : "all";
  const priority = Number(String(formData.get("priority") ?? "0")) || 0;
  const is_published = formData.get("is_published") === "on";
  const published_at =
    parseDt(formData.get("published_at")) ??
    (is_published ? new Date().toISOString() : null);
  const expires_at = parseDt(formData.get("expires_at"));
  return {
    title,
    body,
    notice_type,
    target_audience,
    priority,
    is_published,
    published_at,
    expires_at,
  };
}

async function createNotice(formData: FormData) {
  "use server";
  const n = readCommon(formData);
  if (!n.title || !n.body) redirect("/admin/notices?err=required");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("notices")
    .insert({ ...n, created_by: user?.id ?? null });
  if (error) redirect("/admin/notices?err=unknown");
  redirect("/admin/notices?ok=created");
}

async function updateNotice(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const n = readCommon(formData);
  if (!id || !n.title || !n.body) redirect("/admin/notices?err=required");
  const supabase = await createClient();
  const { error } = await supabase.from("notices").update(n).eq("id", id);
  if (error) redirect("/admin/notices?err=unknown");
  redirect("/admin/notices?ok=updated");
}

async function deleteNotice(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/notices?err=bad_request");
  const supabase = await createClient();
  const { error } = await supabase.from("notices").delete().eq("id", id);
  if (error) redirect("/admin/notices?err=unknown");
  redirect("/admin/notices?ok=deleted");
}

type NoticeRow = NoticeInput & {
  id: string;
  created_at: string;
};

const SELECT_COLS =
  "id, title, body, notice_type, priority, target_audience, is_published, published_at, expires_at, created_at";

function NoticeForm({ notice }: { notice?: NoticeRow | null }) {
  const editing = !!notice;
  return (
    <form
      action={editing ? updateNotice : createNotice}
      className={styles.form}
    >
      <h2 className={styles.formTitle}>
        {editing ? "নোটিশ সম্পাদনা" : "নতুন নোটিশ"}
      </h2>
      {editing ? <input type="hidden" name="id" value={notice.id} /> : null}
      <Field label="শিরোনাম">
        <input
          type="text"
          name="title"
          required
          maxLength={200}
          defaultValue={notice?.title ?? ""}
          placeholder="যেমন: ঈদের ছুটিতে অফিস বন্ধ থাকবে"
          className={uiStyles.input}
        />
      </Field>
      <Field label="বিবরণ">
        <textarea
          name="body"
          required
          rows={5}
          defaultValue={notice?.body ?? ""}
          placeholder="নোটিশের বিস্তারিত লিখুন…"
          className={uiStyles.textarea}
        />
      </Field>
      <div className={styles.formRow}>
        <Field label="ধরন">
          <select
            name="notice_type"
            defaultValue={notice?.notice_type ?? "information"}
            className={uiStyles.select}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="কার জন্য">
          <select
            name="target_audience"
            defaultValue={notice?.target_audience ?? "all"}
            className={uiStyles.select}
          >
            {AUDIENCE_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className={styles.formRow}>
        <Field label="অগ্রাধিকার (বড় সংখ্যা আগে দেখাবে)">
          <input
            type="number"
            name="priority"
            min={0}
            step={1}
            defaultValue={notice?.priority ?? 0}
            className={uiStyles.input}
          />
        </Field>
        <Field label="প্রকাশের তারিখ ও সময়">
          <input
            type="datetime-local"
            name="published_at"
            defaultValue={toLocalInput(notice?.published_at)}
            className={uiStyles.input}
          />
        </Field>
      </div>
      <Field label="মেয়াদ শেষ (খালি রাখলে মেয়াদহীন)">
        <input
          type="datetime-local"
          name="expires_at"
          defaultValue={toLocalInput(notice?.expires_at)}
          className={uiStyles.input}
        />
      </Field>
      <label className={styles.checkRow}>
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={notice?.is_published ?? false}
        />
        প্রকাশিত (টিক দিলে সাইটে দেখা যাবে)
      </label>
      <div className={styles.submitRow}>
        <button type="submit" className="btn btn-primary">
          {editing ? "সংরক্ষণ করুন" : "নোটিশ তৈরি করুন"}
        </button>
        {editing ? (
          <Link
            href="/admin/notices"
            className={`btn btn-outline`}
            style={{ padding: "10px 24px" }}
          >
            বাতিল
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export default async function AdminNoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; ok?: string; err?: string }>;
}) {
  if (!(await isStaff())) redirect("/");

  const sp = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("notices")
    .select(SELECT_COLS)
    .order("created_at", { ascending: false });
  const notices = (data ?? []) as NoticeRow[];

  let editing: NoticeRow | null = null;
  if (sp.edit) {
    const { data: one } = await supabase
      .from("notices")
      .select(SELECT_COLS)
      .eq("id", sp.edit)
      .single();
    editing = (one ?? null) as NoticeRow | null;
  }

  return (
    <>
      <h1 className={styles.pageTitle}>নোটিশ ব্যবস্থাপনা</h1>
      <p className={styles.pageSub}>
        সাইটের নোটিশ বোর্ডে যা দেখাবে, তা এখান থেকে তৈরি ও প্রকাশ করুন।
      </p>

      {sp.ok && OK_MSG[sp.ok] ? (
        <p className={`${styles.alert} ${styles.alertOk}`}>{OK_MSG[sp.ok]}</p>
      ) : null}
      {sp.err && ERR_MSG[sp.err] ? (
        <p className={`${styles.alert} ${styles.alertErr}`}>
          {ERR_MSG[sp.err]}
        </p>
      ) : null}

      <NoticeForm notice={editing} />

      <h2 className={styles.sectionTitle}>
        সব নোটিশ{" "}
        <span className={styles.count}>
          ({notices.length.toLocaleString("bn-BD")}টি)
        </span>
      </h2>

      {notices.length === 0 ? (
        <EmptyState
          title="কোনো নোটিশ নেই"
          hint="উপরের ফর্ম থেকে প্রথম নোটিশ তৈরি করুন।"
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>শিরোনাম</th>
                <th>ধরন</th>
                <th>কার জন্য</th>
                <th>অগ্রাধিকার</th>
                <th>প্রকাশনা</th>
                <th>মেয়াদ</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((n) => (
                <tr key={n.id}>
                  <td className={styles.titleCell}>
                    {n.title}
                    <div className={`${styles.muted} ${styles.clamp}`}>
                      {n.body}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.tag} ${styles.tagInfo}`}>
                      {TYPE_LABELS[n.notice_type] ?? n.notice_type}
                    </span>
                  </td>
                  <td className={styles.nowrap}>
                    {AUDIENCE_LABELS[n.target_audience] ?? n.target_audience}
                  </td>
                  <td>{n.priority.toLocaleString("bn-BD")}</td>
                  <td>
                    {n.is_published ? (
                      <span className={`${styles.tag} ${styles.tagOk}`}>
                        প্রকাশিত
                      </span>
                    ) : (
                      <span className={`${styles.tag} ${styles.tagMuted}`}>
                        খসড়া
                      </span>
                    )}
                    <div className={styles.muted}>
                      {bnDateTime(n.published_at)}
                    </div>
                  </td>
                  <td className={`${styles.muted} ${styles.nowrap}`}>
                    {n.expires_at ? bnDateTime(n.expires_at) : "মেয়াদহীন"}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <Link
                        href={`/admin/notices?edit=${n.id}`}
                        className={`${styles.btnSm} ${styles.btnGhost}`}
                      >
                        সম্পাদনা
                      </Link>
                      <DeleteNoticeButton
                        action={deleteNotice}
                        noticeId={n.id}
                        title={n.title}
                      />
                    </div>
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
