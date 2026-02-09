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
      { message: t(locale, "incomeImports.empty") },
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

  const { data: currencies } = await supabase
    .from("currencies")
    .select("code, is_active");

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
    income_date: string;
    source: string | null;
    notes: string | null;
  }[] = [];

  rows.slice(0, 500).forEach((row, index) => {
    const normalized = Object.fromEntries(
      Object.entries(row ?? {}).map(([key, value]) => [
        key.trim().toLowerCase(),
        String(value ?? "").trim(),
      ])
    );

    const dateRaw = normalized.date || normalized.income_date || "";
    const amountRaw = normalized.amount || "";
    const currencyRaw = (normalized.currency || "DOP").toUpperCase();
    const sourceRaw = normalized.source || "";
    const notesRaw = normalized.notes || "";
    const fxRateRaw =
      normalized.fx_rate_to_dop || normalized.fx_rate || normalized.fxrate || "";

    const incomeDate = normalizeDate(dateRaw);
    if (!incomeDate) {
      errors.push({ row: index + 2, message: t(locale, "incomeImports.dateInvalid") });
      return;
    }

    const amountClean = amountRaw.replace(/[^0-9.]/g, "");
    const amount = Number(amountClean);
    if (!amountClean || Number.isNaN(amount)) {
      errors.push({ row: index + 2, message: t(locale, "incomeImports.amountInvalid") });
      return;
    }

    if (countIntegerDigits(amountClean) > MAX_INTEGER_DIGITS) {
      errors.push({ row: index + 2, message: t(locale, "income.amountTooLarge") });
      return;
    }

    if (!currencyRaw || !currencySet.has(currencyRaw)) {
      errors.push({ row: index + 2, message: t(locale, "incomeImports.currencyInvalid") });
      return;
    }

    let fxRate = 1;
    if (currencyRaw !== "DOP") {
      if (!fxRateRaw || Number.isNaN(Number(fxRateRaw))) {
        errors.push({ row: index + 2, message: t(locale, "income.fxRateRequired") });
        return;
      }
      fxRate = Number(fxRateRaw);
    }

    const amountDop = Number((amount * fxRate).toFixed(2));
    if (countIntegerDigits(amountDop) > MAX_INTEGER_DIGITS) {
      errors.push({ row: index + 2, message: t(locale, "income.convertedTooLarge") });
      return;
    }

    inserts.push({
      user_id: user.id,
      amount,
      currency: currencyRaw,
      fx_rate_to_dop: currencyRaw === "DOP" ? null : fxRate,
      amount_dop: amountDop,
      income_date: incomeDate,
      source: sourceRaw || null,
      notes: notesRaw || null,
    });
  });

  if (inserts.length > 0) {
    const { error } = await supabase.from("incomes").insert(inserts);
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
