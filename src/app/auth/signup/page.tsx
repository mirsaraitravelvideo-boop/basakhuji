"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, FormError } from "@/components/ui";
import styles from "@/components/ui.module.css";

type RoleChoice = "tenant" | "landlord";

function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleChoice>("tenant");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "আপনার নাম দিন";
    const digits = phone.replace(/\D/g, "");
    if (phone.trim() && (digits.length < 10 || digits.length > 14)) {
      errs.phone = "সঠিক ফোন নম্বর দিন (যেমন 01XXXXXXXXX)";
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "সঠিক ইমেইল ঠিকানা দিন";
    if (password.length < 6) errs.password = "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            role,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          setSubmitError("এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে — লগইন করুন");
        } else {
          setSubmitError("সাইন আপ ব্যর্থ হয়েছে — আবার চেষ্টা করুন");
        }
        return;
      }
      if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        setInfoMessage(
          "ইমেইল যাচাই করুন — আপনার ইমেইলে পাঠানো লিংকে ক্লিক করুন"
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container section">
      <div className={styles.pageHead}>
        <h1>সাইন আপ</h1>
        <p>বিনামূল্যে অ্যাকাউন্ট খুলুন</p>
      </div>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <FormError message={submitError} />
        {infoMessage ? (
          <div className={styles.infoBox} role="status">
            {infoMessage}
          </div>
        ) : null}
        <Field label="আপনার নাম *" error={errors.fullName}>
          <input
            className={styles.input}
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="যেমন: করিম উদ্দিন"
            autoComplete="name"
          />
        </Field>
        <Field label="ফোন নম্বর (ঐচ্ছিক)" error={errors.phone}>
          <input
            className={styles.input}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            autoComplete="tel"
          />
        </Field>
        <Field label="ইমেইল *" error={errors.email}>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>
        <Field label="পাসওয়ার্ড * (কমপক্ষে ৬ অক্ষর)" error={errors.password}>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="আপনি কে?">
          <div className={styles.radioRow}>
            <label className={styles.radioCard}>
              <input
                type="radio"
                name="role"
                value="tenant"
                checked={role === "tenant"}
                onChange={() => setRole("tenant")}
              />
              ভাড়াটিয়া
            </label>
            <label className={styles.radioCard}>
              <input
                type="radio"
                name="role"
                value="landlord"
                checked={role === "landlord"}
                onChange={() => setRole("landlord")}
              />
              বাড়িওয়ালা
            </label>
          </div>
        </Field>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "অপেক্ষা করুন…" : "সাইন আপ করুন"}
        </button>
        <p className={styles.mutedCenter}>
          ইতিমধ্যে অ্যাকাউন্ট আছে? <Link href="/auth/login">লগইন করুন</Link>
        </p>
      </form>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
