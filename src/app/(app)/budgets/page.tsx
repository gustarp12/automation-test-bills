import { redirect } from "next/navigation";

import BudgetForm from "./budget-form";
import BudgetRow from "./budget-row";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

type BudgetRowData = {
  id: string;
  amount: string | number;
  month: string;
  categories?: { name?: string } | null;
};

type SearchParams = {
  month?: string;
};

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();
  const now = new Date();
  const monthDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthParam = params.month ?? monthDefault;
  const monthValue = `${monthParam}-01`;

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  const { data: budgetsRaw } = await supabase
    .from("budgets")
    .select("id, amount, month, categories(name)")
    .eq("month", monthValue)
    .order("amount", { ascending: false });

  const monthEnd = new Date(`${monthParam}-01`);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  const monthEndStr = monthEnd.toISOString().slice(0, 10);

  const { data: monthExpensesRange } = await supabase
    .from("expenses")
    .select("amount_dop")
    .gte("expense_date", monthValue)
    .lte("expense_date", monthEndStr);

  const { data: monthIncomesRange } = await supabase
    .from("incomes")
    .select("amount_dop")
    .gte("income_date", monthValue)
    .lte("income_date", monthEndStr);

  const monthExpenseTotal = (monthExpensesRange ?? []).reduce(
    (sum, row) => sum + Number(row.amount_dop ?? 0),
    0
  );
  const monthIncomeTotal = (monthIncomesRange ?? []).reduce(
    (sum, row) => sum + Number(row.amount_dop ?? 0),
    0
  );
  const monthNetTotal = monthIncomeTotal - monthExpenseTotal;

  const budgets = (budgetsRaw ?? []).map((row) => {
    const categoriesValue = row.categories as { name?: string } | { name?: string }[] | null;
    return {
      ...row,
      categories: Array.isArray(categoriesValue)
        ? categoriesValue[0] ?? null
        : categoriesValue ?? null,
    } as BudgetRowData;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          {t(locale, "budgets.label")}
        </p>
        <h1 className="text-3xl font-semibold">{t(locale, "budgets.title")}</h1>
        <p className="text-sm text-slate-400">{t(locale, "budgets.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur">
          <p className="text-xs uppercase text-slate-400">{t(locale, "budgets.income")}</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">
            {formatCurrency(monthIncomeTotal, "DOP", locale)}
          </p>
          <p className="text-xs text-slate-500">{t(locale, "budgets.monthLabel")} {monthParam}</p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur">
          <p className="text-xs uppercase text-slate-400">{t(locale, "budgets.expenses")}</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(monthExpenseTotal, "DOP", locale)}
          </p>
          <p className="text-xs text-slate-500">{t(locale, "budgets.monthLabel")} {monthParam}</p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur">
          <p className="text-xs uppercase text-slate-400">{t(locale, "budgets.net")}</p>
          <p
            className={`mt-2 text-2xl font-semibold ${
              monthNetTotal >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {formatCurrency(monthNetTotal, "DOP", locale)}
          </p>
          <p className="text-xs text-slate-500">{t(locale, "budgets.netNote")}</p>
        </div>
      </div>

      <BudgetForm
        categories={(categories ?? []) as { id: string; name: string }[]}
        locale={locale}
        monthDefault={monthParam}
      />

      <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{t(locale, "budgets.listTitle")}</h2>
            <p className="text-xs text-slate-500">{t(locale, "budgets.listNote")}</p>
          </div>
          <form>
            <label className="text-xs text-slate-300">
              {t(locale, "budgets.month")}
              <input
                name="month"
                type="month"
                defaultValue={monthParam}
                className="ml-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs text-slate-100 outline-none focus:border-emerald-400"
              />
            </label>
          </form>
        </div>
        <div className="grid gap-2">
          {budgets.length === 0 ? (
            <p className="text-sm text-slate-500">{t(locale, "budgets.none")}</p>
          ) : (
            budgets.map((budget) => (
              <BudgetRow key={budget.id} budget={budget} locale={locale} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
