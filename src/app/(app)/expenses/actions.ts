"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLocale, t } from "@/lib/i18n";

export type ExpenseActionState = {
  message: string | null;
};

const MAX_INTEGER_DIGITS = 12;

function countIntegerDigits(value: string | number) {
  const [intPart = ""] = String(value).split(".");
  const trimmed = intPart.replace(/^0+(?=\d)/, "");
  return trimmed.length || 1;
}

export async function createExpense(
  _prevState: ExpenseActionState,
  formData: FormData
): Promise<ExpenseActionState> {
  const locale = normalizeLocale(String(formData.get("locale") ?? ""));
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: t(locale, "errors.signInRequired") };
  }

  const amountRaw = String(formData.get("amount") ?? "").trim();
  const currencyRaw = String(formData.get("currency") ?? "")
    .trim()
    .toUpperCase();
  const expenseDate = String(formData.get("expense_date") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const merchantId = String(formData.get("merchant_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const fxRateRaw = String(formData.get("fx_rate_to_dop") ?? "").trim();

  if (!amountRaw || Number.isNaN(Number(amountRaw))) {
    return { message: t(locale, "expenses.amountRequired") };
  }

  if (countIntegerDigits(amountRaw) > MAX_INTEGER_DIGITS) {
    return { message: t(locale, "expenses.amountTooLarge") };
  }

  if (!currencyRaw) {
    return { message: t(locale, "expenses.currencyRequired") };
  }

  if (!categoryId) {
    return { message: t(locale, "expenses.categoryRequired") };
  }

  if (!expenseDate) {
    return { message: t(locale, "expenses.dateRequired") };
  }

  const amount = Number(amountRaw);
  const currency = currencyRaw;

  let fxRate = 1;
  if (currency !== "DOP") {
    if (!fxRateRaw || Number.isNaN(Number(fxRateRaw))) {
      return { message: t(locale, "expenses.fxRateRequired") };
    }
    fxRate = Number(fxRateRaw);
  }

  const amountDop = Number((amount * fxRate).toFixed(2));

  if (countIntegerDigits(amountDop) > MAX_INTEGER_DIGITS) {
    return { message: t(locale, "expenses.convertedTooLarge") };
  }

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    amount,
    currency,
    fx_rate_to_dop: currency === "DOP" ? null : fxRate,
    amount_dop: amountDop,
    expense_date: expenseDate,
    notes: notes || null,
    category_id: categoryId,
    merchant_id: merchantId || null,
  });

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");

  return { message: t(locale, "expenses.expenseAdded") };
}

export async function updateExpense(
  _prevState: ExpenseActionState,
  formData: FormData
): Promise<ExpenseActionState> {
  const locale = normalizeLocale(String(formData.get("locale") ?? ""));
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: t(locale, "errors.signInRequired") };
  }

  const id = String(formData.get("id") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const currencyRaw = String(formData.get("currency") ?? "")
    .trim()
    .toUpperCase();
  const expenseDate = String(formData.get("expense_date") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const merchantId = String(formData.get("merchant_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const fxRateRaw = String(formData.get("fx_rate_to_dop") ?? "").trim();

  if (!id) {
    return { message: t(locale, "expenses.updateFailed") };
  }

  if (!amountRaw || Number.isNaN(Number(amountRaw))) {
    return { message: t(locale, "expenses.amountRequired") };
  }

  if (countIntegerDigits(amountRaw) > MAX_INTEGER_DIGITS) {
    return { message: t(locale, "expenses.amountTooLarge") };
  }

  if (!currencyRaw) {
    return { message: t(locale, "expenses.currencyRequired") };
  }

  if (!categoryId) {
    return { message: t(locale, "expenses.categoryRequired") };
  }

  if (!expenseDate) {
    return { message: t(locale, "expenses.dateRequired") };
  }

  const amount = Number(amountRaw);
  const currency = currencyRaw;

  let fxRate = 1;
  if (currency !== "DOP") {
    if (!fxRateRaw || Number.isNaN(Number(fxRateRaw))) {
      return { message: t(locale, "expenses.fxRateRequired") };
    }
    fxRate = Number(fxRateRaw);
  }

  const amountDop = Number((amount * fxRate).toFixed(2));

  if (countIntegerDigits(amountDop) > MAX_INTEGER_DIGITS) {
    return { message: t(locale, "expenses.convertedTooLarge") };
  }

  const { error } = await supabase
    .from("expenses")
    .update({
      amount,
      currency,
      fx_rate_to_dop: currency === "DOP" ? null : fxRate,
      amount_dop: amountDop,
      expense_date: expenseDate,
      notes: notes || null,
      category_id: categoryId,
      merchant_id: merchantId || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");

  return { message: t(locale, "expenses.updated") };
}

export async function deleteExpense(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return;
  }

  await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}
