import { redirect } from "next/navigation";

import IncomeForm from "./income-form";
import { deleteIncome } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/format";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

type IncomeRow = {
  id: string;
  amount: string;
  currency: string;
  amount_dop: string;
  income_date: string;
  source: string | null;
  notes: string | null;
};

export default async function IncomesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();

  const { data: currencies, error: currencyError } = await supabase
    .from("currencies")
    .select("code, name, symbol, is_active")
    .order("code", { ascending: true });

  const activeCurrencies = currencyError
    ? []
    : (currencies ?? []).filter((currency) => currency.is_active);

  const { data: incomesRaw } = await supabase
    .from("incomes")
    .select("id, amount, currency, amount_dop, income_date, source, notes")
    .order("income_date", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          {t(locale, "nav.income")}
        </p>
        <h1 className="text-3xl font-semibold">{t(locale, "income.title")}</h1>
        <p className="text-sm text-slate-400">{t(locale, "income.subtitle")}</p>
      </div>

      <IncomeForm currencies={activeCurrencies} locale={locale} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t(locale, "income.recent")}</h2>
          <p className="text-xs text-slate-500">{t(locale, "income.recentNote")}</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-800/80">
          <div className="grid grid-cols-12 gap-2 border-b border-slate-800 bg-slate-950/70 px-4 py-3 text-xs uppercase text-slate-400">
            <span className="col-span-4">{t(locale, "income.source")}</span>
            <span className="col-span-3">{t(locale, "common.date")}</span>
            <span className="col-span-3">{t(locale, "common.amount")}</span>
            <span className="col-span-2">{t(locale, "common.notes")}</span>
          </div>
          <div className="divide-y divide-slate-900/60">
            {(incomesRaw ?? []).length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">{t(locale, "income.none")}</p>
            ) : (
              (incomesRaw as IncomeRow[]).map((income) => (
                <div
                  key={income.id}
                  className="grid grid-cols-12 gap-2 px-4 py-3 text-sm text-slate-200"
                >
                  <span className="col-span-4">{income.source ?? "—"}</span>
                  <span className="col-span-3 text-slate-400">
                    {formatDate(income.income_date, locale)}
                  </span>
                  <span className="col-span-3 text-emerald-300">
                    {formatCurrency(income.amount, income.currency, locale)}
                    <span className="ml-2 text-xs text-slate-500">
                      {formatCurrency(income.amount_dop, "DOP", locale)}
                    </span>
                  </span>
                  <span className="col-span-2 flex items-center justify-between text-xs text-slate-400">
                    {income.notes ?? "—"}
                    <form action={deleteIncome}>
                      <input type="hidden" name="id" value={income.id} />
                      <button
                        type="submit"
                        className="ml-2 text-xs text-rose-300 hover:text-rose-200"
                      >
                        {t(locale, "common.delete")}
                      </button>
                    </form>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
