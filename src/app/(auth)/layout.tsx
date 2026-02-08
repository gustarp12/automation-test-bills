import type { ReactNode } from "react";

import { LocaleProvider } from "@/components/locale-provider";
import LanguageSwitcher from "@/components/language-switcher";
import { getLocale } from "@/lib/i18n-server";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <LocaleProvider locale={locale}>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
          <div className="mb-6 flex justify-end">
            <LanguageSwitcher locale={locale} />
          </div>
          {children}
        </div>
      </div>
    </LocaleProvider>
  );
}
