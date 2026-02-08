"use client";

import { useRouter } from "next/navigation";

import { SUPPORTED_LOCALES, type Locale, t } from "@/lib/i18n";

type LanguageSwitcherProps = {
  locale: Locale;
};

export default function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const router = useRouter();

  function setLocale(nextLocale: Locale) {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/40 p-1 text-xs">
      {SUPPORTED_LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          className={`rounded-full px-3 py-1 font-semibold transition ${
            locale === item
              ? "bg-emerald-400 text-slate-950"
              : "text-slate-300 hover:text-slate-100"
          }`}
        >
          {item === "en" ? "EN" : "ES"}
        </button>
      ))}
      <span className="sr-only">{t(locale, "common.select")}</span>
    </div>
  );
}
