import Link from "next/link";
import { redirect } from "next/navigation";

import IncomeForm from "./income-form";
import IncomeCsvImport from "./csv-import";
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

type SearchParams = {
  from?: string;
  to?: string;
  currency?: string;
  page?: string;
  pageSize?: string;
};

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

export default async function IncomesPage({
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

  const { data: currencies, error: currencyError } = await supabase
    .from("currencies")
    .select("code, name, symbol, is_active")
    .order("code", { ascending: true });

  const activeCurrencies = currencyError
    ? []
    : (currencies ?? []).filter((currency) => currency.is_active);

  let incomesQuery = supabase
    .from("incomes")
    .select("id, amount, currency, amount_dop, income_date, source, notes")
    .order("income_date", { ascending: false });

  if (filters.from) {
    incomesQuery = incomesQuery.gte("income_date", filters.from);
  }
  if (filters.to) {
    incomesQuery = incomesQuery.lte("income_date", filters.to);
  }
  if (filters.currency) {
    incomesQuery = incomesQuery.eq("currency", filters.currency.toUpperCase());
  }

  const page = Math.max(1, Number(filters.page ?? "1") || 1);
  const requestedPageSize = Number(filters.pageSize ?? "");
  const pageSize = ALLOWED_PAGE_SIZES.includes(requestedPageSize)
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  const { data: incomesRaw } = await incomesQuery.range(offset, offset + pageSize);
  const hasNext = (incomesRaw ?? []).length > pageSize;
  const pageRows = (incomesRaw ?? []).slice(0, pageSize);
  const showingStart = pageRows.length > 0 ? offset + 1 : 0;
  const showingEnd = offset + pageRows.length;

  const exportParams = new URLSearchParams();
  if (filters.from) exportParams.set("from", filters.from);
  if (filters.to) exportParams.set("to", filters.to);
  if (filters.currency) exportParams.set("currency", filters.currency);
  exportParams.set("locale", locale);

  const exportHref = exportParams.toString()
    ? `/api/incomes/export?${exportParams.toString()}`
    : "/api/incomes/export";

  const pageParams = new URLSearchParams();
  if (filters.from) pageParams.set("from", filters.from);
  if (filters.to) pageParams.set("to", filters.to);
  if (filters.currency) pageParams.set("currency", filters.currency);
  if (pageSize !== DEFAULT_PAGE_SIZE) pageParams.set("pageSize", String(pageSize));

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams(pageParams);
    if (targetPage > 1) {
      params.set("page", String(targetPage));
    } else {
      params.delete("page");
    }
    const qs = params.toString();
    return qs ? `/incomes?${qs}` : "/incomes";
  };

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
      <IncomeCsvImport currencies={activeCurrencies} locale={locale} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t(locale, "income.recent")}</h2>
            <p className="text-xs text-slate-500">{t(locale, "income.recentNote")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/templates/incomes_template.csv"
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              {t(locale, "common.downloadTemplate")}
            </Link>
            <a
              href={exportHref}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              {t(locale, "common.exportCsv")}
            </a>
          </div>
        </div>

        <form className="grid gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur md:grid-cols-4">
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
          <label className="text-xs text-slate-300">
            {t(locale, "common.pageSize")}
            <select
              name="pageSize"
              defaultValue={String(pageSize)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
            >
              {ALLOWED_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
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
              href="/incomes"
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              {t(locale, "common.clear")}
            </Link>
          </div>
        </form>
        <div className="overflow-hidden rounded-2xl border border-slate-800/80">
          <div className="grid grid-cols-12 gap-2 border-b border-slate-800 bg-slate-950/70 px-4 py-3 text-xs uppercase text-slate-400">
            <span className="col-span-4">{t(locale, "income.source")}</span>
            <span className="col-span-3">{t(locale, "common.date")}</span>
            <span className="col-span-3">{t(locale, "common.amount")}</span>
            <span className="col-span-2">{t(locale, "common.notes")}</span>
          </div>
          <div className="divide-y divide-slate-900/60">
            {pageRows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">{t(locale, "income.none")}</p>
            ) : (
              (pageRows as IncomeRow[]).map((income) => (
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-xs text-slate-400 backdrop-blur">
          <div className="space-y-1">
            <span>
              {t(locale, "common.page")} {page}
            </span>
            <span className="block text-xs text-slate-500">
              {t(locale, "common.showingRange")
                .replace("{start}", String(showingStart))
                .replace("{end}", String(showingEnd))}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
            <form method="get" className="flex items-center gap-2 text-xs">
              <input type="hidden" name="from" value={filters.from ?? ""} />
              <input type="hidden" name="to" value={filters.to ?? ""} />
              <input type="hidden" name="currency" value={filters.currency ?? ""} />
              <input type="hidden" name="pageSize" value={String(pageSize)} />
              <label className="flex items-center gap-2">
                <span className="text-slate-400">{t(locale, "common.jumpToPage")}</span>
                <input
                  name="page"
                  type="number"
                  min={1}
                  defaultValue={page}
                  className="w-20 rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-1 text-xs text-slate-100 outline-none focus:border-emerald-400"
                />
              </label>
              <button
                type="submit"
                className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
              >
                {t(locale, "common.go")}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
