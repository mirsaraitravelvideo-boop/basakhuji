"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, FormError } from "@/components/ui";
import styles from "@/components/ui.module.css";

function NewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
      return;
    }
    if (password !== confirm) {
      setError("দুটো পাসওয়ার্ড মিলছে না");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError("পাসওয়ার্ড বসানো যায়নি — লিংকটির মেয়াদ শেষ হলে আবার চেষ্টা করুন");
      } else {
        setDone(true);
        setTimeout(() => {
          router.push("/admin");
          router.refresh();
        }, 1500);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container section">
      <div className={styles.pageHead}>
        <h1>নতুন পাসওয়ার্ড</h1>
        <p>আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড বসান</p>
      </div>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <FormError message={error} />
        {done ? (
          <p className={styles.mutedCenter}>✅ পাসওয়ার্ড বসানো হয়েছে! অ্যাডমিন প্যানেলে নিয়ে যাচ্ছি…</p>
        ) : (
          <>
            <Field label="নতুন পাসওয়ার্ড">
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field label="আবার দিন">
              <input
                className={styles.input}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "অপেক্ষা করুন…" : "পাসওয়ার্ড বসান"}
            </button>
          </>
        )}
      </form>
    </main>
  );
}

export default function NewPasswordPage() {
  return (
    <Suspense>
      <NewPasswordForm />
    </Suspense>
  );
}
