"use client";

import styles from "../admin.module.css";

export function DeleteNoticeButton({
  action,
  noticeId,
  title,
}: {
  action: (formData: FormData) => void;
  noticeId: string;
  title: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`“${title}” নোটিশটি মুছে ফেলবেন?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={noticeId} />
      <button
        type="submit"
        className={`${styles.btnSm} ${styles.btnDangerGhost}`}
      >
        মুছুন
      </button>
    </form>
  );
}
