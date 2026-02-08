import { redirect } from "next/navigation";

import MerchantForm from "./merchant-form";
import { deleteMerchant } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

type MerchantRow = {
  id: string;
  name: string;
};

export default async function MerchantsPage() {
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

  const { data: merchants } = await supabase
    .from("merchants")
    .select("id, name")
    .order("name", { ascending: true });

  const isAdmin = Boolean(profile?.is_admin);

  if (!isAdmin) {
    redirect("/expenses");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          {t(locale, "nav.merchants")}
        </p>
        <h1 className="text-3xl font-semibold">{t(locale, "merchants.title")}</h1>
        <p className="text-sm text-slate-400">{t(locale, "merchants.subtitle")}</p>
      </div>

      {isAdmin ? <MerchantForm locale={locale} /> : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t(locale, "merchants.listTitle")}</h2>
          <span className="text-xs text-slate-500">{t(locale, "merchants.listNote")}</span>
        </div>
        <div className="grid gap-2">
          {(merchants ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">{t(locale, "merchants.none")}</p>
          ) : (
            (merchants as MerchantRow[]).map((merchant) => (
              <div
                key={merchant.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm"
              >
                <span>{merchant.name}</span>
                {isAdmin ? (
                  <form action={deleteMerchant}>
                    <input type="hidden" name="id" value={merchant.id} />
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
