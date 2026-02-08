import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

type ExpenseRow = {
  amount_dop: string;
  categories?: { name: string } | null;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMonthStartStr = thisMonthStart.toISOString().slice(0, 10);
  const lastMonthStartStr = lastMonthStart.toISOString().slice(0, 10);
  const lastMonthEndStr = lastMonthEnd.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const { data: thisMonthExpenses } = await supabase
    .from("expenses")
    .select("amount_dop, categories(name)")
    .gte("expense_date", thisMonthStartStr)
    .lte("expense_date", todayStr);

  const { data: lastMonthExpenses } = await supabase
    .from("expenses")
    .select("amount_dop")
    .gte("expense_date", lastMonthStartStr)
    .lte("expense_date", lastMonthEndStr);

  const thisMonthTotal = (thisMonthExpenses ?? []).reduce(
    (sum, row) => sum + Number(row.amount_dop ?? 0),
    0
  );
  const lastMonthTotal = (lastMonthExpenses ?? []).reduce(
    (sum, row) => sum + Number(row.amount_dop ?? 0),
    0
  );

  const categoryTotals = (thisMonthExpenses as ExpenseRow[] | undefined)?.reduce(
    (acc, row) => {
      const key = row.categories?.name ?? "—";
      acc[key] = (acc[key] ?? 0) + Number(row.amount_dop ?? 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const topCategory = categoryTotals
    ? Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          {t(locale, "dashboard.label")}
        </p>
        <h1 className="text-3xl font-semibold">{t(locale, "dashboard.title")}</h1>
        <p className="text-sm text-slate-400">{t(locale, "dashboard.subtitle")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs uppercase text-slate-400">{t(locale, "dashboard.thisMonth")}</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(thisMonthTotal, "DOP", locale)}
          </p>
          <p className="text-xs text-slate-500">
            {t(locale, "dashboard.from")} {thisMonthStartStr}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs uppercase text-slate-400">{t(locale, "dashboard.lastMonth")}</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(lastMonthTotal, "DOP", locale)}
          </p>
          <p className="text-xs text-slate-500">
            {t(locale, "dashboard.upTo")} {lastMonthEndStr}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs uppercase text-slate-400">{t(locale, "dashboard.topCategory")}</p>
          <p className="mt-2 text-2xl font-semibold">{topCategory?.[0] ?? "—"}</p>
          <p className="text-xs text-slate-500">
            {topCategory
              ? formatCurrency(topCategory[1], "DOP", locale)
              : t(locale, "dashboard.awaiting")}
          </p>
        </div>
      </div>
    </div>
  );
}
