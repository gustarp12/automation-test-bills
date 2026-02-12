import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/locale-provider";
import AppHeader from "@/components/app-header";
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
      <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_rgba(15,23,42,0.2),_rgba(2,6,23,0.9))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,_rgba(56,189,248,0.12),_transparent_55%)]" />
        <AppHeader locale={locale} isAdmin={isAdmin} />
        <main className="relative z-10 mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </LocaleProvider>
  );
}
