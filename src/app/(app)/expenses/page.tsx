import Link from "next/link";
import { redirect } from "next/navigation";

import ExpenseForm from "./expense-form";
import CsvImport from "./csv-import";
import ExpenseRow from "./expense-row";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

type Option = {
  id: string;
  name: string;
};

type CurrencyOption = {
  code: string;
  name: string;
  symbol: string | null;
  is_active: boolean;
};

type ExpenseRowData = {
  id: string;
  amount: string;
  currency: string;
  amount_dop: string;
  expense_date: string;
  notes: string | null;
  fx_rate_to_dop: string | null;
  category_id: string | null;
  merchant_id: string | null;
  merchants?: { name?: string } | null;
  categories?: { name?: string } | null;
};

type SearchParams = {
  from?: string;
  to?: string;
  category?: string;
  merchant?: string;
  currency?: string;
  page?: string;
};

const PAGE_SIZE = 25;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  const { data: merchants } = await supabase
    .from("merchants")
    .select("id, name")
    .order("name", { ascending: true });

  const { data: currencies, error: currencyError } = await supabase
    .from("currencies")
    .select("code, name, symbol, is_active")
    .order("code", { ascending: true });

  const activeCurrencies = currencyError
    ? []
    : (currencies ?? []).filter((currency) => currency.is_active);

  let expensesQuery = supabase
    .from("expenses")
    .select(
      "id, amount, currency, amount_dop, expense_date, notes, fx_rate_to_dop, category_id, merchant_id, merchants(name), categories(name)"
    )
    .order("expense_date", { ascending: false })
    .limit(50);

  if (filters.from) {
    expensesQuery = expensesQuery.gte("expense_date", filters.from);
  }
  if (filters.to) {
    expensesQuery = expensesQuery.lte("expense_date", filters.to);
  }
  if (filters.category) {
    expensesQuery = expensesQuery.eq("category_id", filters.category);
  }
  if (filters.merchant) {
    expensesQuery = expensesQuery.eq("merchant_id", filters.merchant);
  }
  if (filters.currency) {
    expensesQuery = expensesQuery.eq("currency", filters.currency.toUpperCase());
  }

  const page = Math.max(1, Number(filters.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { data: expensesRaw } = await expensesQuery.range(offset, offset + PAGE_SIZE);
  const hasNext = (expensesRaw ?? []).length > PAGE_SIZE;
  const pageRows = (expensesRaw ?? []).slice(0, PAGE_SIZE);

  const expenses: ExpenseRowData[] = pageRows.map((row) => {
    const merchantsValue = row.merchants as { name?: string } | { name?: string }[] | null;
    const categoriesValue = row.categories as { name?: string } | { name?: string }[] | null;

    return {
      id: row.id,
      amount: row.amount,
      currency: row.currency,
      amount_dop: row.amount_dop,
      expense_date: row.expense_date,
      notes: row.notes ?? null,
      fx_rate_to_dop: row.fx_rate_to_dop ?? null,
      category_id: row.category_id ?? null,
      merchant_id: row.merchant_id ?? null,
      merchants: Array.isArray(merchantsValue) ? merchantsValue[0] ?? null : merchantsValue ?? null,
      categories: Array.isArray(categoriesValue) ? categoriesValue[0] ?? null : categoriesValue ?? null,
    };
  });

  const exportParams = new URLSearchParams();
  if (filters.from) exportParams.set("from", filters.from);
  if (filters.to) exportParams.set("to", filters.to);
  if (filters.category) exportParams.set("category", filters.category);
  if (filters.merchant) exportParams.set("merchant", filters.merchant);
  if (filters.currency) exportParams.set("currency", filters.currency);
  exportParams.set("locale", locale);

  const exportHref = exportParams.toString()
    ? `/api/expenses/export?${exportParams.toString()}`
    : "/api/expenses/export";

  const pageParams = new URLSearchParams();
  if (filters.from) pageParams.set("from", filters.from);
  if (filters.to) pageParams.set("to", filters.to);
  if (filters.category) pageParams.set("category", filters.category);
  if (filters.merchant) pageParams.set("merchant", filters.merchant);
  if (filters.currency) pageParams.set("currency", filters.currency);

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams(pageParams);
    if (targetPage > 1) {
      params.set("page", String(targetPage));
    } else {
      params.delete("page");
    }
    const qs = params.toString();
    return qs ? `/expenses?${qs}` : "/expenses";
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          {t(locale, "nav.expenses")}
        </p>
        <h1 className="text-3xl font-semibold">{t(locale, "expenses.title")}</h1>
        <p className="text-sm text-slate-400">{t(locale, "expenses.subtitle")}</p>
      </div>

      <ExpenseForm
        categories={(categories ?? []) as Option[]}
        merchants={(merchants ?? []) as Option[]}
        currencies={(activeCurrencies ?? []) as CurrencyOption[]}
        locale={locale}
      />

      <CsvImport
        categories={(categories ?? []) as Option[]}
        merchants={(merchants ?? []) as Option[]}
        currencies={(activeCurrencies ?? []) as CurrencyOption[]}
        locale={locale}
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t(locale, "common.recentExpenses")}</h2>
            <p className="text-xs text-slate-500">{t(locale, "common.filteredResults")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={exportHref}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              {t(locale, "common.exportCsv")}
            </Link>
          </div>
        </div>

        <form className="grid gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur md:grid-cols-5">
          <label className="text-xs text-slate-300">
            {t(locale, "common.from")}
            <input
              name="from"
              type="date"
              defaultValue={filters.from ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
            />
          </label>
          <label className="text-xs text-slate-300">
            {t(locale, "common.to")}
            <input
              name="to"
              type="date"
              defaultValue={filters.to ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
            />
          </label>
          <label className="text-xs text-slate-300">
            {t(locale, "common.category")}
            <select
              name="category"
              defaultValue={filters.category ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
            >
              <option value=""></option>
              {(categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-300">
            {t(locale, "common.merchant")}
            <select
              name="merchant"
              defaultValue={filters.merchant ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
            >
              <option value=""></option>
              {(merchants ?? []).map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-300">
            {t(locale, "common.currency")}
            <select
              name="currency"
              defaultValue={filters.currency ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
            >
              <option value=""></option>
              {activeCurrencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code}
                </option>
              ))}
            </select>
          </label>
          <div className="col-span-full flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              {t(locale, "common.applyFilters")}
            </button>
            <Link
              href="/expenses"
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              {t(locale, "common.clear")}
            </Link>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <div className="grid grid-cols-12 gap-2 border-b border-slate-800 bg-slate-950/70 px-4 py-3 text-xs uppercase text-slate-400">
            <span className="col-span-3">{t(locale, "common.merchant")}</span>
            <span className="col-span-2">{t(locale, "common.category")}</span>
            <span className="col-span-2">{t(locale, "common.date")}</span>
            <span className="col-span-2">{t(locale, "common.amount")}</span>
            <span className="col-span-2">{t(locale, "expenses.dopTotal")}</span>
            <span className="col-span-1">{t(locale, "common.notes")}</span>
          </div>
        <div className="divide-y divide-slate-900/60">
            {expenses.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-400">
                {t(locale, "common.noExpenses")}
              </div>
            ) : (
              expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  categories={(categories ?? []) as Option[]}
                  merchants={(merchants ?? []) as Option[]}
                  currencies={(activeCurrencies ?? []) as CurrencyOption[]}
                  locale={locale}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-xs text-slate-400 backdrop-blur">
          <span>
            {t(locale, "common.page")} {page}
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={buildPageHref(page - 1)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                page <= 1
                  ? "border-slate-800 text-slate-600"
                  : "border-slate-700 text-slate-200 hover:border-slate-500"
              }`}
            >
              {t(locale, "common.previous")}
            </Link>
            <Link
              href={hasNext ? buildPageHref(page + 1) : buildPageHref(page)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                hasNext
                  ? "border-slate-700 text-slate-200 hover:border-slate-500"
                  : "border-slate-800 text-slate-600"
              }`}
            >
              {t(locale, "common.next")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
