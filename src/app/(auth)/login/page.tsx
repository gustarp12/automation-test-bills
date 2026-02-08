"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLocale } from "@/components/locale-provider";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          {t(locale, "auth.signInButton")}
        </p>
        <h1 className="text-3xl font-semibold">{t(locale, "auth.signInTitle")}</h1>
        <p className="text-sm text-slate-400">{t(locale, "auth.signInSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="text-slate-300">{t(locale, "auth.email")}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-300">{t(locale, "auth.password")}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
          />
        </label>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? t(locale, "auth.signingIn") : t(locale, "auth.signInButton")}
        </button>
      </form>

      <p className="text-sm text-slate-400">
        {t(locale, "auth.newHere")} {" "}
        <Link href="/register" className="text-emerald-300 hover:text-emerald-200">
          {t(locale, "auth.createAccountLink")}
        </Link>
      </p>
    </div>
  );
}
