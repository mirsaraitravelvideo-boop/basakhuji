import { redirect } from "next/navigation";
import { isStaff, getRole, getUser } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui";
import { bnDateTime } from "@/lib/format";
import type { AdminUserRow } from "@/lib/database.types";
import { SuspendButton } from "./SuspendButton";
import styles from "../admin.module.css";

export const metadata = {
  title: "ব্যবহারকারী — অ্যাডমিন",
};

const ROLE_LABELS: Record<string, string> = {
  tenant: "ভাড়াটিয়া",
  landlord: "বাড়িওয়ালা",
  moderator: "মডারেটর",
  admin: "অ্যাডমিন",
  super_admin: "সুপার অ্যাডমিন",
};
const ROLES = ["tenant", "landlord", "moderator", "admin", "super_admin"];

const OK_MSG: Record<string, string> = {
  role: "ব্যবহারকারীর ভূমিকা আপডেট করা হয়েছে।",
  suspended: "ব্যবহারকারী স্থগিত করা হয়েছে।",
  reactivated: "ব্যবহারকারী পুনরায় সক্রিয় করা হয়েছে।",
};

const ERR_MSG: Record<string, string> = {
  bad_request: "অবৈধ অনুরোধ।",
  not_super: "ভূমিকা বদলাতে শুধু সুপার অ্যাডমিন পারবেন।",
  self_role: "নিজের ভূমিকা বদলানো যাবে না।",
  forbidden: "এই কাজের অনুমতি আপনার নেই।",
  self_suspend: "নিজেকে স্থগিত করা যাবে না।",
  unknown: "কিছু ভুল হয়েছে, আবার চেষ্টা করুন।",
};

function dbErrorCode(msg: string): string {
  if (msg.includes("super_admin only")) return "not_super";
  if (msg.includes("cannot change your own role")) return "self_role";
  if (msg.includes("cannot suspend yourself")) return "self_suspend";
  if (msg.includes("forbidden")) return "forbidden";
  return "unknown";
}

async function setUserRole(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!id || !ROLES.includes(role)) {
    redirect("/admin/users?err=bad_request");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", {
    p_user: id,
    p_role: role,
  });
  if (error) redirect(`/admin/users?err=${dbErrorCode(error.message)}`);
  redirect("/admin/users?ok=role");
}

async function setSuspended(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const suspend = formData.get("suspend") === "1";
  if (!id) redirect("/admin/users?err=bad_request");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_suspended", {
    p_user: id,
    p_suspended: suspend,
  });
  if (error) redirect(`/admin/users?err=${dbErrorCode(error.message)}`);
  redirect(`/admin/users?ok=${suspend ? "suspended" : "reactivated"}`);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  if (!(await isStaff())) redirect("/");

  const sp = await searchParams;
  const supabase = await createClient();
  const myRole = await getRole();
  const me = await getUser();
  // ভূমিকা বদলানোর কন্ট্রোল শুধু সুপার অ্যাডমিন দেখবেন; স্থগিত শুধু অ্যাডমিন/সুপার অ্যাডমিন।
  const isSuperAdmin = myRole === "super_admin";
  const canSuspend = myRole === "admin" || myRole === "super_admin";

  const { data, error } = await supabase.rpc("admin_list_users");
  const users = (data ?? []) as AdminUserRow[];

  return (
    <>
      <h1 className={styles.pageTitle}>ব্যবহারকারী</h1>
      <p className={styles.pageSub}>
        মোট {users.length.toLocaleString("bn-BD")} জন ব্যবহারকারী। ভূমিকা
        বদলানো শুধু সুপার অ্যাডমিনের জন্য।
      </p>

      {sp.ok && OK_MSG[sp.ok] ? (
        <p className={`${styles.alert} ${styles.alertOk}`}>{OK_MSG[sp.ok]}</p>
      ) : null}
      {sp.err && ERR_MSG[sp.err] ? (
        <p className={`${styles.alert} ${styles.alertErr}`}>
          {ERR_MSG[sp.err]}
        </p>
      ) : null}

      {error || users.length === 0 ? (
        <EmptyState
          title="কোনো ব্যবহারকারী নেই"
          hint={
            error
              ? "তালিকা আনা যায়নি। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।"
              : "এখনো কোনো ব্যবহারকারী নিবন্ধন করেননি।"
          }
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>নাম</th>
                <th>ফোন</th>
                <th>ভূমিকা</th>
                <th>বিজ্ঞাপন</th>
                <th>ব্যাজ</th>
                <th>যোগদান</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const self = me?.id === u.user_id;
                return (
                  <tr key={u.user_id}>
                    <td className={styles.titleCell}>{u.full_name}</td>
                    <td className={styles.nowrap}>{u.phone ?? "—"}</td>
                    <td>
                      {isSuperAdmin && !self ? (
                        <form action={setUserRole} className={styles.roleForm}>
                          <input type="hidden" name="id" value={u.user_id} />
                          <select
                            name="role"
                            defaultValue={u.role}
                            aria-label={`${u.full_name}-এর ভূমিকা`}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className={`${styles.btnSm} ${styles.btnGhost}`}
                          >
                            সংরক্ষণ
                          </button>
                        </form>
                      ) : (
                        <span className={`${styles.tag} ${styles.tagInfo}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      )}
                    </td>
                    <td>{u.listings_count.toLocaleString("bn-BD")}</td>
                    <td>
                      <div className={styles.rowActions}>
                        {u.is_verified ? (
                          <span className={`${styles.tag} ${styles.tagOk}`}>
                            যাচাইকৃত
                          </span>
                        ) : null}
                        {u.is_suspended ? (
                          <span className={`${styles.tag} ${styles.tagBad}`}>
                            স্থগিত
                          </span>
                        ) : null}
                        {!u.is_verified && !u.is_suspended ? (
                          <span className={styles.muted}>—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className={`${styles.muted} ${styles.nowrap}`}>
                      {bnDateTime(u.created_at)}
                    </td>
                    <td>
                      {self ? (
                        <span className={styles.muted}>নিজে</span>
                      ) : canSuspend ? (
                        <SuspendButton
                          action={setSuspended}
                          userId={u.user_id}
                          userName={u.full_name}
                          suspended={u.is_suspended}
                        />
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
