"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import DateFilterInput from "@/components/date-filter-input";
import { t, type Locale } from "@/lib/i18n";
import ExpenseRow from "./expense-row";

type Option = {
  id: string;
  name: string;
};

type CurrencyOption = {
  code: string;
  name: string;
  symbol: string | null;
  is_active?: boolean;
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
  purpose_id: string | null;
  merchant_id: string | null;
  merchants?: { name?: string } | null;
  categories?: { name?: string } | null;
  purposes?: { name?: string } | null;
};

type ExpenseFilters = {
  from: string;
  to: string;
  category: string;
  purpose: string;
  merchant: string;
  currency: string;
  page: number;
  pageSize: number;
};

type ExpensesListResponse = {
  rows?: ExpenseRowData[];
  hasNext?: boolean;
  showingStart?: number;
  showingEnd?: number;
};

type ExpensesTableProps = {
  locale: Locale;
  categories: Option[];
  purposes: Option[];
  merchants: Option[];
  currencies: CurrencyOption[];
  initialFilters: Partial<ExpenseFilters>;
};

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

function normalizePage(value: number) {
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }
  return Math.floor(value);
}

function normalizePageSize(value: number) {
  return ALLOWED_PAGE_SIZES.includes(value) ? value : DEFAULT_PAGE_SIZE;
}

function buildListQuery(filters: ExpenseFilters) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.category) params.set("category", filters.category);
  if (filters.purpose) params.set("purpose", filters.purpose);
  if (filters.merchant) params.set("merchant", filters.merchant);
  if (filters.currency) params.set("currency", filters.currency);
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  return params;
}

function buildUrlQuery(filters: ExpenseFilters) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.category) params.set("category", filters.category);
  if (filters.purpose) params.set("purpose", filters.purpose);
  if (filters.merchant) params.set("merchant", filters.merchant);
  if (filters.currency) params.set("currency", filters.currency);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(filters.pageSize));
  }
  return params.toString();
}

function buildExportHref(filters: ExpenseFilters, locale: Locale) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.category) params.set("category", filters.category);
  if (filters.purpose) params.set("purpose", filters.purpose);
  if (filters.merchant) params.set("merchant", filters.merchant);
  if (filters.currency) params.set("currency", filters.currency);
  params.set("locale", locale);

  const query = params.toString();
  return query ? `/api/expenses/export?${query}` : "/api/expenses/export";
}

function getInitialFilters(initialFilters: Partial<ExpenseFilters>): ExpenseFilters {
  return {
    from: initialFilters.from ?? "",
    to: initialFilters.to ?? "",
    category: initialFilters.category ?? "",
    purpose: initialFilters.purpose ?? "",
    merchant: initialFilters.merchant ?? "",
    currency: initialFilters.currency ?? "",
    page: normalizePage(initialFilters.page ?? 1),
    pageSize: normalizePageSize(initialFilters.pageSize ?? DEFAULT_PAGE_SIZE),
  };
}

function getFiltersFromSearchParams(searchParams: URLSearchParams): ExpenseFilters {
  return {
    from: searchParams.get("from")?.trim() ?? "",
    to: searchParams.get("to")?.trim() ?? "",
    category: searchParams.get("category")?.trim() ?? "",
    purpose: searchParams.get("purpose")?.trim() ?? "",
    merchant: searchParams.get("merchant")?.trim() ?? "",
    currency: searchParams.get("currency")?.trim() ?? "",
    page: normalizePage(Number(searchParams.get("page") ?? "1")),
    pageSize: normalizePageSize(Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE)),
  };
}

export default function ExpensesTable({
  locale,
  categories,
  purposes,
  merchants,
  currencies,
  initialFilters,
}: ExpensesTableProps) {
  const pathname = usePathname();
  const [filters, setFilters] = useState<ExpenseFilters>(() =>
    getInitialFilters(initialFilters)
  );
  const [appliedFilters, setAppliedFilters] = useState<ExpenseFilters>(() =>
    getInitialFilters(initialFilters)
  );
  const [jumpPage, setJumpPage] = useState(() =>
    String(getInitialFilters(initialFilters).page)
  );
  const [rows, setRows] = useState<ExpenseRowData[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [showingStart, setShowingStart] = useState(0);
  const [showingEnd, setShowingEnd] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlQuery = buildUrlQuery(appliedFilters);
    const target = urlQuery ? `${pathname}?${urlQuery}` : pathname;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [appliedFilters, pathname]);

  useEffect(() => {
    const onPopState = () => {
      const nextFilters = getFiltersFromSearchParams(new URLSearchParams(window.location.search));
      setFilters(nextFilters);
      setAppliedFilters(nextFilters);
      setJumpPage(String(nextFilters.page));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const query = buildListQuery(appliedFilters).toString();
        const response = await fetch(`/api/expenses/list?${query}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? t(locale, "common.loadFailed"));
        }

        const payload = (await response.json()) as ExpensesListResponse;
        setRows(payload.rows ?? []);
        setHasNext(Boolean(payload.hasNext));
        setShowingStart(payload.showingStart ?? 0);
        setShowingEnd(payload.showingEnd ?? 0);
      } catch (caughtError) {
        if ((caughtError as Error).name === "AbortError") {
          return;
        }
        setError((caughtError as Error).message || t(locale, "common.loadFailed"));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => controller.abort();
  }, [appliedFilters, locale]);

  const exportHref = useMemo(
    () => buildExportHref(appliedFilters, locale),
    [appliedFilters, locale]
  );

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFilters = {
      ...filters,
      page: 1,
      pageSize: normalizePageSize(filters.pageSize),
      currency: filters.currency.toUpperCase(),
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setJumpPage("1");
  };

  const clearFilters = () => {
    const cleared = {
      from: "",
      to: "",
      category: "",
      purpose: "",
      merchant: "",
      currency: "",
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setJumpPage("1");
  };

  const goToPage = (target: number) => {
    const nextPage = normalizePage(target);
    setFilters((current) => ({ ...current, page: nextPage }));
    setAppliedFilters((current) => ({ ...current, page: nextPage }));
    setJumpPage(String(nextPage));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t(locale, "common.recentExpenses")}</h2>
          <p className="text-xs text-slate-500">{t(locale, "common.filteredResults")}</p>
        </div>
        <a
          href={exportHref}
          className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
        >
          {t(locale, "common.exportCsv")}
        </a>
      </div>

      <form
        onSubmit={applyFilters}
        className="grid gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur md:grid-cols-7"
      >
        <DateFilterInput
          name="from"
          label={t(locale, "common.from")}
          value={filters.from}
          onChange={(value) => setFilters((current) => ({ ...current, from: value }))}
        />
        <DateFilterInput
          name="to"
          label={t(locale, "common.to")}
          value={filters.to}
          onChange={(value) => setFilters((current) => ({ ...current, to: value }))}
        />
        <label className="text-xs text-slate-300">
          {t(locale, "common.category")}
          <select
            value={filters.category}
            onChange={(event) =>
              setFilters((current) => ({ ...current, category: event.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
          >
            <option value=""></option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300">
          {t(locale, "common.purpose")}
          <select
            value={filters.purpose}
            onChange={(event) =>
              setFilters((current) => ({ ...current, purpose: event.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
          >
            <option value=""></option>
            {purposes.map((purpose) => (
              <option key={purpose.id} value={purpose.id}>
                {purpose.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300">
          {t(locale, "common.merchant")}
          <select
            value={filters.merchant}
            onChange={(event) =>
              setFilters((current) => ({ ...current, merchant: event.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
          >
            <option value=""></option>
            {merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300">
          {t(locale, "common.currency")}
          <select
            value={filters.currency}
            onChange={(event) =>
              setFilters((current) => ({ ...current, currency: event.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
          >
            <option value=""></option>
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300">
          {t(locale, "common.pageSize")}
          <select
            value={String(filters.pageSize)}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                pageSize: normalizePageSize(Number(event.target.value)),
              }))
            }
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
            className="min-w-[120px] rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            {t(locale, "common.applyFilters")}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="min-w-[120px] rounded-full border border-slate-700 px-4 py-2 text-center text-xs font-semibold text-slate-200 transition hover:border-slate-500"
          >
            {t(locale, "common.clear")}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <div className="grid grid-cols-16 gap-2 border-b border-slate-800 bg-slate-950/70 px-4 py-3 text-xs uppercase text-slate-400">
          <span className="col-span-3">{t(locale, "common.merchant")}</span>
          <span className="col-span-2">{t(locale, "common.category")}</span>
          <span className="col-span-2">{t(locale, "common.purpose")}</span>
          <span className="col-span-2">{t(locale, "common.date")}</span>
          <span className="col-span-2">{t(locale, "common.amount")}</span>
          <span className="col-span-2">{t(locale, "expenses.dopTotal")}</span>
          <span className="col-span-1">{t(locale, "common.notes")}</span>
          <span className="col-span-2 text-right">{t(locale, "common.actions")}</span>
        </div>
        <div className="relative min-h-[320px] divide-y divide-slate-900/60">
          {error ? (
            <div className="px-4 py-6 text-sm text-rose-300">{error}</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-400">
              {isLoading ? t(locale, "common.loading") : t(locale, "common.noExpenses")}
            </div>
          ) : (
            <>
              <div className={isLoading ? "opacity-70 transition-opacity" : "transition-opacity"}>
                {rows.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    categories={categories}
                    purposes={purposes}
                    merchants={merchants}
                    currencies={currencies}
                    locale={locale}
                  />
                ))}
              </div>
              {isLoading ? (
                <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300">
                  {t(locale, "common.updating")}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-xs text-slate-400 backdrop-blur">
        <div className="space-y-1">
          <span>
            {t(locale, "common.page")} {appliedFilters.page}
          </span>
          <span className="block text-xs text-slate-500">
            {t(locale, "common.showingRange")
              .replace("{start}", String(showingStart))
              .replace("{end}", String(showingEnd))}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => goToPage(appliedFilters.page - 1)}
            disabled={appliedFilters.page <= 1}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              appliedFilters.page <= 1
                ? "cursor-not-allowed border-slate-800 text-slate-600"
                : "border-slate-700 text-slate-200 hover:border-slate-500"
            }`}
          >
            {t(locale, "common.previous")}
          </button>
          <button
            type="button"
            onClick={() => goToPage(appliedFilters.page + 1)}
            disabled={!hasNext}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              hasNext
                ? "border-slate-700 text-slate-200 hover:border-slate-500"
                : "cursor-not-allowed border-slate-800 text-slate-600"
            }`}
          >
            {t(locale, "common.next")}
          </button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const target = normalizePage(Number(jumpPage));
              goToPage(target);
            }}
            className="flex items-center gap-2 text-xs"
          >
            <label className="flex items-center gap-2">
              <span className="text-slate-400">{t(locale, "common.jumpToPage")}</span>
              <input
                value={jumpPage}
                onChange={(event) => setJumpPage(event.target.value)}
                type="number"
                min={1}
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
  );
}
