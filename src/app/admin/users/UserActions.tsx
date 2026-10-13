"use client";

import { useState } from "react";
import styles from "../admin.module.css";

/* ============ ব্যবহারকারী মুছুন (নিশ্চিতকরণসহ) ============ */
export function DeleteUserButton({
  action,
  userId,
  userName,
}: {
  action: (formData: FormData) => void;
  userId: string;
  userName: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const ok = confirm(
          `“${userName}”-কে সম্পূর্ণ মুছে ফেলবেন? এই কাজ ফিরিয়ে আনা যাবে না।`
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={userId} />
      <button
        type="submit"
        className={`${styles.btnSm} ${styles.btnDangerGhost}`}
      >
        মুছুন
      </button>
    </form>
  );
}

/* ============ পাসওয়ার্ড রিসেট (নতুন পাসওয়ার্ডসহ) ============ */
export function PasswordResetForm({
  action,
  userId,
  userName,
}: {
  action: (formData: FormData) => void;
  userId: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        className={`${styles.btnSm} ${styles.btnGhost}`}
        onClick={() => setOpen(true)}
      >
        পাসওয়ার্ড বদলান
      </button>
    );
  }
  return (
    <form
      action={action}
      className={styles.roleForm}
      onSubmit={(e) => {
        const ok = confirm(
          `“${userName}”-এর পাসওয়ার্ড বদলে যাবে। নতুন পাসওয়ার্ডটি তাকে জানিয়ে দিন। এগোবেন?`
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={userId} />
      <input
        type="text"
        name="new_password"
        required
        minLength={6}
        placeholder="নতুন পাসওয়ার্ড"
        autoComplete="new-password"
        className={styles.noteInline}
        style={{ width: 150 }}
      />
      <button type="submit" className={`${styles.btnSm} ${styles.btnApprove}`}>
        সেট করুন
      </button>
      <button
        type="button"
        className={`${styles.btnSm} ${styles.btnGhost}`}
        onClick={() => setOpen(false)}
      >
        বাতিল
      </button>
    </form>
  );
}
