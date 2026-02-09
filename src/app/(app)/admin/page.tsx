import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import AdminUserRow from "./user-row";

type ProfileRow = {
  id: string;
  email: string | null;
  is_admin: boolean;
  created_at: string;
};

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/expenses");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, is_admin, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          {t(locale, "admin.label")}
        </p>
        <h1 className="text-3xl font-semibold">{t(locale, "admin.title")}</h1>
        <p className="text-sm text-slate-400">{t(locale, "admin.subtitle")}</p>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="grid grid-cols-12 gap-2 text-xs uppercase text-slate-400">
          <span className="col-span-5">{t(locale, "admin.user")}</span>
          <span className="col-span-3">{t(locale, "admin.created")}</span>
          <span className="col-span-2">{t(locale, "admin.role")}</span>
          <span className="col-span-2 text-right">{t(locale, "admin.actions")}</span>
        </div>
        <div className="divide-y divide-slate-800">
          {(profiles ?? []).length === 0 ? (
            <p className="py-3 text-sm text-slate-500">{t(locale, "admin.none")}</p>
          ) : (
            (profiles as ProfileRow[]).map((row) => (
              <AdminUserRow
                key={row.id}
                profile={row}
                currentUserId={user.id}
                locale={locale}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
