import { redirect } from "next/navigation";

import CurrencyForm from "./currency-form";
import { deleteCurrency } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

type CurrencyRow = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  is_active: boolean;
};

export default async function CurrenciesPage() {
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

  const { data: currencies } = await supabase
    .from("currencies")
    .select("id, code, name, symbol, is_active")
    .order("code", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          {t(locale, "nav.currencies")}
        </p>
        <h1 className="text-3xl font-semibold">{t(locale, "currencies.title")}</h1>
        <p className="text-sm text-slate-400">{t(locale, "currencies.subtitle")}</p>
      </div>

      {profile?.is_admin ? <CurrencyForm locale={locale} /> : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t(locale, "currencies.available")}</h2>
          <span className="text-xs text-slate-500">{t(locale, "currencies.note")}</span>
        </div>
        <div className="grid gap-2">
          {(currencies ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">{t(locale, "currencies.none")}</p>
          ) : (
            (currencies as CurrencyRow[]).map((currency) => (
              <div
                key={currency.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-100">{currency.code}</span>
                  <span className="text-slate-300">{currency.name}</span>
                  {currency.symbol ? (
                    <span className="text-xs text-slate-500">{currency.symbol}</span>
                  ) : null}
                  {!currency.is_active ? (
                    <span className="text-xs text-amber-300">{t(locale, "common.inactive")}</span>
                  ) : null}
                </div>
                {profile?.is_admin ? (
                  <form action={deleteCurrency}>
                    <input type="hidden" name="id" value={currency.id} />
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
