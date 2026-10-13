"use client";

import styles from "../admin.module.css";

export function SuspendButton({
  action,
  userId,
  userName,
  suspended,
}: {
  action: (formData: FormData) => void;
  userId: string;
  userName: string;
  suspended: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const ok = confirm(
          suspended
            ? `“${userName}”-কে পুনরায় সক্রিয় করবেন?`
            : `“${userName}”-কে স্থগিত করবেন? স্থগিত ব্যবহারকারী সাইট ব্যবহার করতে পারবেন না।`
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={userId} />
      <input type="hidden" name="suspend" value={suspended ? "0" : "1"} />
      <button
        type="submit"
        className={`${styles.btnSm} ${
          suspended ? styles.btnApprove : styles.btnSuspend
        }`}
      >
        {suspended ? "পুনরায় সক্রিয়" : "স্থগিত"}
      </button>
    </form>
  );
}
