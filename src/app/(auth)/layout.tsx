import type { ReactNode } from "react";

import { LocaleProvider } from "@/components/locale-provider";
import LanguageSwitcher from "@/components/language-switcher";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <LocaleProvider locale={locale}>
      <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_rgba(15,23,42,0.2),_rgba(2,6,23,0.9))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(56,189,248,0.15),_transparent_55%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
          <div className="grid w-full gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <div className="hidden flex-col justify-center space-y-6 md:flex">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-300/80">
                {t(locale, "common.appName")}
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-slate-100">
                {t(locale, "home.title")}
              </h1>
              <p className="text-sm text-slate-400">{t(locale, "home.subtitle")}</p>
              <div className="grid gap-4 text-sm text-slate-300">
                <div>
                  <p className="font-semibold text-slate-200">{t(locale, "home.manualTitle")}</p>
                  <p className="text-xs text-slate-400">{t(locale, "home.manualBody")}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-200">{t(locale, "home.multiTitle")}</p>
                  <p className="text-xs text-slate-400">{t(locale, "home.multiBody")}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-200">{t(locale, "home.cloudTitle")}</p>
                  <p className="text-xs text-slate-400">{t(locale, "home.cloudBody")}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-8 shadow-2xl shadow-slate-950/60 backdrop-blur">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {t(locale, "common.appName")}
                </span>
                <LanguageSwitcher locale={locale} />
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </LocaleProvider>
  );
}
