import { redirect } from "next/navigation";

import IncomeCsvImport from "./csv-import";
import IncomeForm from "./income-form";
import IncomesTable from "./incomes-table";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const requestedPageSize = Number(filters.pageSize ?? "");
  const pageSize = ALLOWED_PAGE_SIZES.includes(requestedPageSize)
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, Number(filters.page ?? "1") || 1);

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

      <IncomesTable
        locale={locale}
        currencies={activeCurrencies}
        initialFilters={{
          from: filters.from ?? "",
          to: filters.to ?? "",
          currency: filters.currency ?? "",
          page,
          pageSize,
        }}
      />
    </div>
  );
}
