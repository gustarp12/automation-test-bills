import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLocale, t } from "@/lib/i18n";

const MAX_INTEGER_DIGITS = 12;

function countIntegerDigits(value: string | number) {
  const [intPart = ""] = String(value).split(".");
  const trimmed = intPart.replace(/^0+(?=\d)/, "");
  return trimmed.length || 1;
}

function normalizeDate(value: string) {
  const trimmed = value.trim().replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split("-");
    return `${year}-${month}-${day}`;
  }
  return null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { locale?: string; rows?: Record<string, string>[] }
    | null;

  const locale = normalizeLocale(body?.locale ?? "");
  const rows = body?.rows ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { message: t(locale, "imports.empty") },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { message: t(locale, "errors.signInRequired") },
      { status: 401 }
    );
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name");
  const { data: merchants } = await supabase.from("merchants").select("id, name");
  const { data: currencies } = await supabase
    .from("currencies")
    .select("code, is_active");

  const categoryMap = new Map(
    (categories ?? []).map((cat) => [cat.name.toLowerCase(), cat.id])
  );
  const categoryIdMap = new Map((categories ?? []).map((cat) => [cat.id, cat.id]));
  const merchantMap = new Map(
    (merchants ?? []).map((m) => [m.name.toLowerCase(), m.id])
  );
  const merchantIdMap = new Map((merchants ?? []).map((m) => [m.id, m.id]));
  const currencySet = new Set(
    (currencies ?? []).filter((c) => c.is_active).map((c) => c.code.toUpperCase())
  );

  const errors: { row: number; message: string }[] = [];
  const inserts: {
    user_id: string;
    amount: number;
    currency: string;
    fx_rate_to_dop: number | null;
    amount_dop: number;
    expense_date: string;
    notes: string | null;
    category_id: string;
    merchant_id: string | null;
  }[] = [];

  rows.slice(0, 500).forEach((row, index) => {
    const normalized = Object.fromEntries(
      Object.entries(row ?? {}).map(([key, value]) => [
        key.trim().toLowerCase(),
        String(value ?? "").trim(),
      ])
    );

    const dateRaw = normalized.date || normalized.expense_date || "";
    const amountRaw = normalized.amount || "";
    const currencyRaw = (normalized.currency || "DOP").toUpperCase();
    const categoryRaw = normalized.category || normalized.category_name || "";
    const merchantRaw = normalized.merchant || normalized.merchant_name || "";
    const notesRaw = normalized.notes || "";
    const fxRateRaw =
      normalized.fx_rate_to_dop || normalized.fx_rate || normalized.fxrate || "";

    const expenseDate = normalizeDate(dateRaw);
    if (!expenseDate) {
      errors.push({ row: index + 2, message: t(locale, "imports.dateInvalid") });
      return;
    }

    const amountClean = amountRaw.replace(/[^0-9.]/g, "");
    const amount = Number(amountClean);
    if (!amountClean || Number.isNaN(amount)) {
      errors.push({ row: index + 2, message: t(locale, "imports.amountInvalid") });
      return;
    }

    if (countIntegerDigits(amountClean) > MAX_INTEGER_DIGITS) {
      errors.push({ row: index + 2, message: t(locale, "expenses.amountTooLarge") });
      return;
    }

    if (!currencyRaw || !currencySet.has(currencyRaw)) {
      errors.push({ row: index + 2, message: t(locale, "imports.currencyInvalid") });
      return;
    }

    if (!categoryRaw) {
      errors.push({ row: index + 2, message: t(locale, "expenses.categoryRequired") });
      return;
    }

    const categoryId =
      categoryIdMap.get(categoryRaw) ??
      categoryMap.get(categoryRaw.toLowerCase()) ??
      categoryMap.get(categoryRaw) ??
      null;

    if (!categoryId) {
      errors.push({ row: index + 2, message: t(locale, "imports.categoryMissing") });
      return;
    }

    const merchantId = merchantRaw
      ? merchantIdMap.get(merchantRaw) ??
        merchantMap.get(merchantRaw.toLowerCase()) ??
        merchantMap.get(merchantRaw) ??
        null
      : null;

    if (merchantRaw && !merchantId) {
      errors.push({ row: index + 2, message: t(locale, "imports.merchantMissing") });
      return;
    }

    let fxRate = 1;
    if (currencyRaw !== "DOP") {
      if (!fxRateRaw || Number.isNaN(Number(fxRateRaw))) {
        errors.push({ row: index + 2, message: t(locale, "expenses.fxRateRequired") });
        return;
      }
      fxRate = Number(fxRateRaw);
    }

    const amountDop = Number((amount * fxRate).toFixed(2));
    if (countIntegerDigits(amountDop) > MAX_INTEGER_DIGITS) {
      errors.push({ row: index + 2, message: t(locale, "expenses.convertedTooLarge") });
      return;
    }

    inserts.push({
      user_id: user.id,
      amount,
      currency: currencyRaw,
      fx_rate_to_dop: currencyRaw === "DOP" ? null : fxRate,
      amount_dop: amountDop,
      expense_date: expenseDate,
      notes: notesRaw || null,
      category_id: categoryId,
      merchant_id: merchantId,
    });
  });

  if (inserts.length > 0) {
    const { error } = await supabase.from("expenses").insert(inserts);
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    inserted: inserts.length,
    skipped: rows.length - inserts.length,
    errors: errors.slice(0, 20),
  });
}
