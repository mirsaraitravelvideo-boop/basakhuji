import { redirect } from "next/navigation";
import { isStaff, getRole, getUser } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmptyState } from "@/components/ui";
import { bnDateTime } from "@/lib/format";
import type { AdminUserRow } from "@/lib/database.types";
import { SuspendButton } from "./SuspendButton";
import { DeleteUserButton, PasswordResetForm } from "./UserActions";
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
  created: "নতুন ব্যবহারকারী তৈরি হয়েছে। পাসওয়ার্ডটি তাকে জানিয়ে দিন।",
  deleted: "ব্যবহারকারী মুছে ফেলা হয়েছে।",
  pwreset: "পাসওয়ার্ড বদলে গেছে। নতুন পাসওয়ার্ডটি ব্যবহারকারীকে জানিয়ে দিন।",
};

const ERR_MSG: Record<string, string> = {
  bad_request: "অবৈধ অনুরোধ।",
  not_super: "ভূমিকা বদলাতে শুধু সুপার অ্যাডমিন পারবেন।",
  not_super_create: "স্টাফ ভূমিকা (মডারেটর/অ্যাডমিন) দিতে শুধু সুপার অ্যাডমিন পারবেন।",
  self_role: "নিজের ভূমিকা বদলানো যাবে না।",
  forbidden: "এই কাজের অনুমতি আপনার নেই।",
  self_suspend: "নিজেকে স্থগিত করা যাবে না।",
  self_delete: "নিজেকে মোছা যাবে না।",
  delete_failed:
    "মোছা যায়নি — সম্ভবত এই ব্যবহারকারীর বিজ্ঞাপন বা লেনদেন আছে।",
  exists: "এই ইমেইলে ইতিমধ্যে অ্যাকাউন্ট আছে।",
  unknown: "কিছু ভুল হয়েছে, আবার চেষ্টা করুন।",
};

function isAdminRole(role: string | null) {
  return role === "admin" || role === "super_admin";
}

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

/* ---------- নতুন ব্যবহারকারী তৈরি (অ্যাডমিন) ---------- */
async function createUserAction(formData: FormData) {
  "use server";
  if (!(await isStaff())) redirect("/");
  const myRole = await getRole();
  if (!isAdminRole(myRole)) redirect("/admin/users?err=forbidden");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  let role = String(formData.get("role") ?? "tenant");
  if (!ROLES.includes(role)) role = "tenant";
  if (!email.includes("@") || password.length < 6 || !fullName) {
    redirect("/admin/users?err=bad_request");
  }
  // স্টাফ ভূমিকা শুধু সুপার অ্যাডমিন দিতে পারবেন
  if (
    myRole !== "super_admin" &&
    (role === "admin" || role === "super_admin" || role === "moderator")
  ) {
    redirect("/admin/users?err=not_super_create");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      redirect("/admin/users?err=exists");
    }
    redirect("/admin/users?err=unknown");
  }
  const uid = data.user.id;
  await admin
    .from("profiles")
    .upsert({ id: uid, full_name: fullName, phone: phone || null });
  await admin.from("user_roles").upsert({ user_id: uid, role: role as never });
  redirect("/admin/users?ok=created");
}

/* ---------- ব্যবহারকারী মুছুন (অ্যাডমিন) ---------- */
async function deleteUserAction(formData: FormData) {
  "use server";
  if (!(await isStaff())) redirect("/");
  const myRole = await getRole();
  if (!isAdminRole(myRole)) redirect("/admin/users?err=forbidden");
  const id = String(formData.get("id") ?? "");
  const me = await getUser();
  if (!id) redirect("/admin/users?err=bad_request");
  if (me && id === me.id) redirect("/admin/users?err=self_delete");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) redirect("/admin/users?err=delete_failed");
  redirect("/admin/users?ok=deleted");
}

/* ---------- পাসওয়ার্ড রিসেট (অ্যাডমিন) ---------- */
async function resetPasswordAction(formData: FormData) {
  "use server";
  if (!(await isStaff())) redirect("/");
  const myRole = await getRole();
  if (!isAdminRole(myRole)) redirect("/admin/users?err=forbidden");
  const id = String(formData.get("id") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const me = await getUser();
  if (!id || newPassword.length < 6) redirect("/admin/users?err=bad_request");
  if (me && id === me.id) redirect("/admin/users?err=self_delete");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    password: newPassword,
  });
  if (error) redirect("/admin/users?err=unknown");
  redirect("/admin/users?ok=pwreset");
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

      {isAdminRole(myRole) ? (
        <details className={styles.form} style={{ marginBottom: 20 }}>
          <summary className={styles.formTitle} style={{ cursor: "pointer" }}>
            ➕ নতুন ব্যবহারকারী যোগ করুন
          </summary>
          <form action={createUserAction} style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <div className={styles.formRow}>
              <label>
                নাম *
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="পুরো নাম"
                  className={styles.noteInline}
                />
              </label>
              <label>
                ইমেইল *
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="email@example.com"
                  className={styles.noteInline}
                />
              </label>
            </div>
            <div className={styles.formRow}>
              <label>
                ফোন
                <input
                  type="tel"
                  name="phone"
                  placeholder="01XXXXXXXXX"
                  className={styles.noteInline}
                />
              </label>
              <label>
                ভূমিকা
                <select name="role" className={styles.noteInline} defaultValue="tenant">
                  <option value="tenant">ভাড়াটিয়া</option>
                  <option value="landlord">বাড়িওয়ালা</option>
                  {myRole === "super_admin" ? (
                    <>
                      <option value="moderator">মডারেটর</option>
                      <option value="admin">অ্যাডমিন</option>
                    </>
                  ) : null}
                </select>
              </label>
            </div>
            <div className={styles.formRow}>
              <label>
                প্রাথমিক পাসওয়ার্ড * (কমপক্ষে ৬ অক্ষর)
                <input
                  type="text"
                  name="password"
                  required
                  minLength={6}
                  placeholder="পাসওয়ার্ড — তাকে জানিয়ে দিন"
                  autoComplete="new-password"
                  className={styles.noteInline}
                />
              </label>
            </div>
            <div className={styles.submitRow}>
              <button
                type="submit"
                className={`${styles.btnSm} ${styles.btnApprove}`}
              >
                ব্যবহারকারী তৈরি করুন
              </button>
            </div>
          </form>
        </details>
      ) : null}

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
                      ) : (
                        <div className={styles.rowActions}>
                          {canSuspend ? (
                            <SuspendButton
                              action={setSuspended}
                              userId={u.user_id}
                              userName={u.full_name}
                              suspended={u.is_suspended}
                            />
                          ) : null}
                          {isAdminRole(myRole) ? (
                            <>
                              <PasswordResetForm
                                action={resetPasswordAction}
                                userId={u.user_id}
                                userName={u.full_name}
                              />
                              <DeleteUserButton
                                action={deleteUserAction}
                                userId={u.user_id}
                                userName={u.full_name}
                              />
                            </>
                          ) : null}
                          {!canSuspend && !isAdminRole(myRole) ? (
                            <span className={styles.muted}>—</span>
                          ) : null}
                        </div>
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
