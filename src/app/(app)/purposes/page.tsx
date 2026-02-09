import { redirect } from "next/navigation";

import PurposeForm from "./purpose-form";
import { deletePurpose } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

type PurposeRow = {
  id: string;
  name: string;
  is_system: boolean;
};

export default async function PurposesPage() {
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

  const { data: purposes } = await supabase
    .from("purposes")
    .select("id, name, is_system")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  const isAdmin = Boolean(profile?.is_admin);

  if (!isAdmin) {
    redirect("/expenses");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          {t(locale, "nav.purposes")}
        </p>
        <h1 className="text-3xl font-semibold">{t(locale, "purposes.title")}</h1>
        <p className="text-sm text-slate-400">{t(locale, "purposes.subtitle")}</p>
      </div>

      {isAdmin ? <PurposeForm locale={locale} /> : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t(locale, "purposes.listTitle")}</h2>
          <span className="text-xs text-slate-500">{t(locale, "purposes.listNote")}</span>
        </div>
        <div className="grid gap-2">
          {(purposes ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">{t(locale, "purposes.none")}</p>
          ) : (
            (purposes as PurposeRow[]).map((purpose) => (
              <div
                key={purpose.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm"
              >
                <span>{purpose.name}</span>
                {isAdmin ? (
                  <form action={deletePurpose}>
                    <input type="hidden" name="id" value={purpose.id} />
                    <button
                      type="submit"
                      className="text-xs text-rose-300 hover:text-rose-200"
                    >
                      {t(locale, "common.delete")}
                    </button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
