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
  const currency = searchParams.get("currency");
  const locale = normalizeLocale(searchParams.get("locale"));

  let query = supabase
    .from("incomes")
    .select("income_date, amount, currency, amount_dop, source, notes")
    .order("income_date", { ascending: false });

  if (from) {
    query = query.gte("income_date", from);
  }
  if (to) {
    query = query.lte("income_date", to);
  }
  if (currency) {
    query = query.eq("currency", currency.toUpperCase());
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const header = [
    t(locale, "income.source"),
    t(locale, "common.date"),
    t(locale, "common.amount"),
    t(locale, "expenses.dopTotal"),
    t(locale, "common.notes"),
  ];

  const rows = (data ?? []).map((row) => {
    return [
      toCsvValue(row.source ?? ""),
      toCsvValue(row.income_date),
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
      "Content-Disposition": "attachment; filename=incomes.csv",
    },
  });
}
