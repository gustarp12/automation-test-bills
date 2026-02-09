"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLocale, t } from "@/lib/i18n";

export type BudgetActionState = {
  message: string | null;
};

export async function saveBudget(
  _prevState: BudgetActionState,
  formData: FormData
): Promise<BudgetActionState> {
  const locale = normalizeLocale(String(formData.get("locale") ?? ""));
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: t(locale, "errors.signInRequired") };
  }

  const monthRaw = String(formData.get("month") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();

  if (!monthRaw) {
    return { message: t(locale, "budgets.monthRequired") };
  }

  if (!categoryId) {
    return { message: t(locale, "budgets.categoryRequired") };
  }

  if (!amountRaw || Number.isNaN(Number(amountRaw))) {
    return { message: t(locale, "budgets.amountRequired") };
  }

  const month = `${monthRaw}-01`;
  const amount = Number(Number(amountRaw).toFixed(2));

  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: user.id,
      category_id: categoryId,
      month,
      amount,
    },
    { onConflict: "user_id,category_id,month" }
  );

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/budgets");
  revalidatePath("/dashboard");

  return { message: t(locale, "budgets.saved") };
}

export async function deleteBudget(formData: FormData) {
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

  await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}
