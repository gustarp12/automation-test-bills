import type { ReactNode } from "react";
import Link from "next/link";

import { LocaleProvider } from "@/components/locale-provider";
import LanguageSwitcher from "@/components/language-switcher";
import SignOutButton from "@/components/sign-out-button";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
    : { data: null };

  const isAdmin = Boolean(profile?.is_admin);

  return (
    <LocaleProvider locale={locale}>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-900/80">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-6 text-sm">
              <Link href="/dashboard" className="font-semibold text-slate-100">
                {t(locale, "common.appName")}
              </Link>
              <nav className="flex flex-wrap items-center gap-4 text-slate-400">
                <Link className="hover:text-slate-200" href="/expenses">
                  {t(locale, "nav.expenses")}
                </Link>
                {isAdmin ? (
                  <>
                    <Link className="hover:text-slate-200" href="/categories">
                      {t(locale, "nav.categories")}
                    </Link>
                    <Link className="hover:text-slate-200" href="/merchants">
                      {t(locale, "nav.merchants")}
                    </Link>
                    <Link className="hover:text-slate-200" href="/currencies">
                      {t(locale, "nav.currencies")}
                    </Link>
                  </>
                ) : null}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher locale={locale} />
              <SignOutButton label={t(locale, "common.signOut")} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </LocaleProvider>
  );
}
