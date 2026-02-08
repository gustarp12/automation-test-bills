import Link from "next/link";
import { redirect } from "next/navigation";

import LanguageSwitcher from "@/components/language-switcher";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const locale = await getLocale();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
        <div className="flex justify-end">
          <LanguageSwitcher locale={locale} />
        </div>
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            {t(locale, "home.tagline")}
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            {t(locale, "home.title")}
          </h1>
          <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
            {t(locale, "home.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/login"
            className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            {t(locale, "home.signIn")}
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
          >
            {t(locale, "home.createAccount")}
          </Link>
        </div>
        <div className="grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="font-semibold text-slate-100">{t(locale, "home.manualTitle")}</p>
            <p className="mt-2">{t(locale, "home.manualBody")}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="font-semibold text-slate-100">{t(locale, "home.multiTitle")}</p>
            <p className="mt-2">{t(locale, "home.multiBody")}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="font-semibold text-slate-100">{t(locale, "home.cloudTitle")}</p>
            <p className="mt-2">{t(locale, "home.cloudBody")}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
