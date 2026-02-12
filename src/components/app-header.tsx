"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import LanguageSwitcher from "@/components/language-switcher";
import SignOutButton from "@/components/sign-out-button";
import { t, type Locale } from "@/lib/i18n";

type AppHeaderProps = {
  locale: Locale;
  isAdmin: boolean;
};

const navItems = [
  { href: "/dashboard", key: "nav.dashboard" },
  { href: "/expenses", key: "nav.expenses" },
  { href: "/incomes", key: "nav.income" },
  { href: "/budgets", key: "nav.budgets" },
];

const adminItems = [
  { href: "/categories", key: "nav.categories" },
  { href: "/purposes", key: "nav.purposes" },
  { href: "/merchants", key: "nav.merchants" },
  { href: "/currencies", key: "nav.currencies" },
  { href: "/admin", key: "nav.admin" },
];

export default function AppHeader({ locale, isAdmin }: AppHeaderProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="relative z-10 border-b border-slate-900/80 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/dashboard"
            className={`font-semibold transition ${
              isActive("/dashboard") ? "text-emerald-300" : "text-slate-200"
            }`}
          >
            {t(locale, "common.appName")}
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-slate-400">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`transition ${
                  isActive(item.href)
                    ? "text-emerald-300"
                    : "hover:text-slate-200"
                }`}
              >
                {t(locale, item.key)}
              </Link>
            ))}
            {isAdmin
              ? adminItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`transition ${
                      isActive(item.href)
                        ? "text-emerald-300"
                        : "hover:text-slate-200"
                    }`}
                  >
                    {t(locale, item.key)}
                  </Link>
                ))
              : null}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher locale={locale} />
          <SignOutButton label={t(locale, "common.signOut")} />
        </div>
      </div>
    </header>
  );
}
