import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLocale, t } from "@/lib/i18n";

function toCsvValue(value: string | number | null) {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes("\"")) {
    return `"${stringValue.replace(/\"/g, '""')}"`;
  }
  return stringValue;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const category = searchParams.get("category");
  const merchant = searchParams.get("merchant");
  const currency = searchParams.get("currency");
  const locale = normalizeLocale(searchParams.get("locale"));

  let query = supabase
    .from("expenses")
    .select("expense_date, amount, currency, amount_dop, notes, categories(name), merchants(name)")
    .order("expense_date", { ascending: false });

  if (from) {
    query = query.gte("expense_date", from);
  }
  if (to) {
    query = query.lte("expense_date", to);
  }
  if (category) {
    query = query.eq("category_id", category);
  }
  if (merchant) {
    query = query.eq("merchant_id", merchant);
  }
  if (currency) {
    query = query.eq("currency", currency.toUpperCase());
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const header = [
    t(locale, "common.merchant"),
    t(locale, "common.category"),
    t(locale, "common.date"),
    t(locale, "common.amount"),
    t(locale, "expenses.dopTotal"),
    t(locale, "common.notes"),
  ];

  const rows = (data ?? []).map((row) => {
    const merchantsValue = row.merchants as { name?: string } | { name?: string }[] | null;
    const categoriesValue = row.categories as { name?: string } | { name?: string }[] | null;
    const merchantName = Array.isArray(merchantsValue)
      ? merchantsValue[0]?.name ?? ""
      : merchantsValue?.name ?? "";
    const categoryName = Array.isArray(categoriesValue)
      ? categoriesValue[0]?.name ?? ""
      : categoriesValue?.name ?? "";

    return [
      toCsvValue(merchantName),
      toCsvValue(categoryName),
      toCsvValue(row.expense_date),
      toCsvValue(`${row.amount} ${row.currency}`),
      toCsvValue(row.amount_dop),
      toCsvValue(row.notes ?? ""),
    ];
  });

  const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=expenses.csv",
    },
  });
}
