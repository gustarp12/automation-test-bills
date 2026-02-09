import { cache } from "react";
import { redirect } from "next/navigation";

import CategoryDonut from "./category-donut";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

type ExpenseRow = {
  amount_dop: string | number | null;
  categoryName: string | null;
  merchantName: string | null;
};

const fetchExpensesInRange = cache(
  async (
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
    start: string,
    end: string
  ) => {
    const { data } = await supabase
      .from("expenses")
      .select("amount_dop, categories(name), merchants(name), expense_date")
      .gte("expense_date", start)
      .lte("expense_date", end);
    return data ?? [];
  }
);

const fetchExpensesAmountOnly = cache(
  async (
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
    start: string,
    end: string
  ) => {
    const { data } = await supabase
      .from("expenses")
      .select("amount_dop")
      .gte("expense_date", start)
      .lte("expense_date", end);
    return data ?? [];
  }
);

const fetchBudgetsForMonth = cache(
  async (supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, month: string) => {
    const { data } = await supabase
      .from("budgets")
      .select("amount, categories(name)")
      .eq("month", month);
    return data ?? [];
  }
);

const fetchIncomesInRange = cache(
  async (
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
    start: string,
    end: string
  ) => {
    const { data } = await supabase
      .from("incomes")
      .select("amount_dop, income_date")
      .gte("income_date", start)
      .lte("income_date", end);
    return data ?? [];
  }
);

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

  const thisMonthRaw = await fetchExpensesInRange(supabase, thisMonthStartStr, todayStr);
  const lastMonthExpenses = await fetchExpensesAmountOnly(
    supabase,
    lastMonthStartStr,
    lastMonthEndStr
  );
  const thisMonthIncomes = await fetchIncomesInRange(
    supabase,
    thisMonthStartStr,
    todayStr
  );

  const thisMonthExpenses: ExpenseRow[] = (thisMonthRaw ?? []).map((row) => {
    const categoriesValue = row.categories as { name?: string } | { name?: string }[] | null;
    const merchantsValue = row.merchants as { name?: string } | { name?: string }[] | null;
    const categoryName = Array.isArray(categoriesValue)
      ? categoriesValue[0]?.name ?? null
      : categoriesValue?.name ?? null;
    const merchantName = Array.isArray(merchantsValue)
      ? merchantsValue[0]?.name ?? null
      : merchantsValue?.name ?? null;

    return {
      amount_dop: row.amount_dop ?? 0,
      categoryName,
      merchantName,
    };
  });

  const thisMonthTotal = thisMonthExpenses.reduce(
    (sum, row) => sum + Number(row.amount_dop ?? 0),
    0
  );
  const thisMonthIncomeTotal = (thisMonthIncomes ?? []).reduce(
    (sum, row) => sum + Number(row.amount_dop ?? 0),
    0
  );
  const thisMonthNet = thisMonthIncomeTotal - thisMonthTotal;
  const lastMonthTotal = (lastMonthExpenses ?? []).reduce(
    (sum, row) => sum + Number(row.amount_dop ?? 0),
    0
  );

  const categoryTotals = thisMonthExpenses.reduce((acc, row) => {
    const key = row.categoryName ?? "—";
    acc[key] = (acc[key] ?? 0) + Number(row.amount_dop ?? 0);
    return acc;
  }, {} as Record<string, number>);

  const topCategory = categoryTotals
    ? Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
    : null;

  const merchantTotals = thisMonthExpenses.reduce((acc, row) => {
    const key = row.merchantName ?? "—";
    acc[key] = (acc[key] ?? 0) + Number(row.amount_dop ?? 0);
    return acc;
  }, {} as Record<string, number>);

  const topMerchants = Object.entries(merchantTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topCategoryTotal = topCategories.reduce((sum, [, value]) => sum + value, 0);
  const otherTotal = Math.max(0, thisMonthTotal - topCategoryTotal);
  const categoryColors = ["#34d399", "#38bdf8", "#f59e0b", "#a78bfa", "#f472b6", "#22c55e"];
  const categorySegments = [
    ...topCategories.map(([name, total], index) => ({
      name,
      total,
      color: categoryColors[index % categoryColors.length],
    })),
    ...(otherTotal > 0
      ? [
          {
            name: t(locale, "dashboard.other"),
            total: otherTotal,
            color: categoryColors[5],
          },
        ]
      : []),
  ].filter((segment) => segment.total > 0);


  const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const trendStartStr = trendStart.toISOString().slice(0, 10);

  const trendExpenses = await fetchExpensesInRange(supabase, trendStartStr, todayStr);

  const trendMap = new Map<string, number>();
  (trendExpenses ?? []).forEach((row) => {
    const key = String(row.expense_date ?? "").slice(0, 7);
    if (!key) return;
    trendMap.set(key, (trendMap.get(key) ?? 0) + Number(row.amount_dop ?? 0));
  });

  const trendMonths = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: monthDate.toLocaleString(locale === "es" ? "es-DO" : "en-US", {
        month: "short",
      }),
      total: trendMap.get(key) ?? 0,
    };
  });

  const maxTrendTotal = Math.max(1, ...trendMonths.map((item) => item.total));

  const budgetsRaw = await fetchBudgetsForMonth(supabase, thisMonthStartStr);

  const budgets = (budgetsRaw ?? []).map((row) => {
    const categoriesValue = row.categories as { name?: string } | { name?: string }[] | null;
    return {
      amount: Number(row.amount ?? 0),
      categoryName: Array.isArray(categoriesValue)
        ? categoriesValue[0]?.name ?? null
        : categoriesValue?.name ?? null,
    };
  });

  const budgetTotal = budgets.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const budgetPercent = budgetTotal
    ? Math.min(100, Math.round((thisMonthTotal / budgetTotal) * 100))
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
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur">
          <p className="text-xs uppercase text-slate-400">{t(locale, "dashboard.thisMonth")}</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(thisMonthTotal, "DOP", locale)}
          </p>
          <p className="text-xs text-slate-500">
            {t(locale, "dashboard.from")} {thisMonthStartStr}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur">
          <p className="text-xs uppercase text-slate-400">
            {t(locale, "dashboard.thisMonthIncome")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">
            {formatCurrency(thisMonthIncomeTotal, "DOP", locale)}
          </p>
          <p className="text-xs text-slate-500">
            {t(locale, "dashboard.from")} {thisMonthStartStr}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur">
          <p className="text-xs uppercase text-slate-400">
            {t(locale, "dashboard.netThisMonth")}
          </p>
          <p
            className={`mt-2 text-2xl font-semibold ${
              thisMonthNet >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {formatCurrency(thisMonthNet, "DOP", locale)}
          </p>
          <p className="text-xs text-slate-500">{t(locale, "dashboard.netNote")}</p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur">
          <p className="text-xs uppercase text-slate-400">{t(locale, "dashboard.lastMonth")}</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(lastMonthTotal, "DOP", locale)}
          </p>
          <p className="text-xs text-slate-500">
            {t(locale, "dashboard.upTo")} {lastMonthEndStr}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur">
          <p className="text-xs uppercase text-slate-400">{t(locale, "dashboard.topCategory")}</p>
          <p className="mt-2 text-2xl font-semibold">{topCategory?.[0] ?? "—"}</p>
          <p className="text-xs text-slate-500">
            {topCategory
              ? formatCurrency(topCategory[1], "DOP", locale)
              : t(locale, "dashboard.awaiting")}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur">
          <p className="text-xs uppercase text-slate-400">{t(locale, "dashboard.budgetUsed")}</p>
          <p className="mt-2 text-2xl font-semibold">
            {budgetPercent !== null ? `${budgetPercent}%` : "—"}
          </p>
          <p className="text-xs text-slate-500">
            {budgetTotal
              ? `${formatCurrency(thisMonthTotal, "DOP", locale)} / ${formatCurrency(
                  budgetTotal,
                  "DOP",
                  locale
                )}`
              : t(locale, "dashboard.noBudget")}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${budgetPercent ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t(locale, "dashboard.trendTitle")}</h2>
            <span className="text-xs text-slate-500">
              {t(locale, "dashboard.trendSubtitle")}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-6 items-end gap-3">
            {trendMonths.map((month) => (
              <div key={month.key} className="flex flex-col items-center gap-2">
                <div className="h-24 w-full rounded-full bg-slate-800/60">
                  <div
                    className="w-full rounded-full bg-emerald-400/80"
                    style={{
                      height: `${Math.max(8, Math.round((month.total / maxTrendTotal) * 96))}%`,
                    }}
                    title={formatCurrency(month.total, "DOP", locale)}
                  />
                </div>
                <span className="text-xs text-slate-400">{month.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur">
          <div>
            <h2 className="text-sm font-semibold">{t(locale, "dashboard.topMerchants")}</h2>
            <p className="text-xs text-slate-500">{t(locale, "dashboard.topMerchantsNote")}</p>
          </div>
          <div className="space-y-2">
            {topMerchants.length === 0 ? (
              <p className="text-xs text-slate-500">{t(locale, "dashboard.awaiting")}</p>
            ) : (
              topMerchants.map(([name, total]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{name}</span>
                  <span className="text-slate-200">
                    {formatCurrency(total, "DOP", locale)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold">{t(locale, "dashboard.categoryBreakdown")}</h2>
            <p className="text-xs text-slate-500">
              {t(locale, "dashboard.categoryBreakdownNote")}
            </p>
          </div>
          <CategoryDonut segments={categorySegments} total={thisMonthTotal} locale={locale} />

          <div>
            <h2 className="text-sm font-semibold">{t(locale, "dashboard.budgetBreakdown")}</h2>
            <p className="text-xs text-slate-500">{t(locale, "dashboard.budgetBreakdownNote")}</p>
          </div>
          <div className="space-y-2">
            {budgets.length === 0 ? (
              <p className="text-xs text-slate-500">{t(locale, "dashboard.noBudget")}</p>
            ) : (
              budgets.map((budget) => {
                const spent = categoryTotals[budget.categoryName ?? "—"] ?? 0;
                const percent = budget.amount
                  ? Math.min(100, Math.round((spent / budget.amount) * 100))
                  : 0;
                return (
                  <div key={`${budget.categoryName}-${budget.amount}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>{budget.categoryName ?? "—"}</span>
                      <span>
                        {formatCurrency(spent, "DOP", locale)} /{" "}
                        {formatCurrency(budget.amount, "DOP", locale)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-400/80"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
