"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field, FormError } from "@/components/ui";
import styles from "@/components/ui.module.css";

function ForgotForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("সঠিক ইমেইল ঠিকানা দিন");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/new-password`,
      });
      if (error) {
        setError("ইমেইল পাঠানো যায়নি — আবার চেষ্টা করুন");
      } else {
        setSent(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container section">
      <div className={styles.pageHead}>
        <h1>পাসওয়ার্ড ভুলে গেছেন?</h1>
        <p>ইমেইলে পাসওয়ার্ড বসানোর লিংক পাঠিয়ে দিচ্ছি</p>
      </div>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <FormError message={error} />
        {sent ? (
          <p className={styles.mutedCenter}>
            ✅ ইমেইল পাঠানো হয়েছে! ইনবক্স (ও স্প্যাম) চেক করে লিংকে ক্লিক করুন।
          </p>
        ) : (
          <>
            <Field label="ইমেইল">
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "অপেক্ষা করুন…" : "লিংক পাঠান"}
            </button>
          </>
        )}
        <p className={styles.mutedCenter}>
          <Link href="/auth/login">লগইনে ফিরুন</Link>
        </p>
      </form>
    </main>
  );
}

export default function ForgotPage() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
