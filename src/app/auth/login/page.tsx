"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, FormError } from "@/components/ui";
import styles from "@/components/ui.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: { email?: string; password?: string } = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "সঠিক ইমেইল ঠিকানা দিন";
    if (!password) errs.password = "পাসওয়ার্ড দিন";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setSubmitError("ইমেইল যাচাই হয়নি — আপনার ইমেইলে পাঠানো লিংকে ক্লিক করুন");
        } else {
          setSubmitError("ইমেইল বা পাসওয়ার্ড ভুল");
        }
      } else {
        router.push(next);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container section">
      <div className={styles.pageHead}>
        <h1>লগইন</h1>
        <p>আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
      </div>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {callbackError ? (
          <FormError message="লগইন ব্যর্থ হয়েছে — আবার চেষ্টা করুন" />
        ) : null}
        <FormError message={submitError} />
        <Field label="ইমেইল" error={errors.email}>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>
        <Field label="পাসওয়ার্ড" error={errors.password}>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "অপেক্ষা করুন…" : "লগইন করুন"}
        </button>
        <p className={styles.mutedCenter}>
          অ্যাকাউন্ট নেই? <Link href="/auth/signup">সাইন আপ করুন</Link>
        </p>
        <p className={styles.mutedCenter}>
          <Link href="/auth/forgot">পাসওয়ার্ড ভুলে গেছেন?</Link>
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
