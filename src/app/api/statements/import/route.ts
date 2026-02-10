import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLocale, t } from "@/lib/i18n";

const MAX_INTEGER_DIGITS = 12;

function countIntegerDigits(value: string | number) {
  const [intPart = ""] = String(value).split(".");
  const trimmed = intPart.replace(/^0+(?=\d)/, "");
  return trimmed.length || 1;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        locale?: string;
        defaultCategoryId?: string;
        merchantId?: string;
        rows?: {
          date: string;
          description: string;
          amount: number;
          type: "expense" | "income";
        }[];
      }
    | null;

  const locale = normalizeLocale(body?.locale ?? "");
  const rows = body?.rows ?? [];
  const defaultCategoryId = String(body?.defaultCategoryId ?? "").trim();
  const merchantId = String(body?.merchantId ?? "").trim();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ message: t(locale, "imports.empty") }, { status: 400 });
  }

  if (!defaultCategoryId) {
    return NextResponse.json({ message: t(locale, "statementImport.selectCategory") }, { status: 400 });
  }

  const expenses: {
    user_id: string;
    amount: number;
    currency: string;
    fx_rate_to_dop: number | null;
    amount_dop: number;
    expense_date: string;
    notes: string | null;
    category_id: string;
    purpose_id: string | null;
    merchant_id: string | null;
  }[] = [];

  const incomes: {
    user_id: string;
    amount: number;
    currency: string;
    fx_rate_to_dop: number | null;
    amount_dop: number;
    income_date: string;
    source: string;
    notes: string | null;
  }[] = [];

  rows.slice(0, 2000).forEach((row) => {
    if (!row?.date || !row.description || !row.amount) {
      return;
    }
    if (countIntegerDigits(row.amount) > MAX_INTEGER_DIGITS) {
      return;
    }
    if (row.type === "income") {
      incomes.push({
        user_id: user.id,
        amount: row.amount,
        currency: "DOP",
        fx_rate_to_dop: null,
        amount_dop: row.amount,
        income_date: row.date,
        source: row.description,
        notes: null,
      });
    } else {
      expenses.push({
        user_id: user.id,
        amount: row.amount,
        currency: "DOP",
        fx_rate_to_dop: null,
        amount_dop: row.amount,
        expense_date: row.date,
        notes: row.description,
        category_id: defaultCategoryId,
        purpose_id: null,
        merchant_id: merchantId || null,
      });
    }
  });

  if (expenses.length) {
    const { error } = await supabase.from("expenses").insert(expenses);
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
  }

  if (incomes.length) {
    const { error } = await supabase.from("incomes").insert(incomes);
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    insertedExpenses: expenses.length,
    insertedIncomes: incomes.length,
  });
}
