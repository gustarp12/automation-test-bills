import { redirect } from "next/navigation";

import CsvImport from "./csv-import";
import ExpenseForm from "./expense-form";
import ExpensesTable from "./expenses-table";
import StatementImport from "./statement-import";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

type SearchParams = {
  from?: string;
  to?: string;
  category?: string;
  purpose?: string;
  merchant?: string;
  currency?: string;
  page?: string;
  pageSize?: string;
};

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

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

  const { data: purposes } = await supabase
    .from("purposes")
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

  const requestedPageSize = Number(filters.pageSize ?? "");
  const pageSize = ALLOWED_PAGE_SIZES.includes(requestedPageSize)
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, Number(filters.page ?? "1") || 1);

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
        purposes={(purposes ?? []) as Option[]}
        merchants={(merchants ?? []) as Option[]}
        currencies={(activeCurrencies ?? []) as CurrencyOption[]}
        locale={locale}
      />

      <CsvImport
        categories={(categories ?? []) as Option[]}
        purposes={(purposes ?? []) as Option[]}
        merchants={(merchants ?? []) as Option[]}
        currencies={(activeCurrencies ?? []) as CurrencyOption[]}
        locale={locale}
      />

      <StatementImport locale={locale} />

      <ExpensesTable
        locale={locale}
        categories={(categories ?? []) as Option[]}
        purposes={(purposes ?? []) as Option[]}
        merchants={(merchants ?? []) as Option[]}
        currencies={(activeCurrencies ?? []) as CurrencyOption[]}
        initialFilters={{
          from: filters.from ?? "",
          to: filters.to ?? "",
          category: filters.category ?? "",
          purpose: filters.purpose ?? "",
          merchant: filters.merchant ?? "",
          currency: filters.currency ?? "",
          page,
          pageSize,
        }}
      />
    </div>
  );
}
