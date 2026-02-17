import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

function parsePage(value: string | null) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
}

function parsePageSize(value: string | null) {
  const parsed = Number(value ?? "");
  return ALLOWED_PAGE_SIZES.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")?.trim() ?? "";
  const to = searchParams.get("to")?.trim() ?? "";
  const currency = searchParams.get("currency")?.trim().toUpperCase() ?? "";
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("incomes")
    .select("id, amount, currency, amount_dop, income_date, source, notes, fx_rate_to_dop")
    .order("income_date", { ascending: false })
    .range(offset, offset + pageSize);

  if (from) {
    query = query.gte("income_date", from);
  }
  if (to) {
    query = query.lte("income_date", to);
  }
  if (currency) {
    query = query.eq("currency", currency);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []).slice(0, pageSize).map((row) => ({
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    amount_dop: row.amount_dop,
    income_date: row.income_date,
    source: row.source ?? null,
    notes: row.notes ?? null,
    fx_rate_to_dop: row.fx_rate_to_dop ?? null,
  }));

  const showingStart = rows.length > 0 ? offset + 1 : 0;
  const showingEnd = offset + rows.length;

  return NextResponse.json({
    rows,
    page,
    pageSize,
    hasNext: (data ?? []).length > pageSize,
    showingStart,
    showingEnd,
  });
}
