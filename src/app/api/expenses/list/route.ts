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
  const category = searchParams.get("category")?.trim() ?? "";
  const purpose = searchParams.get("purpose")?.trim() ?? "";
  const merchant = searchParams.get("merchant")?.trim() ?? "";
  const currency = searchParams.get("currency")?.trim().toUpperCase() ?? "";
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("expenses")
    .select(
      "id, amount, currency, amount_dop, expense_date, notes, fx_rate_to_dop, category_id, purpose_id, merchant_id, merchants(name), categories(name), purposes(name)"
    )
    .order("expense_date", { ascending: false })
    .range(offset, offset + pageSize);

  if (from) {
    query = query.gte("expense_date", from);
  }
  if (to) {
    query = query.lte("expense_date", to);
  }
  if (category) {
    query = query.eq("category_id", category);
  }
  if (purpose) {
    query = query.eq("purpose_id", purpose);
  }
  if (merchant) {
    query = query.eq("merchant_id", merchant);
  }
  if (currency) {
    query = query.eq("currency", currency);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []).slice(0, pageSize).map((row) => {
    const merchantsValue = row.merchants as { name?: string } | { name?: string }[] | null;
    const categoriesValue = row.categories as { name?: string } | { name?: string }[] | null;
    const purposesValue = row.purposes as { name?: string } | { name?: string }[] | null;

    return {
      id: row.id,
      amount: row.amount,
      currency: row.currency,
      amount_dop: row.amount_dop,
      expense_date: row.expense_date,
      notes: row.notes ?? null,
      fx_rate_to_dop: row.fx_rate_to_dop ?? null,
      category_id: row.category_id ?? null,
      purpose_id: row.purpose_id ?? null,
      merchant_id: row.merchant_id ?? null,
      merchants: Array.isArray(merchantsValue) ? merchantsValue[0] ?? null : merchantsValue ?? null,
      categories: Array.isArray(categoriesValue)
        ? categoriesValue[0] ?? null
        : categoriesValue ?? null,
      purposes: Array.isArray(purposesValue) ? purposesValue[0] ?? null : purposesValue ?? null,
    };
  });

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
